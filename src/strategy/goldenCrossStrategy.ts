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

export class GoldenCrossStrategy implements Strategy {
  public readonly name = "Golden Cross";
  public readonly description =
    "Identifies trend reversals using moving average crossovers, particularly golden cross (50 SMA crossing above 200 SMA) and death cross patterns";

  // Memoized calculation for moving average crossovers (equivalent to useCallback)
  private analyzeCrossovers = (() => {
    const crossoverCache = new Map<
      string,
      { result: any; timestamp: number }
    >();
    return (
      shortMA: IndicatorResult,
      longMA: IndicatorResult,
      lookbackPeriod: number = 10
    ) => {
      const cacheKey = `crossover:${shortMA.name}:${longMA.name}:${lookbackPeriod}`;
      const cached = crossoverCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const shortValues = shortMA.forecast.map((f) => f.avg);
      const longValues = longMA.forecast.map((f) => f.avg);
      const minLength = Math.min(shortValues.length, longValues.length);

      const crossovers = [];
      let currentState = shortValues[0] > longValues[0] ? "above" : "below";

      for (let i = 1; i < minLength; i++) {
        const shortVal = shortValues[i];
        const longVal = longValues[i];
        const newState = shortVal > longVal ? "above" : "below";

        if (currentState !== newState) {
          crossovers.push({
            day: i,
            type: newState === "above" ? "golden" : "death",
            strength: Math.abs(shortVal - longVal) / longVal, // Crossover strength
            shortValue: shortVal,
            longValue: longVal,
          });
          currentState = newState;
        }
      }

      // Recent crossovers are more important
      const recentCrossovers = crossovers.filter(
        (c) => c.day >= minLength - lookbackPeriod
      );
      const currentSpread =
        (shortValues[minLength - 1] - longValues[minLength - 1]) /
        longValues[minLength - 1];
      const spreadTrend = this.calculateSpreadTrend(
        shortValues,
        longValues,
        lookbackPeriod
      );

      const result = {
        crossovers,
        recentCrossovers,
        currentSpread,
        spreadTrend,
        isGoldenCross: recentCrossovers.some((c) => c.type === "golden"),
        isDeathCross: recentCrossovers.some((c) => c.type === "death"),
        strongestCrossover:
          recentCrossovers.length > 0
            ? recentCrossovers.reduce((max, curr) =>
                curr.strength > max.strength ? curr : max
              )
            : null,
        convergence: Math.abs(currentSpread) < 0.02, // MAs converging
      };

      crossoverCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Helper method to calculate spread trend
  private calculateSpreadTrend(
    shortValues: number[],
    longValues: number[],
    lookbackPeriod: number
  ): "expanding" | "contracting" | "neutral" {
    const minLength = Math.min(shortValues.length, longValues.length);
    const spreads = [];

    for (let i = Math.max(0, minLength - lookbackPeriod); i < minLength; i++) {
      spreads.push(Math.abs(shortValues[i] - longValues[i]) / longValues[i]);
    }

    if (spreads.length < 2) return "neutral";

    const firstHalf = spreads.slice(0, Math.floor(spreads.length / 2));
    const secondHalf = spreads.slice(Math.floor(spreads.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    if (secondAvg > firstAvg * 1.1) return "expanding";
    if (secondAvg < firstAvg * 0.9) return "contracting";
    return "neutral";
  }

  // Memoized trend strength analysis (equivalent to useCallback)
  private analyzeTrendStrength = (() => {
    const trendCache = new Map<string, { result: any; timestamp: number }>();
    return (
      emaIndicator: IndicatorResult,
      smaIndicator: IndicatorResult,
      adxIndicator?: IndicatorResult
    ) => {
      const cacheKey = `trend:${emaIndicator.name}:${smaIndicator.name}:${
        adxIndicator?.name || "none"
      }`;
      const cached = trendCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const emaTrend = calculateTrend(emaIndicator.forecast);
      const smaTrend = calculateTrend(smaIndicator.forecast);
      const emaVolatility = calculateVolatility(emaIndicator.forecast);
      const smaVolatility = calculateVolatility(smaIndicator.forecast);

      // Trend alignment
      const trendsAligned = emaTrend === smaTrend && emaTrend !== "neutral";

      // Trend strength from ADX if available
      let adxStrength = 0.5; // Default moderate strength
      if (adxIndicator) {
        const adxAvg = calculateAveragePrice(adxIndicator.forecast);
        adxStrength = Math.min(adxAvg / 100, 1.0); // Normalize ADX to 0-1
      }

      const result = {
        emaTrend,
        smaTrend,
        trendsAligned,
        emaVolatility,
        smaVolatility,
        adxStrength,
        overallTrend: trendsAligned ? emaTrend : "neutral",
        trendConfidence: trendsAligned ? adxStrength : adxStrength * 0.5,
        isStrongTrend: trendsAligned && adxStrength > 0.6,
      };

      trendCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Memoized volume confirmation analysis (equivalent to useCallback)
  private analyzeVolumeConfirmation = (() => {
    const volumeCache = new Map<string, { result: any; timestamp: number }>();
    return (
      vwapIndicator: IndicatorResult,
      priceIndicator: IndicatorResult,
      lookbackPeriod: number = 14
    ) => {
      const cacheKey = `volume:${vwapIndicator.name}:${priceIndicator.name}:${lookbackPeriod}`;
      const cached = volumeCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const vwapValues = vwapIndicator.forecast.map((f) => f.avg);
      const priceValues = priceIndicator.forecast.map((f) => f.avg);
      const minLength = Math.min(vwapValues.length, priceValues.length);

      // Volume-price relationship
      const volumeConfirmation = [];
      for (let i = 1; i < minLength; i++) {
        const priceChange =
          (priceValues[i] - priceValues[i - 1]) / priceValues[i - 1];
        const volumeChange =
          (vwapValues[i] - vwapValues[i - 1]) / vwapValues[i - 1];

        // Volume should increase with price movement for confirmation
        const isConfirmed =
          (priceChange > 0 && volumeChange > 0) ||
          (priceChange < 0 && volumeChange < 0);
        volumeConfirmation.push({
          day: i,
          priceChange,
          volumeChange,
          isConfirmed,
          strength: Math.abs(priceChange) * Math.abs(volumeChange),
        });
      }

      const recentConfirmation = volumeConfirmation.slice(-lookbackPeriod);
      const confirmationRate =
        recentConfirmation.filter((c) => c.isConfirmed).length /
        recentConfirmation.length;
      const avgStrength =
        recentConfirmation.reduce((sum, c) => sum + c.strength, 0) /
        recentConfirmation.length;

      const result = {
        volumeConfirmation,
        recentConfirmation,
        confirmationRate,
        avgStrength,
        isVolumeSupporting: confirmationRate > 0.6,
        volumeTrend: calculateTrend(vwapIndicator.forecast),
      };

      volumeCache.set(cacheKey, { result, timestamp: Date.now() });
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

    // Find relevant indicators for golden cross analysis
    const emaIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("ema")
    );
    const smaIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("sma")
    );
    const vwapIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("vwap")
    );
    const adxIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("adx")
    );

    if (!emaIndicator && !smaIndicator) {
      throw new Error(
        "Golden Cross strategy requires at least one moving average indicator (EMA or SMA)"
      );
    }

    const reasons: string[] = [];
    let confidenceScore = 0;
    let recommendation: "buy" | "sell" | "neutral" = "neutral";

    // Analyze moving average crossovers
    if (emaIndicator && smaIndicator) {
      const crossoverAnalysis = this.analyzeCrossovers(
        emaIndicator,
        smaIndicator,
        config.lookbackPeriod
      );

      if (crossoverAnalysis.isGoldenCross) {
        const strongestCross = crossoverAnalysis.strongestCrossover;
        reasons.push(
          `Golden Cross detected - ${emaIndicator.name} crossed above ${
            smaIndicator.name
          } (strength: ${(strongestCross.strength * 100).toFixed(2)}%)`
        );
        confidenceScore += 0.4;
        recommendation = "buy";
      } else if (crossoverAnalysis.isDeathCross) {
        const strongestCross = crossoverAnalysis.strongestCrossover;
        reasons.push(
          `Death Cross detected - ${emaIndicator.name} crossed below ${
            smaIndicator.name
          } (strength: ${(strongestCross.strength * 100).toFixed(2)}%)`
        );
        confidenceScore += 0.4;
        recommendation = "sell";
      }

      // Analyze spread trend
      if (
        crossoverAnalysis.spreadTrend === "expanding" &&
        crossoverAnalysis.currentSpread > 0
      ) {
        reasons.push(
          `Moving averages expanding upward - bullish trend strengthening`
        );
        confidenceScore += 0.2;
        if (recommendation === "neutral") recommendation = "buy";
      } else if (
        crossoverAnalysis.spreadTrend === "expanding" &&
        crossoverAnalysis.currentSpread < 0
      ) {
        reasons.push(
          `Moving averages expanding downward - bearish trend strengthening`
        );
        confidenceScore += 0.2;
        if (recommendation === "neutral") recommendation = "sell";
      } else if (crossoverAnalysis.convergence) {
        reasons.push(
          `Moving averages converging - potential crossover approaching`
        );
        confidenceScore += 0.1;
      }
    }

    // Analyze trend strength
    if (emaIndicator && smaIndicator) {
      const trendAnalysis = this.analyzeTrendStrength(
        emaIndicator,
        smaIndicator,
        adxIndicator
      );

      if (trendAnalysis.isStrongTrend) {
        reasons.push(
          `Strong ${trendAnalysis.overallTrend} trend confirmed (confidence: ${(
            trendAnalysis.trendConfidence * 100
          ).toFixed(0)}%)`
        );
        confidenceScore += 0.3;

        if (trendAnalysis.overallTrend === "bullish") {
          if (recommendation === "neutral") recommendation = "buy";
        } else if (trendAnalysis.overallTrend === "bearish") {
          if (recommendation === "neutral") recommendation = "sell";
        }
      } else if (trendAnalysis.trendsAligned) {
        reasons.push(`Moderate ${trendAnalysis.overallTrend} trend detected`);
        confidenceScore += 0.15;

        if (trendAnalysis.overallTrend === "bullish") {
          if (recommendation === "neutral") recommendation = "buy";
        } else if (trendAnalysis.overallTrend === "bearish") {
          if (recommendation === "neutral") recommendation = "sell";
        }
      }
    }

    // Analyze volume confirmation
    if (vwapIndicator && (emaIndicator || smaIndicator)) {
      const priceIndicator = emaIndicator || smaIndicator;
      if (priceIndicator) {
        const volumeAnalysis = this.analyzeVolumeConfirmation(
          vwapIndicator,
          priceIndicator,
          config.lookbackPeriod
        );

        if (volumeAnalysis.isVolumeSupporting) {
          reasons.push(
            `Volume supporting price movement (confirmation rate: ${(
              volumeAnalysis.confirmationRate * 100
            ).toFixed(0)}%)`
          );
          confidenceScore += 0.25;
        } else {
          reasons.push(
            `Volume diverging from price - potential reversal warning`
          );
          confidenceScore *= 0.8; // Reduce confidence
        }

        if (volumeAnalysis.avgStrength > 0.01) {
          reasons.push(
            `Strong volume-price relationship (strength: ${(
              volumeAnalysis.avgStrength * 100
            ).toFixed(2)}%)`
          );
          confidenceScore += 0.1;
        }
      }
    }

    // Additional trend confirmation using single MA if crossover not available
    if (!emaIndicator || !smaIndicator) {
      const maIndicator = emaIndicator || smaIndicator;
      if (maIndicator) {
        const maTrend = calculateTrend(maIndicator.forecast);

        if (maTrend === "bullish") {
          reasons.push(`${maIndicator.name} showing bullish trend`);
          confidenceScore += 0.2;
          if (recommendation === "neutral") recommendation = "buy";
        } else if (maTrend === "bearish") {
          reasons.push(`${maIndicator.name} showing bearish trend`);
          confidenceScore += 0.2;
          if (recommendation === "neutral") recommendation = "sell";
        }
      }
    }

    // Generate forecast based on golden cross expectations
    const forecast = this.generateGoldenCrossForecast(
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
      reasons.push("No clear moving average signals detected");
    }

    // Boost confidence for strong crossover signals
    if (
      reasons.some(
        (r) => r.includes("Golden Cross") || r.includes("Death Cross")
      )
    ) {
      confidenceScore = Math.min(confidenceScore * 1.1, 1.0);
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
  private generateGoldenCrossForecast = (() => {
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
        indicators.find((ind) => ind.name.toLowerCase().includes("ema")) ||
        indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
        indicators[0];

      for (let day = 1; day <= config.forecastDays; day++) {
        const basePoint = baseIndicator.forecast.find((f) => f.day === day);
        if (!basePoint) continue;

        // Golden cross tends to produce sustained trends
        let trendFactor = 1;
        if (direction === "buy") {
          trendFactor = 1 + (day / config.forecastDays) * 0.12; // Gradual upward trend
        } else if (direction === "sell") {
          trendFactor = 1 - (day / config.forecastDays) * 0.12; // Gradual downward trend
        }

        // Add moderate volatility for trend-following
        const volatilityFactor = 1 + (Math.random() - 0.5) * 0.08;

        forecast.push({
          day,
          high: basePoint.high * trendFactor * volatilityFactor,
          low: basePoint.low * trendFactor * volatilityFactor,
          avg: basePoint.avg * trendFactor,
          confidence:
            basePoint.confidence * (0.95 - (day / config.forecastDays) * 0.15), // Gradual confidence decay
          indicator: `${this.name}_GoldenCross`,
        });
      }

      forecastCache.set(cacheKey, { result: forecast, timestamp: Date.now() });
      return forecast;
    };
  })();

  private calculateHistoricalAccuracy(indicators: IndicatorResult[]): number {
    // Calculate accuracy based on indicator quality and golden cross success rate
    const avgAccuracy =
      indicators.reduce((sum, ind) => sum + ind.accuracy, 0) /
      indicators.length;

    // Golden cross strategies have good accuracy for trend following (70-80%)
    return Math.min(avgAccuracy * 0.88, 0.8);
  }

  private calculateWeight(confidenceScore: number): number {
    // Weight based on confidence and strategy characteristics
    const baseWeight = 0.75; // Golden cross gets good weight for trend following
    return Math.min(baseWeight * confidenceScore, 0.9);
  }
}
