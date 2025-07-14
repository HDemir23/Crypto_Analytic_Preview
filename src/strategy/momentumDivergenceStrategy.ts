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

export class MomentumDivergenceStrategy implements Strategy {
  public readonly name = "Momentum Divergence";
  public readonly description =
    "Identifies divergences between price and momentum indicators (RSI, MACD, Stochastic) to predict trend reversals";

  // Memoized calculation for price-momentum divergence (equivalent to useCallback)
  private analyzeDivergence = (() => {
    const divergenceCache = new Map<
      string,
      { result: any; timestamp: number }
    >();
    return (
      priceIndicator: IndicatorResult,
      momentumIndicator: IndicatorResult,
      lookbackPeriod: number = 14
    ) => {
      const cacheKey = `divergence:${priceIndicator.name}:${momentumIndicator.name}:${lookbackPeriod}`;
      const cached = divergenceCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const priceValues = priceIndicator.forecast.map((f) => f.avg);
      const momentumValues = momentumIndicator.forecast.map((f) => f.avg);
      const minLength = Math.min(priceValues.length, momentumValues.length);

      const divergences = [];
      const windowSize = Math.min(lookbackPeriod, minLength);

      for (let i = windowSize; i < minLength; i++) {
        const priceWindow = priceValues.slice(i - windowSize, i);
        const momentumWindow = momentumValues.slice(i - windowSize, i);

        // Calculate trends for price and momentum
        const priceHighs = this.findPeaks(priceWindow, true);
        const priceLows = this.findPeaks(priceWindow, false);
        const momentumHighs = this.findPeaks(momentumWindow, true);
        const momentumLows = this.findPeaks(momentumWindow, false);

        // Bullish divergence: price making lower lows, momentum making higher lows
        if (priceLows.length >= 2 && momentumLows.length >= 2) {
          const priceSlope = this.calculateSlope(priceLows.slice(-2));
          const momentumSlope = this.calculateSlope(momentumLows.slice(-2));

          if (priceSlope < -0.01 && momentumSlope > 0.01) {
            divergences.push({
              type: "bullish",
              day: i,
              strength: Math.abs(priceSlope - momentumSlope),
              priceSlope,
              momentumSlope,
              confidence: this.calculateDivergenceConfidence(
                priceSlope,
                momentumSlope
              ),
            });
          }
        }

        // Bearish divergence: price making higher highs, momentum making lower highs
        if (priceHighs.length >= 2 && momentumHighs.length >= 2) {
          const priceSlope = this.calculateSlope(priceHighs.slice(-2));
          const momentumSlope = this.calculateSlope(momentumHighs.slice(-2));

          if (priceSlope > 0.01 && momentumSlope < -0.01) {
            divergences.push({
              type: "bearish",
              day: i,
              strength: Math.abs(priceSlope - momentumSlope),
              priceSlope,
              momentumSlope,
              confidence: this.calculateDivergenceConfidence(
                priceSlope,
                momentumSlope
              ),
            });
          }
        }
      }

      const recentDivergences = divergences.filter(
        (d) => d.day >= minLength - lookbackPeriod
      );
      const strongestDivergence =
        recentDivergences.length > 0
          ? recentDivergences.reduce((max, curr) =>
              curr.strength > max.strength ? curr : max
            )
          : null;

      const result = {
        divergences,
        recentDivergences,
        strongestDivergence,
        hasBullishDivergence: recentDivergences.some(
          (d) => d.type === "bullish"
        ),
        hasBearishDivergence: recentDivergences.some(
          (d) => d.type === "bearish"
        ),
        avgConfidence:
          recentDivergences.length > 0
            ? recentDivergences.reduce((sum, d) => sum + d.confidence, 0) /
              recentDivergences.length
            : 0,
      };

      divergenceCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Helper method to find peaks and valleys
  private findPeaks(
    data: number[],
    findMaxima: boolean
  ): Array<{ index: number; value: number }> {
    const peaks = [];
    const windowSize = 3;

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const window = data.slice(i - windowSize, i + windowSize + 1);
      const centerValue = window[windowSize];

      if (findMaxima) {
        if (centerValue === Math.max(...window)) {
          peaks.push({ index: i, value: centerValue });
        }
      } else {
        if (centerValue === Math.min(...window)) {
          peaks.push({ index: i, value: centerValue });
        }
      }
    }

    return peaks;
  }

  // Helper method to calculate slope between two points
  private calculateSlope(
    points: Array<{ index: number; value: number }>
  ): number {
    if (points.length < 2) return 0;

    const p1 = points[0];
    const p2 = points[points.length - 1];

    return (p2.value - p1.value) / (p2.index - p1.index);
  }

  // Helper method to calculate divergence confidence
  private calculateDivergenceConfidence(
    priceSlope: number,
    momentumSlope: number
  ): number {
    const slopeDifference = Math.abs(priceSlope - momentumSlope);
    const magnitude = Math.abs(priceSlope) + Math.abs(momentumSlope);

    return Math.min(slopeDifference / magnitude, 1.0);
  }

  // Memoized RSI divergence analysis (equivalent to useCallback)
  private analyzeRSIDivergence = (() => {
    const rsiCache = new Map<string, { result: any; timestamp: number }>();
    return (
      priceIndicator: IndicatorResult,
      rsiIndicator: IndicatorResult,
      lookbackPeriod: number = 14
    ) => {
      const cacheKey = `rsi_div:${priceIndicator.name}:${rsiIndicator.name}:${lookbackPeriod}`;
      const cached = rsiCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const baseDivergence = this.analyzeDivergence(
        priceIndicator,
        rsiIndicator,
        lookbackPeriod
      );

      // RSI-specific analysis
      const rsiValues = rsiIndicator.forecast.map((f) => f.avg);
      const currentRSI = rsiValues[rsiValues.length - 1];
      const avgRSI = calculateAveragePrice(rsiIndicator.forecast);

      // RSI extreme levels enhance divergence signals
      const isRSIExtreme = currentRSI > 70 || currentRSI < 30;
      const rsiTrend = calculateTrend(rsiIndicator.forecast);

      const result = {
        ...baseDivergence,
        currentRSI,
        avgRSI,
        isRSIExtreme,
        rsiTrend,
        enhancedSignal:
          isRSIExtreme && baseDivergence.recentDivergences.length > 0,
        rsiMomentum: this.calculateRSIMomentum(rsiValues),
      };

      rsiCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Helper method to calculate RSI momentum
  private calculateRSIMomentum(
    rsiValues: number[]
  ): "strengthening" | "weakening" | "neutral" {
    if (rsiValues.length < 6) return "neutral";

    const recent = rsiValues.slice(-6);
    const firstHalf = recent.slice(0, 3);
    const secondHalf = recent.slice(3);

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return "strengthening";
    if (change < -0.05) return "weakening";
    return "neutral";
  }

  // Memoized MACD divergence analysis (equivalent to useCallback)
  private analyzeMACDDivergence = (() => {
    const macdCache = new Map<string, { result: any; timestamp: number }>();
    return (
      priceIndicator: IndicatorResult,
      macdIndicator: IndicatorResult,
      lookbackPeriod: number = 14
    ) => {
      const cacheKey = `macd_div:${priceIndicator.name}:${macdIndicator.name}:${lookbackPeriod}`;
      const cached = macdCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const baseDivergence = this.analyzeDivergence(
        priceIndicator,
        macdIndicator,
        lookbackPeriod
      );

      // MACD-specific analysis
      const macdValues = macdIndicator.forecast.map((f) => f.avg);
      const macdTrend = calculateTrend(macdIndicator.forecast);
      const macdVolatility = calculateVolatility(macdIndicator.forecast);

      // MACD crossover analysis
      const zeroCrossings = this.findZeroCrossings(macdValues);
      const recentCrossings = zeroCrossings.filter(
        (c) => c.index >= macdValues.length - lookbackPeriod
      );

      const result = {
        ...baseDivergence,
        macdTrend,
        macdVolatility,
        zeroCrossings,
        recentCrossings,
        macdMomentum: this.calculateMACDMomentum(macdValues),
        crossoverSupport:
          recentCrossings.length > 0 &&
          baseDivergence.recentDivergences.length > 0,
      };

      macdCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Helper method to find zero crossings in MACD
  private findZeroCrossings(
    macdValues: number[]
  ): Array<{ index: number; type: "bullish" | "bearish" }> {
    const crossings: Array<{ index: number; type: "bullish" | "bearish" }> = [];

    for (let i = 1; i < macdValues.length; i++) {
      const prev = macdValues[i - 1];
      const curr = macdValues[i];

      if (prev < 0 && curr > 0) {
        crossings.push({ index: i, type: "bullish" });
      } else if (prev > 0 && curr < 0) {
        crossings.push({ index: i, type: "bearish" });
      }
    }

    return crossings;
  }

  // Helper method to calculate MACD momentum
  private calculateMACDMomentum(
    macdValues: number[]
  ): "accelerating" | "decelerating" | "neutral" {
    if (macdValues.length < 4) return "neutral";

    const recent = macdValues.slice(-4);
    const changes = [];

    for (let i = 1; i < recent.length; i++) {
      changes.push(recent[i] - recent[i - 1]);
    }

    const avgChange =
      changes.reduce((sum, val) => sum + val, 0) / changes.length;
    const changeAcceleration = changes[changes.length - 1] - changes[0];

    if (changeAcceleration > 0.01) return "accelerating";
    if (changeAcceleration < -0.01) return "decelerating";
    return "neutral";
  }

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

    // Find relevant indicators for divergence analysis
    const rsiIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("rsi")
    );
    const macdIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("macd")
    );
    const stochasticIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("stochastic")
    );
    const priceIndicator =
      indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
      indicators[0];

    if (!rsiIndicator && !macdIndicator && !stochasticIndicator) {
      throw new Error(
        "Momentum Divergence strategy requires at least one momentum indicator (RSI, MACD, or Stochastic)"
      );
    }

    const reasons: string[] = [];
    let confidenceScore = 0;
    let recommendation: "buy" | "sell" | "neutral" = "neutral";

    // Analyze RSI divergences
    if (rsiIndicator) {
      const rsiDivergence = this.analyzeRSIDivergence(
        priceIndicator,
        rsiIndicator,
        config.lookbackPeriod
      );

      if (rsiDivergence.hasBullishDivergence) {
        const strongest = rsiDivergence.strongestDivergence;
        reasons.push(
          `Bullish RSI divergence detected (strength: ${(
            strongest.strength * 100
          ).toFixed(2)}%, confidence: ${(strongest.confidence * 100).toFixed(
            0
          )}%)`
        );
        confidenceScore += 0.35;
        recommendation = "buy";

        if (rsiDivergence.enhancedSignal) {
          reasons.push(
            `RSI at extreme level (${rsiDivergence.currentRSI.toFixed(
              1
            )}) - enhanced divergence signal`
          );
          confidenceScore += 0.15;
        }
      } else if (rsiDivergence.hasBearishDivergence) {
        const strongest = rsiDivergence.strongestDivergence;
        reasons.push(
          `Bearish RSI divergence detected (strength: ${(
            strongest.strength * 100
          ).toFixed(2)}%, confidence: ${(strongest.confidence * 100).toFixed(
            0
          )}%)`
        );
        confidenceScore += 0.35;
        recommendation = "sell";

        if (rsiDivergence.enhancedSignal) {
          reasons.push(
            `RSI at extreme level (${rsiDivergence.currentRSI.toFixed(
              1
            )}) - enhanced divergence signal`
          );
          confidenceScore += 0.15;
        }
      }

      // RSI momentum analysis
      if (
        rsiDivergence.rsiMomentum === "strengthening" &&
        recommendation === "buy"
      ) {
        reasons.push(`RSI momentum strengthening - supporting bullish signal`);
        confidenceScore += 0.1;
      } else if (
        rsiDivergence.rsiMomentum === "weakening" &&
        recommendation === "sell"
      ) {
        reasons.push(`RSI momentum weakening - supporting bearish signal`);
        confidenceScore += 0.1;
      }
    }

    // Analyze MACD divergences
    if (macdIndicator) {
      const macdDivergence = this.analyzeMACDDivergence(
        priceIndicator,
        macdIndicator,
        config.lookbackPeriod
      );

      if (macdDivergence.hasBullishDivergence) {
        const strongest = macdDivergence.strongestDivergence;
        reasons.push(
          `Bullish MACD divergence detected (strength: ${(
            strongest.strength * 100
          ).toFixed(2)}%)`
        );
        confidenceScore += 0.3;
        if (recommendation === "neutral") recommendation = "buy";

        if (macdDivergence.crossoverSupport) {
          reasons.push(`MACD zero-line crossover supporting divergence signal`);
          confidenceScore += 0.15;
        }
      } else if (macdDivergence.hasBearishDivergence) {
        const strongest = macdDivergence.strongestDivergence;
        reasons.push(
          `Bearish MACD divergence detected (strength: ${(
            strongest.strength * 100
          ).toFixed(2)}%)`
        );
        confidenceScore += 0.3;
        if (recommendation === "neutral") recommendation = "sell";

        if (macdDivergence.crossoverSupport) {
          reasons.push(`MACD zero-line crossover supporting divergence signal`);
          confidenceScore += 0.15;
        }
      }

      // MACD momentum analysis
      if (
        macdDivergence.macdMomentum === "accelerating" &&
        recommendation === "buy"
      ) {
        reasons.push(`MACD momentum accelerating - supporting bullish signal`);
        confidenceScore += 0.1;
      } else if (
        macdDivergence.macdMomentum === "decelerating" &&
        recommendation === "sell"
      ) {
        reasons.push(`MACD momentum decelerating - supporting bearish signal`);
        confidenceScore += 0.1;
      }
    }

    // Analyze Stochastic divergences
    if (stochasticIndicator) {
      const stochasticDivergence = this.analyzeDivergence(
        priceIndicator,
        stochasticIndicator,
        config.lookbackPeriod
      );

      if (stochasticDivergence.hasBullishDivergence) {
        const strongest = stochasticDivergence.strongestDivergence;
        reasons.push(
          `Bullish Stochastic divergence detected (strength: ${(
            strongest.strength * 100
          ).toFixed(2)}%)`
        );
        confidenceScore += 0.25;
        if (recommendation === "neutral") recommendation = "buy";
      } else if (stochasticDivergence.hasBearishDivergence) {
        const strongest = stochasticDivergence.strongestDivergence;
        reasons.push(
          `Bearish Stochastic divergence detected (strength: ${(
            strongest.strength * 100
          ).toFixed(2)}%)`
        );
        confidenceScore += 0.25;
        if (recommendation === "neutral") recommendation = "sell";
      }
    }

    // Generate forecast based on divergence expectations
    const forecast = this.generateDivergenceForecast(
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
      reasons.push("No momentum divergences detected");
    }

    // Boost confidence for multiple divergence confirmations
    const divergenceCount = reasons.filter((r) =>
      r.includes("divergence")
    ).length;
    if (divergenceCount > 1) {
      confidenceScore = Math.min(confidenceScore * 1.15, 1.0);
      reasons.push(
        `Multiple momentum divergences confirmed (${divergenceCount} indicators)`
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
  private generateDivergenceForecast = (() => {
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

        // Divergence signals often lead to reversals with moderate follow-through
        let divergenceFactor = 1;
        const halfPeriod = config.forecastDays / 2;

        if (direction === "buy") {
          // Initial reversal followed by trend continuation
          divergenceFactor =
            day <= halfPeriod
              ? 1 + (day / halfPeriod) * 0.08
              : 1 + 0.08 * (1 - ((day - halfPeriod) / halfPeriod) * 0.3);
        } else if (direction === "sell") {
          // Initial reversal followed by trend continuation
          divergenceFactor =
            day <= halfPeriod
              ? 1 - (day / halfPeriod) * 0.08
              : 1 - 0.08 * (1 - ((day - halfPeriod) / halfPeriod) * 0.3);
        }

        // Add moderate volatility for divergence scenarios
        const volatilityFactor = 1 + (Math.random() - 0.5) * 0.12;

        forecast.push({
          day,
          high: basePoint.high * divergenceFactor * volatilityFactor,
          low: basePoint.low * divergenceFactor * volatilityFactor,
          avg: basePoint.avg * divergenceFactor,
          confidence:
            basePoint.confidence * (0.85 - (day / config.forecastDays) * 0.25), // Faster confidence decay
          indicator: `${this.name}_Divergence`,
        });
      }

      forecastCache.set(cacheKey, { result: forecast, timestamp: Date.now() });
      return forecast;
    };
  })();

  private calculateHistoricalAccuracy(indicators: IndicatorResult[]): number {
    // Calculate accuracy based on indicator quality and divergence success rate
    const avgAccuracy =
      indicators.reduce((sum, ind) => sum + ind.accuracy, 0) /
      indicators.length;

    // Divergence strategies have moderate accuracy but high reward potential (60-75%)
    return Math.min(avgAccuracy * 0.82, 0.75);
  }

  private calculateWeight(confidenceScore: number): number {
    // Weight based on confidence and strategy characteristics
    const baseWeight = 0.65; // Divergence gets moderate weight due to complexity
    return Math.min(baseWeight * confidenceScore, 0.85);
  }
}
