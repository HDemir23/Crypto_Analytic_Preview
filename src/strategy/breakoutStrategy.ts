import { IndicatorResult, ForecastPoint } from "../indicators";
import {
  Strategy,
  StrategyConfig,
  StrategyResult,
  TradeSignal,
  generateStrategyCacheKey,
  getCachedStrategyResult,
  setCachedStrategyResult,
  calculateIndicatorSignature,
  calculateAveragePrice,
  calculateTrend,
  calculateVolatility,
} from "./types";

export class BreakoutStrategy implements Strategy {
  public readonly name = "Breakout";
  public readonly description =
    "Identifies price breakouts from established ranges, support/resistance levels, and volume confirmation";

  // Memoized calculation for resistance/support levels (equivalent to useCallback)
  private calculateSupportResistance = (() => {
    const srCache = new Map<string, { result: any; timestamp: number }>();
    return (forecast: ForecastPoint[], lookbackPeriod: number = 20) => {
      const cacheKey = `sr:${forecast.length}:${lookbackPeriod}`;
      const cached = srCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const highs = forecast.map((f) => f.high);
      const lows = forecast.map((f) => f.low);
      const closes = forecast.map((f) => f.avg);

      // Calculate resistance levels (recent highs)
      const resistanceLevels = [];
      for (let i = lookbackPeriod; i < highs.length; i++) {
        const window = highs.slice(i - lookbackPeriod, i);
        const maxHigh = Math.max(...window);
        const maxIndex = window.indexOf(maxHigh);

        if (maxIndex > 3 && maxIndex < window.length - 3) {
          // Peak in middle
          resistanceLevels.push({ level: maxHigh, strength: 1 });
        }
      }

      // Calculate support levels (recent lows)
      const supportLevels = [];
      for (let i = lookbackPeriod; i < lows.length; i++) {
        const window = lows.slice(i - lookbackPeriod, i);
        const minLow = Math.min(...window);
        const minIndex = window.indexOf(minLow);

        if (minIndex > 3 && minIndex < window.length - 3) {
          // Valley in middle
          supportLevels.push({ level: minLow, strength: 1 });
        }
      }

      const currentPrice = closes[closes.length - 1];
      const nearestResistance = resistanceLevels.reduce(
        (prev, curr) =>
          Math.abs(curr.level - currentPrice) <
          Math.abs(prev.level - currentPrice)
            ? curr
            : prev,
        resistanceLevels[0] || { level: currentPrice * 1.05, strength: 0.5 }
      );

      const nearestSupport = supportLevels.reduce(
        (prev, curr) =>
          Math.abs(curr.level - currentPrice) <
          Math.abs(prev.level - currentPrice)
            ? curr
            : prev,
        supportLevels[0] || { level: currentPrice * 0.95, strength: 0.5 }
      );

      const result = {
        resistanceLevels,
        supportLevels,
        nearestResistance,
        nearestSupport,
        currentPrice,
        rangeSize: nearestResistance.level - nearestSupport.level,
        positionInRange:
          (currentPrice - nearestSupport.level) /
          (nearestResistance.level - nearestSupport.level),
      };

      srCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Memoized volume analysis (equivalent to useCallback)
  private analyzeVolumeBreakout = (() => {
    const volumeCache = new Map<string, { result: any; timestamp: number }>();
    return (vwapIndicator: IndicatorResult, lookbackPeriod: number = 14) => {
      const cacheKey = `volume:${vwapIndicator.name}:${lookbackPeriod}`;
      const cached = volumeCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const prices = vwapIndicator.forecast.map((f) => f.avg);
      const recentVolume = prices.slice(-lookbackPeriod);
      const avgVolume =
        recentVolume.reduce((sum, vol) => sum + vol, 0) / recentVolume.length;
      const currentVolume = prices[prices.length - 1];
      const volumeRatio = currentVolume / avgVolume;

      const result = {
        avgVolume,
        currentVolume,
        volumeRatio,
        isVolumeBreakout: volumeRatio > 1.5, // 50% above average
        volumeTrend: calculateTrend(vwapIndicator.forecast),
        volumeSpike: volumeRatio > 2.0, // 100% above average
      };

      volumeCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Memoized momentum analysis (equivalent to useCallback)
  private analyzeMomentum = (() => {
    const momentumCache = new Map<string, { result: any; timestamp: number }>();
    return (macdIndicator: IndicatorResult, rsiIndicator?: IndicatorResult) => {
      const cacheKey = `momentum:${macdIndicator.name}:${
        rsiIndicator?.name || "none"
      }`;
      const cached = momentumCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const macdValues = macdIndicator.forecast.map((f) => f.avg);
      const macdTrend = calculateTrend(macdIndicator.forecast);
      const macdChange =
        macdValues.length > 1
          ? (macdValues[macdValues.length - 1] -
              macdValues[macdValues.length - 2]) /
            Math.abs(macdValues[macdValues.length - 2])
          : 0;

      let rsiMomentum = 0;
      if (rsiIndicator) {
        const rsiValues = rsiIndicator.forecast.map((f) => f.avg);
        const currentRSI = rsiValues[rsiValues.length - 1];
        rsiMomentum = currentRSI > 70 ? 1 : currentRSI < 30 ? -1 : 0; // Momentum direction
      }

      const result = {
        macdTrend,
        macdChange,
        rsiMomentum,
        combinedMomentum:
          macdTrend === "bullish" ? 1 : macdTrend === "bearish" ? -1 : 0,
        momentumStrength: Math.abs(macdChange) + Math.abs(rsiMomentum) * 0.1,
        isBullishMomentum: macdTrend === "bullish" && macdChange > 0,
        isBearishMomentum: macdTrend === "bearish" && macdChange < 0,
      };

      momentumCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  async execute(
    indicators: IndicatorResult[],
    config: StrategyConfig
  ): Promise<StrategyResult> {
    const startTime = Date.now();
    const indicatorsSignature = calculateIndicatorSignature(indicators);
    const cacheKey = generateStrategyCacheKey(
      this.name,
      config,
      indicatorsSignature
    );

    // Check cache first (equivalent to useMemo)
    const cachedResult = getCachedStrategyResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Find relevant indicators for breakout analysis
    const vwapIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("vwap")
    );
    const macdIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("macd")
    );
    const rsiIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("rsi")
    );
    const bollingerIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("bollinger")
    );
    const adxIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("adx")
    );

    if (!vwapIndicator && !macdIndicator && !bollingerIndicator) {
      throw new Error(
        "Breakout strategy requires at least one of: VWAP, MACD, or Bollinger Bands indicators"
      );
    }

    const reasons: string[] = [];
    let confidenceScore = 0;
    let recommendation: "buy" | "sell" | "neutral" = "neutral";

    // Analyze support/resistance breakouts
    const baseIndicator =
      indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
      indicators[0];
    const srAnalysis = this.calculateSupportResistance(
      baseIndicator.forecast,
      config.lookbackPeriod
    );

    // Check for resistance breakout (bullish)
    if (srAnalysis.positionInRange > 0.9) {
      reasons.push(
        `Price near resistance level ($${srAnalysis.nearestResistance.level.toFixed(
          2
        )}) - potential breakout`
      );
      confidenceScore += 0.25;
      recommendation = "buy";
    }

    // Check for support breakout (bearish)
    if (srAnalysis.positionInRange < 0.1) {
      reasons.push(
        `Price near support level ($${srAnalysis.nearestSupport.level.toFixed(
          2
        )}) - potential breakdown`
      );
      confidenceScore += 0.25;
      recommendation = "sell";
    }

    // Analyze volume breakouts
    if (vwapIndicator) {
      const volumeAnalysis = this.analyzeVolumeBreakout(
        vwapIndicator,
        config.lookbackPeriod
      );

      if (volumeAnalysis.isVolumeBreakout) {
        reasons.push(
          `Volume breakout detected (${(
            volumeAnalysis.volumeRatio * 100
          ).toFixed(0)}% above average)`
        );
        confidenceScore += 0.3;

        if (volumeAnalysis.volumeTrend === "bullish") {
          if (recommendation === "neutral") recommendation = "buy";
        } else if (volumeAnalysis.volumeTrend === "bearish") {
          if (recommendation === "neutral") recommendation = "sell";
        }
      }

      if (volumeAnalysis.volumeSpike) {
        reasons.push(
          `Significant volume spike detected (${(
            volumeAnalysis.volumeRatio * 100
          ).toFixed(0)}% above average)`
        );
        confidenceScore += 0.2;
      }
    }

    // Analyze momentum for breakout confirmation
    if (macdIndicator) {
      const momentumAnalysis = this.analyzeMomentum(
        macdIndicator,
        rsiIndicator
      );

      if (momentumAnalysis.isBullishMomentum) {
        reasons.push(
          `Bullish momentum confirmed (MACD: ${
            momentumAnalysis.macdTrend
          }, change: ${(momentumAnalysis.macdChange * 100).toFixed(2)}%)`
        );
        confidenceScore += 0.2;
        if (recommendation === "neutral") recommendation = "buy";
      } else if (momentumAnalysis.isBearishMomentum) {
        reasons.push(
          `Bearish momentum confirmed (MACD: ${
            momentumAnalysis.macdTrend
          }, change: ${(momentumAnalysis.macdChange * 100).toFixed(2)}%)`
        );
        confidenceScore += 0.2;
        if (recommendation === "neutral") recommendation = "sell";
      }

      if (momentumAnalysis.momentumStrength > 0.1) {
        reasons.push(
          `Strong momentum detected (strength: ${momentumAnalysis.momentumStrength.toFixed(
            2
          )})`
        );
        confidenceScore += 0.15;
      }
    }

    // Analyze Bollinger Band breakouts
    if (bollingerIndicator) {
      const bbTrend = calculateTrend(bollingerIndicator.forecast);
      const bbVolatility = calculateVolatility(bollingerIndicator.forecast);

      if (bbVolatility > 0.03) {
        // High volatility
        reasons.push(
          `High volatility detected (${(bbVolatility * 100).toFixed(
            2
          )}%) - breakout conditions`
        );
        confidenceScore += 0.15;

        if (bbTrend === "bullish") {
          if (recommendation === "neutral") recommendation = "buy";
        } else if (bbTrend === "bearish") {
          if (recommendation === "neutral") recommendation = "sell";
        }
      }
    }

    // Analyze trend strength (ADX)
    if (adxIndicator) {
      const adxTrend = calculateTrend(adxIndicator.forecast);
      const adxAvg = calculateAveragePrice(adxIndicator.forecast);

      if (adxAvg > 25) {
        // Strong trend
        reasons.push(
          `Strong trend detected (ADX: ${adxAvg.toFixed(
            2
          )}) - breakout potential`
        );
        confidenceScore += 0.2;

        if (adxTrend === "bullish") {
          if (recommendation === "neutral") recommendation = "buy";
        } else if (adxTrend === "bearish") {
          if (recommendation === "neutral") recommendation = "sell";
        }
      }
    }

    // Generate forecast based on breakout expectations
    const forecast = this.generateBreakoutForecast(
      indicators,
      config,
      recommendation
    );

    // Cap confidence score at 1.0
    confidenceScore = Math.min(confidenceScore, 1.0);

    // Adjust confidence based on market conditions
    if (reasons.length === 0) {
      recommendation = "neutral";
      confidenceScore = 0.1;
      reasons.push("No clear breakout signals detected");
    }

    // Boost confidence if multiple signals align
    if (reasons.length > 2) {
      confidenceScore = Math.min(confidenceScore * 1.2, 1.0);
      reasons.push(
        `Multiple breakout signals aligned (${reasons.length} indicators)`
      );
    }

    const signal: TradeSignal = {
      recommendation,
      reasons,
      confidenceScore,
      timestamp: Date.now(),
      strategy: this.name,
    };

    const result: StrategyResult = {
      signal,
      forecast,
      name: this.name,
      accuracy: this.calculateHistoricalAccuracy(indicators),
      weight: this.calculateWeight(confidenceScore),
      executionTime: Date.now() - startTime,
    };

    // Cache the result (equivalent to useMemo)
    setCachedStrategyResult(cacheKey, result);

    return result;
  }

  // Memoized forecast generation (equivalent to useMemo)
  private generateBreakoutForecast = (() => {
    const forecastCache = new Map<
      string,
      { result: ForecastPoint[]; timestamp: number }
    >();
    return (
      indicators: IndicatorResult[],
      config: StrategyConfig,
      direction: "buy" | "sell" | "neutral"
    ): ForecastPoint[] => {
      const cacheKey = `forecast:${config.symbol}:${
        config.forecastDays
      }:${direction}:${calculateIndicatorSignature(indicators)}`;
      const cached = forecastCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 120000) {
        // 2 minute cache
        return cached.result;
      }

      const forecast: ForecastPoint[] = [];
      const baseIndicator =
        indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
        indicators[0];

      for (let day = 1; day <= config.forecastDays; day++) {
        const basePoint = baseIndicator.forecast.find((f) => f.day === day);
        if (!basePoint) continue;

        // Breakout tendency: strong moves in the direction of breakout
        let breakoutFactor = 1;
        if (direction === "buy") {
          breakoutFactor = 1 + (day / config.forecastDays) * 0.15; // Upward breakout
        } else if (direction === "sell") {
          breakoutFactor = 1 - (day / config.forecastDays) * 0.15; // Downward breakout
        }

        // Add volatility for breakout scenarios
        const volatilityFactor = 1 + (Math.random() - 0.5) * 0.2; // Higher volatility

        forecast.push({
          day,
          high: basePoint.high * breakoutFactor * volatilityFactor,
          low: basePoint.low * breakoutFactor * volatilityFactor,
          avg: basePoint.avg * breakoutFactor,
          confidence:
            basePoint.confidence * (0.9 - (day / config.forecastDays) * 0.1), // Moderate confidence decay
          indicator: `${this.name}_Breakout`,
        });
      }

      forecastCache.set(cacheKey, { result: forecast, timestamp: Date.now() });
      return forecast;
    };
  })();

  private calculateHistoricalAccuracy(indicators: IndicatorResult[]): number {
    // Calculate accuracy based on indicator quality and breakout success rate
    const avgAccuracy =
      indicators.reduce((sum, ind) => sum + ind.accuracy, 0) /
      indicators.length;

    // Breakout strategies can have high accuracy when conditions are right (65-85%)
    return Math.min(avgAccuracy * 0.9, 0.85);
  }

  private calculateWeight(confidenceScore: number): number {
    // Weight based on confidence and strategy characteristics
    const baseWeight = 0.8; // Breakout gets higher weight when confident
    return Math.min(baseWeight * confidenceScore, 0.95);
  }
}
