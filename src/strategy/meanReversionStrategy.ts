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

export class MeanReversionStrategy implements Strategy {
  public readonly name = "Mean Reversion";
  public readonly description =
    "Identifies oversold/overbought conditions using RSI, Bollinger Bands, and statistical analysis";

  // Memoized calculation for RSI analysis (equivalent to useCallback)
  private analyzeRSI = (() => {
    const rsiCache = new Map<string, { result: any; timestamp: number }>();
    return (rsi: IndicatorResult, sensitivity: number = 0.5) => {
      const cacheKey = `rsi:${rsi.name}:${sensitivity}:${rsi.forecast.length}`;
      const cached = rsiCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const result = {
        oversold: rsi.forecast.filter(
          (point) => point.avg < 30 + sensitivity * 20
        ),
        overbought: rsi.forecast.filter(
          (point) => point.avg > 70 - sensitivity * 20
        ),
        neutral: rsi.forecast.filter(
          (point) =>
            point.avg >= 30 + sensitivity * 20 &&
            point.avg <= 70 - sensitivity * 20
        ),
        avgRSI: calculateAveragePrice(rsi.forecast),
      };

      rsiCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Memoized calculation for Bollinger Bands analysis (equivalent to useCallback)
  private analyzeBollinger = (() => {
    const bollingerCache = new Map<
      string,
      { result: any; timestamp: number }
    >();
    return (bollinger: IndicatorResult) => {
      const cacheKey = `bollinger:${bollinger.name}:${bollinger.forecast.length}`;
      const cached = bollingerCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const result = {
        lowerBandTouches: bollinger.forecast.filter(
          (point) => point.low <= point.avg - (point.high - point.low) * 0.4
        ),
        upperBandTouches: bollinger.forecast.filter(
          (point) => point.high >= point.avg + (point.high - point.low) * 0.4
        ),
        bandwidth: calculateVolatility(bollinger.forecast),
        trend: calculateTrend(bollinger.forecast),
      };

      bollingerCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Memoized calculation for statistical mean reversion (equivalent to useCallback)
  private calculateMeanReversion = (() => {
    const meanCache = new Map<string, { result: any; timestamp: number }>();
    return (forecasts: ForecastPoint[], lookbackPeriod: number = 14) => {
      const cacheKey = `meanrev:${forecasts.length}:${lookbackPeriod}`;
      const cached = meanCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const prices = forecasts.map((f) => f.avg);
      const movingAverage =
        prices.slice(-lookbackPeriod).reduce((sum, price) => sum + price, 0) /
        lookbackPeriod;
      const currentPrice = prices[prices.length - 1];
      const deviation = (currentPrice - movingAverage) / movingAverage;

      const result = {
        movingAverage,
        currentPrice,
        deviation,
        isOversold: deviation < -0.05, // 5% below mean
        isOverbought: deviation > 0.05, // 5% above mean
        magnitude: Math.abs(deviation),
      };

      meanCache.set(cacheKey, { result, timestamp: Date.now() });
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

    // Find relevant indicators for mean reversion
    const rsiIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("rsi")
    );
    const bollingerIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("bollinger")
    );
    const smaIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("sma")
    );

    if (!rsiIndicator && !bollingerIndicator && !smaIndicator) {
      throw new Error(
        "Mean Reversion strategy requires at least one of: RSI, Bollinger Bands, or SMA indicators"
      );
    }

    const reasons: string[] = [];
    let confidenceScore = 0;
    let recommendation: "buy" | "sell" | "neutral" = "neutral";

    // Analyze RSI for mean reversion signals
    if (rsiIndicator) {
      const rsiAnalysis = this.analyzeRSI(rsiIndicator, config.sensitivity);

      if (rsiAnalysis.oversold.length > rsiAnalysis.overbought.length) {
        reasons.push(
          `RSI indicates oversold condition (${rsiAnalysis.oversold.length} oversold vs ${rsiAnalysis.overbought.length} overbought periods)`
        );
        confidenceScore += 0.3;
        recommendation = "buy";
      } else if (rsiAnalysis.overbought.length > rsiAnalysis.oversold.length) {
        reasons.push(
          `RSI indicates overbought condition (${rsiAnalysis.overbought.length} overbought vs ${rsiAnalysis.oversold.length} oversold periods)`
        );
        confidenceScore += 0.3;
        recommendation = "sell";
      } else {
        reasons.push(
          `RSI shows neutral conditions (avg: ${rsiAnalysis.avgRSI.toFixed(2)})`
        );
      }
    }

    // Analyze Bollinger Bands for mean reversion
    if (bollingerIndicator) {
      const bollingerAnalysis = this.analyzeBollinger(bollingerIndicator);

      if (bollingerAnalysis.lowerBandTouches.length > 0) {
        reasons.push(
          `Price touching lower Bollinger Band (${bollingerAnalysis.lowerBandTouches.length} touches) - potential bounce`
        );
        confidenceScore += 0.25;
        if (recommendation === "neutral") recommendation = "buy";
      } else if (bollingerAnalysis.upperBandTouches.length > 0) {
        reasons.push(
          `Price touching upper Bollinger Band (${bollingerAnalysis.upperBandTouches.length} touches) - potential reversal`
        );
        confidenceScore += 0.25;
        if (recommendation === "neutral") recommendation = "sell";
      }

      // Consider bandwidth for volatility
      if (bollingerAnalysis.bandwidth < 0.02) {
        reasons.push(
          `Low volatility detected (bandwidth: ${(
            bollingerAnalysis.bandwidth * 100
          ).toFixed(2)}%) - potential breakout`
        );
        confidenceScore += 0.1;
      }
    }

    // Statistical mean reversion analysis
    if (smaIndicator) {
      const meanReversion = this.calculateMeanReversion(
        smaIndicator.forecast,
        config.lookbackPeriod
      );

      if (meanReversion.isOversold) {
        reasons.push(
          `Price ${(meanReversion.deviation * 100).toFixed(
            2
          )}% below moving average - oversold`
        );
        confidenceScore += 0.2;
        if (recommendation === "neutral") recommendation = "buy";
      } else if (meanReversion.isOverbought) {
        reasons.push(
          `Price ${(meanReversion.deviation * 100).toFixed(
            2
          )}% above moving average - overbought`
        );
        confidenceScore += 0.2;
        if (recommendation === "neutral") recommendation = "sell";
      }
    }

    // Generate forecast based on mean reversion expectations
    const forecast = this.generateMeanReversionForecast(indicators, config);

    // Cap confidence score at 1.0
    confidenceScore = Math.min(confidenceScore, 1.0);

    // Adjust confidence based on market conditions
    if (reasons.length === 0) {
      recommendation = "neutral";
      confidenceScore = 0.1;
      reasons.push("No clear mean reversion signals detected");
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
  private generateMeanReversionForecast = (() => {
    const forecastCache = new Map<
      string,
      { result: ForecastPoint[]; timestamp: number }
    >();
    return (
      indicators: IndicatorResult[],
      config: StrategyConfig
    ): ForecastPoint[] => {
      const cacheKey = `forecast:${config.symbol}:${
        config.forecastDays
      }:${calculateIndicatorSignature(indicators)}`;
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

        // Mean reversion tendency: prices move toward the mean over time
        const meanReversionFactor = 1 - (day / config.forecastDays) * 0.1; // Gradually revert to mean
        const volatilityAdjustment = 1 + (Math.random() - 0.5) * 0.1; // Add some randomness

        forecast.push({
          day,
          high: basePoint.high * meanReversionFactor * volatilityAdjustment,
          low: basePoint.low * meanReversionFactor * volatilityAdjustment,
          avg: basePoint.avg * meanReversionFactor,
          confidence:
            basePoint.confidence * (1 - (day / config.forecastDays) * 0.2), // Decreasing confidence over time
          indicator: `${this.name}_MeanReversion`,
        });
      }

      forecastCache.set(cacheKey, { result: forecast, timestamp: Date.now() });
      return forecast;
    };
  })();

  private calculateHistoricalAccuracy(indicators: IndicatorResult[]): number {
    // Calculate accuracy based on indicator quality and mean reversion success rate
    const avgAccuracy =
      indicators.reduce((sum, ind) => sum + ind.accuracy, 0) /
      indicators.length;

    // Mean reversion strategies typically have moderate accuracy (60-75%)
    return Math.min(avgAccuracy * 0.85, 0.75);
  }

  private calculateWeight(confidenceScore: number): number {
    // Weight based on confidence and strategy characteristics
    const baseWeight = 0.7; // Mean reversion gets moderate weight
    return Math.min(baseWeight * confidenceScore, 0.9);
  }
}
