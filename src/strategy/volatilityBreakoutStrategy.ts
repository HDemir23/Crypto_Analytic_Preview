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

export class VolatilityBreakoutStrategy implements Strategy {
  public readonly name = "Volatility Breakout";
  public readonly description =
    "Identifies breakouts based on volatility expansion after periods of compression using Bollinger Bands and ATR";

  // Memoized volatility analysis (equivalent to useCallback)
  private analyzeVolatilityPattern = (() => {
    const volatilityCache = new Map<
      string,
      { result: any; timestamp: number }
    >();
    return (indicator: IndicatorResult, lookbackPeriod: number = 20) => {
      const cacheKey = `volatility:${indicator.name}:${lookbackPeriod}`;
      const cached = volatilityCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const prices = indicator.forecast.map((f) => f.avg);
      const highs = indicator.forecast.map((f) => f.high);
      const lows = indicator.forecast.map((f) => f.low);

      // Calculate rolling volatility
      const volatilities = [];
      for (let i = lookbackPeriod; i < prices.length; i++) {
        const window = prices.slice(i - lookbackPeriod, i);
        const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
        const variance =
          window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          window.length;
        volatilities.push(Math.sqrt(variance) / mean); // Coefficient of variation
      }

      // Calculate ATR (Average True Range)
      const atr = [];
      for (let i = 1; i < highs.length; i++) {
        const tr = Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - prices[i - 1]),
          Math.abs(lows[i] - prices[i - 1])
        );
        atr.push(tr);
      }

      // Rolling ATR
      const rollingATR = [];
      for (let i = lookbackPeriod; i < atr.length; i++) {
        const window = atr.slice(i - lookbackPeriod, i);
        rollingATR.push(
          window.reduce((sum, val) => sum + val, 0) / window.length
        );
      }

      const currentVolatility = volatilities[volatilities.length - 1];
      const avgVolatility =
        volatilities.reduce((sum, val) => sum + val, 0) / volatilities.length;
      const currentATR = rollingATR[rollingATR.length - 1];
      const avgATR =
        rollingATR.reduce((sum, val) => sum + val, 0) / rollingATR.length;

      // Detect compression and expansion phases
      const isCompression = currentVolatility < avgVolatility * 0.8;
      const isExpansion = currentVolatility > avgVolatility * 1.2;

      const result = {
        volatilities,
        rollingATR,
        currentVolatility,
        avgVolatility,
        currentATR,
        avgATR,
        isCompression,
        isExpansion,
        volatilityRatio: currentVolatility / avgVolatility,
        atrRatio: currentATR / avgATR,
        compressionPhase: this.detectCompressionPhase(volatilities),
        expansionPhase: this.detectExpansionPhase(volatilities),
      };

      volatilityCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Helper method to detect compression phase
  private detectCompressionPhase(volatilities: number[]): {
    length: number;
    strength: number;
  } {
    if (volatilities.length < 10) return { length: 0, strength: 0 };

    let compressionLength = 0;
    let compressionStrength = 0;
    const avgVolatility =
      volatilities.reduce((sum, val) => sum + val, 0) / volatilities.length;

    for (let i = volatilities.length - 1; i >= 0; i--) {
      if (volatilities[i] < avgVolatility * 0.8) {
        compressionLength++;
        compressionStrength +=
          (avgVolatility * 0.8 - volatilities[i]) / (avgVolatility * 0.8);
      } else {
        break;
      }
    }

    return {
      length: compressionLength,
      strength:
        compressionLength > 0 ? compressionStrength / compressionLength : 0,
    };
  }

  // Helper method to detect expansion phase
  private detectExpansionPhase(volatilities: number[]): {
    length: number;
    strength: number;
  } {
    if (volatilities.length < 5) return { length: 0, strength: 0 };

    let expansionLength = 0;
    let expansionStrength = 0;
    const avgVolatility =
      volatilities.reduce((sum, val) => sum + val, 0) / volatilities.length;

    for (let i = volatilities.length - 1; i >= 0; i--) {
      if (volatilities[i] > avgVolatility * 1.2) {
        expansionLength++;
        expansionStrength +=
          (volatilities[i] - avgVolatility * 1.2) / (avgVolatility * 1.2);
      } else {
        break;
      }
    }

    return {
      length: expansionLength,
      strength: expansionLength > 0 ? expansionStrength / expansionLength : 0,
    };
  }

  // Memoized Bollinger Band squeeze analysis (equivalent to useCallback)
  private analyzeBollingerSqueeze = (() => {
    const squeezeCache = new Map<string, { result: any; timestamp: number }>();
    return (
      bollingerIndicator: IndicatorResult,
      lookbackPeriod: number = 20
    ) => {
      const cacheKey = `squeeze:${bollingerIndicator.name}:${lookbackPeriod}`;
      const cached = squeezeCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const forecast = bollingerIndicator.forecast;
      const bandwidths = [];

      for (let i = 0; i < forecast.length; i++) {
        const point = forecast[i];
        const bandwidth = (point.high - point.low) / point.avg;
        bandwidths.push(bandwidth);
      }

      const avgBandwidth =
        bandwidths.reduce((sum, val) => sum + val, 0) / bandwidths.length;
      const currentBandwidth = bandwidths[bandwidths.length - 1];

      // Detect squeeze (low volatility periods)
      const isSqueeze = currentBandwidth < avgBandwidth * 0.7;
      const squeezeIntensity = isSqueeze
        ? (avgBandwidth * 0.7 - currentBandwidth) / (avgBandwidth * 0.7)
        : 0;

      // Detect expansion (high volatility periods)
      const isExpansion = currentBandwidth > avgBandwidth * 1.3;
      const expansionIntensity = isExpansion
        ? (currentBandwidth - avgBandwidth * 1.3) / (avgBandwidth * 1.3)
        : 0;

      // Calculate squeeze duration
      let squeezeDuration = 0;
      for (let i = bandwidths.length - 1; i >= 0; i--) {
        if (bandwidths[i] < avgBandwidth * 0.7) {
          squeezeDuration++;
        } else {
          break;
        }
      }

      const result = {
        bandwidths,
        avgBandwidth,
        currentBandwidth,
        isSqueeze,
        squeezeIntensity,
        isExpansion,
        expansionIntensity,
        squeezeDuration,
        breakoutPotential:
          squeezeDuration > 10
            ? "high"
            : squeezeDuration > 5
            ? "medium"
            : "low",
      };

      squeezeCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    };
  })();

  // Memoized breakout direction analysis (equivalent to useCallback)
  private analyzeBreakoutDirection = (() => {
    const directionCache = new Map<
      string,
      { result: any; timestamp: number }
    >();
    return (
      priceIndicator: IndicatorResult,
      volumeIndicator?: IndicatorResult,
      momentumIndicator?: IndicatorResult
    ) => {
      const cacheKey = `direction:${priceIndicator.name}:${
        volumeIndicator?.name || "none"
      }:${momentumIndicator?.name || "none"}`;
      const cached = directionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 60000) {
        // 1 minute cache
        return cached.result;
      }

      const priceTrend = calculateTrend(priceIndicator.forecast);
      const priceVolatility = calculateVolatility(priceIndicator.forecast);

      let volumeConfirmation = 0.5; // Default neutral
      let momentumConfirmation = 0.5; // Default neutral

      // Volume analysis
      if (volumeIndicator) {
        const volumeTrend = calculateTrend(volumeIndicator.forecast);
        const volumeVolatility = calculateVolatility(volumeIndicator.forecast);

        if (volumeTrend === "bullish" && volumeVolatility > 0.02) {
          volumeConfirmation = 0.8;
        } else if (volumeTrend === "bearish" && volumeVolatility > 0.02) {
          volumeConfirmation = 0.2;
        }
      }

      // Momentum analysis
      if (momentumIndicator) {
        const momentumTrend = calculateTrend(momentumIndicator.forecast);
        const momentumValues = momentumIndicator.forecast.map((f) => f.avg);
        const momentumChange =
          momentumValues.length > 1
            ? (momentumValues[momentumValues.length - 1] -
                momentumValues[momentumValues.length - 2]) /
              Math.abs(momentumValues[momentumValues.length - 2])
            : 0;

        if (momentumTrend === "bullish" && momentumChange > 0.01) {
          momentumConfirmation = 0.8;
        } else if (momentumTrend === "bearish" && momentumChange < -0.01) {
          momentumConfirmation = 0.2;
        }
      }

      // Combined direction analysis
      const combinedSignal =
        ((priceTrend === "bullish"
          ? 0.7
          : priceTrend === "bearish"
          ? 0.3
          : 0.5) +
          volumeConfirmation +
          momentumConfirmation) /
        3;

      const result = {
        priceTrend,
        priceVolatility,
        volumeConfirmation,
        momentumConfirmation,
        combinedSignal,
        directionConfidence: Math.abs(combinedSignal - 0.5) * 2,
        predictedDirection:
          combinedSignal > 0.6
            ? "bullish"
            : combinedSignal < 0.4
            ? "bearish"
            : "neutral",
      };

      directionCache.set(cacheKey, { result, timestamp: Date.now() });
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

    // Find relevant indicators
    const bollingerIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("bollinger")
    );
    const priceIndicator =
      indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
      indicators[0];
    const volumeIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes("vwap")
    );
    const momentumIndicator =
      indicators.find((ind) => ind.name.toLowerCase().includes("macd")) ||
      indicators.find((ind) => ind.name.toLowerCase().includes("rsi"));

    if (!bollingerIndicator) {
      throw new Error(
        "Volatility Breakout strategy requires Bollinger Bands indicator"
      );
    }

    const reasons: string[] = [];
    let confidenceScore = 0;
    let recommendation: "buy" | "sell" | "neutral" = "neutral";

    // Analyze volatility patterns
    const volatilityAnalysis = this.analyzeVolatilityPattern(
      priceIndicator,
      config.lookbackPeriod
    );

    // Analyze Bollinger Band squeeze
    const squeezeAnalysis = this.analyzeBollingerSqueeze(
      bollingerIndicator,
      config.lookbackPeriod
    );

    // Analyze breakout direction
    const directionAnalysis = this.analyzeBreakoutDirection(
      priceIndicator,
      volumeIndicator,
      momentumIndicator
    );

    // Volatility compression signals (setup for breakout)
    if (volatilityAnalysis.isCompression && squeezeAnalysis.isSqueeze) {
      reasons.push(
        `Volatility compression detected - potential breakout setup (compression: ${volatilityAnalysis.compressionPhase.length} periods)`
      );
      confidenceScore += 0.3;

      if (squeezeAnalysis.breakoutPotential === "high") {
        reasons.push(
          `Extended volatility squeeze (${squeezeAnalysis.squeezeDuration} periods) - high breakout potential`
        );
        confidenceScore += 0.2;
      }
    }

    // Volatility expansion signals (breakout in progress)
    if (volatilityAnalysis.isExpansion || squeezeAnalysis.isExpansion) {
      reasons.push(
        `Volatility expansion detected - breakout in progress (expansion ratio: ${(
          volatilityAnalysis.volatilityRatio * 100
        ).toFixed(0)}%)`
      );
      confidenceScore += 0.4;

      // Determine direction based on analysis
      if (directionAnalysis.predictedDirection === "bullish") {
        recommendation = "buy";
        reasons.push(
          `Bullish breakout direction (confidence: ${(
            directionAnalysis.directionConfidence * 100
          ).toFixed(0)}%)`
        );
      } else if (directionAnalysis.predictedDirection === "bearish") {
        recommendation = "sell";
        reasons.push(
          `Bearish breakout direction (confidence: ${(
            directionAnalysis.directionConfidence * 100
          ).toFixed(0)}%)`
        );
      }
    }

    // ATR confirmation
    if (volatilityAnalysis.atrRatio > 1.2) {
      reasons.push(
        `ATR expansion confirms volatility breakout (ratio: ${(
          volatilityAnalysis.atrRatio * 100
        ).toFixed(0)}%)`
      );
      confidenceScore += 0.15;
    }

    // Volume confirmation
    if (directionAnalysis.volumeConfirmation > 0.6) {
      reasons.push(
        `Volume supporting breakout direction (confirmation: ${(
          directionAnalysis.volumeConfirmation * 100
        ).toFixed(0)}%)`
      );
      confidenceScore += 0.2;
    }

    // Momentum confirmation
    if (directionAnalysis.momentumConfirmation > 0.6) {
      reasons.push(
        `Momentum supporting breakout direction (confirmation: ${(
          directionAnalysis.momentumConfirmation * 100
        ).toFixed(0)}%)`
      );
      confidenceScore += 0.15;
    }

    // Setup phase (compression without clear direction)
    if (volatilityAnalysis.isCompression && recommendation === "neutral") {
      recommendation = "neutral";
      reasons.push(
        "Volatility compression phase - awaiting directional breakout"
      );
      confidenceScore = Math.max(confidenceScore, 0.4);
    }

    // Generate forecast based on volatility expectations
    const forecast = this.generateVolatilityForecast(
      indicators,
      config,
      recommendation,
      volatilityAnalysis
    );

    // Cap confidence score at 1.0
    confidenceScore = Math.min(confidenceScore, 1.0);

    // Adjust confidence based on market conditions
    if (reasons.length === 0) {
      recommendation = "neutral";
      confidenceScore = 0.1;
      reasons.push("No clear volatility patterns detected");
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
  private generateVolatilityForecast = (() => {
    const forecastCache = new Map<
      string,
      { result: ForecastPoint[]; timestamp: number }
    >();
    return (
      indicators: IndicatorResult[],
      config: StrategyConfig,
      direction: "buy" | "sell" | "neutral",
      volatilityAnalysis: any
    ): ForecastPoint[] => {
      const cacheKey = `forecast:${config.symbol}:${config.forecastDays}:${direction}:${volatilityAnalysis.volatilityRatio}`;
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

        // Volatility breakout patterns
        let volatilityFactor = 1;
        const breakoutPhase = Math.min(7, config.forecastDays / 2);

        if (volatilityAnalysis.isExpansion) {
          // Strong initial move with gradual normalization
          if (direction === "buy") {
            volatilityFactor =
              day <= breakoutPhase
                ? 1 + (day / breakoutPhase) * 0.12
                : 1 +
                  0.12 *
                    (1 -
                      ((day - breakoutPhase) /
                        (config.forecastDays - breakoutPhase)) *
                        0.4);
          } else if (direction === "sell") {
            volatilityFactor =
              day <= breakoutPhase
                ? 1 - (day / breakoutPhase) * 0.12
                : 1 -
                  0.12 *
                    (1 -
                      ((day - breakoutPhase) /
                        (config.forecastDays - breakoutPhase)) *
                        0.4);
          }
        } else if (volatilityAnalysis.isCompression) {
          // Compression phase with potential breakout
          const compressionFactor =
            1 - volatilityAnalysis.compressionPhase.strength * 0.02;
          volatilityFactor = compressionFactor;
        }

        // Higher volatility for breakout scenarios
        const baseVolatility = volatilityAnalysis.isExpansion ? 0.15 : 0.08;
        const volatilityMultiplier = 1 + (Math.random() - 0.5) * baseVolatility;

        forecast.push({
          day,
          high: basePoint.high * volatilityFactor * volatilityMultiplier,
          low: basePoint.low * volatilityFactor * volatilityMultiplier,
          avg: basePoint.avg * volatilityFactor,
          confidence:
            basePoint.confidence * (0.9 - (day / config.forecastDays) * 0.2),
          indicator: `${this.name}_Volatility`,
        });
      }

      forecastCache.set(cacheKey, { result: forecast, timestamp: Date.now() });
      return forecast;
    };
  })();

  private calculateHistoricalAccuracy(indicators: IndicatorResult[]): number {
    // Calculate accuracy based on indicator quality and volatility pattern success
    const avgAccuracy =
      indicators.reduce((sum, ind) => sum + ind.accuracy, 0) /
      indicators.length;

    // Volatility breakout strategies have good accuracy when conditions are right (70-85%)
    return Math.min(avgAccuracy * 0.9, 0.85);
  }

  private calculateWeight(confidenceScore: number): number {
    // Weight based on confidence and strategy characteristics
    const baseWeight = 0.75; // Volatility breakout gets good weight
    return Math.min(baseWeight * confidenceScore, 0.9);
  }
}
