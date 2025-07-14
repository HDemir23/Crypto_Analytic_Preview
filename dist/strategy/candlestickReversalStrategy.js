"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandlestickReversalStrategy = void 0;
const types_1 = require("./types");
class CandlestickReversalStrategy {
    constructor() {
        this.name = "Candlestick Reversal";
        this.description = "Identifies reversal patterns using candlestick formations like doji, hammer, shooting star, and engulfing patterns";
        // Memoized candlestick pattern recognition (equivalent to useCallback)
        this.recognizePatterns = (() => {
            const patternCache = new Map();
            return (priceData, lookbackPeriod = 10) => {
                const cacheKey = `patterns:${priceData.length}:${lookbackPeriod}`;
                const cached = patternCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < 60000) {
                    // 1 minute cache
                    return cached.result;
                }
                const patterns = [];
                for (let i = 2; i < priceData.length; i++) {
                    const current = priceData[i];
                    const previous = priceData[i - 1];
                    const prev2 = priceData[i - 2];
                    // Calculate body and shadow sizes
                    const bodySize = Math.abs(current.avg - previous.avg);
                    const upperShadow = current.high - Math.max(current.avg, previous.avg);
                    const lowerShadow = Math.min(current.avg, previous.avg) - current.low;
                    const totalRange = current.high - current.low;
                    // Doji pattern (small body, long shadows)
                    if (bodySize < totalRange * 0.1 && totalRange > 0) {
                        patterns.push({
                            name: "Doji",
                            type: this.determineDojiBias(current, previous, prev2),
                            confidence: 0.6,
                            description: "Indecision candle with small body and long shadows",
                            day: i,
                        });
                    }
                    // Hammer pattern (small body at top, long lower shadow)
                    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
                        patterns.push({
                            name: "Hammer",
                            type: "bullish",
                            confidence: 0.7,
                            description: "Bullish reversal with long lower shadow",
                            day: i,
                        });
                    }
                    // Shooting Star pattern (small body at bottom, long upper shadow)
                    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
                        patterns.push({
                            name: "Shooting Star",
                            type: "bearish",
                            confidence: 0.7,
                            description: "Bearish reversal with long upper shadow",
                            day: i,
                        });
                    }
                    // Engulfing patterns (requires 2 candles)
                    if (i >= 1) {
                        const prevBodySize = Math.abs(previous.avg - priceData[i - 2]?.avg || previous.avg);
                        // Bullish engulfing
                        if (current.avg > previous.avg && bodySize > prevBodySize * 1.2) {
                            patterns.push({
                                name: "Bullish Engulfing",
                                type: "bullish",
                                confidence: 0.8,
                                description: "Bullish candle engulfs previous bearish candle",
                                day: i,
                            });
                        }
                        // Bearish engulfing
                        if (current.avg < previous.avg && bodySize > prevBodySize * 1.2) {
                            patterns.push({
                                name: "Bearish Engulfing",
                                type: "bearish",
                                confidence: 0.8,
                                description: "Bearish candle engulfs previous bullish candle",
                                day: i,
                            });
                        }
                    }
                    // Morning/Evening Star patterns (requires 3 candles)
                    if (i >= 2) {
                        const star = this.recognizeStarPattern(priceData.slice(i - 2, i + 1));
                        if (star) {
                            patterns.push({
                                ...star,
                                day: i,
                            });
                        }
                    }
                }
                // Filter to recent patterns
                const recentPatterns = patterns.filter((p) => p.day >= priceData.length - lookbackPeriod);
                patternCache.set(cacheKey, {
                    result: recentPatterns,
                    timestamp: Date.now(),
                });
                return recentPatterns;
            };
        })();
        // Memoized pattern strength analysis (equivalent to useCallback)
        this.analyzePatternStrength = (() => {
            const strengthCache = new Map();
            return (patterns, priceData, volumeIndicator) => {
                const cacheKey = `strength:${patterns.length}:${priceData.length}:${volumeIndicator?.name || "none"}`;
                const cached = strengthCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < 60000) {
                    // 1 minute cache
                    return cached.result;
                }
                const bullishPatterns = patterns.filter((p) => p.type === "bullish");
                const bearishPatterns = patterns.filter((p) => p.type === "bearish");
                // Calculate pattern concentration
                const totalPatterns = patterns.length;
                const bullishConcentration = bullishPatterns.length / totalPatterns;
                const bearishConcentration = bearishPatterns.length / totalPatterns;
                // Calculate weighted confidence
                const bullishConfidence = bullishPatterns.length > 0
                    ? bullishPatterns.reduce((sum, p) => sum + p.confidence, 0) /
                        bullishPatterns.length
                    : 0;
                const bearishConfidence = bearishPatterns.length > 0
                    ? bearishPatterns.reduce((sum, p) => sum + p.confidence, 0) /
                        bearishPatterns.length
                    : 0;
                // Volume confirmation if available
                let volumeConfirmation = 0.5; // Default neutral
                if (volumeIndicator) {
                    const volumeTrend = (0, types_1.calculateTrend)(volumeIndicator.forecast);
                    const volumeVolatility = (0, types_1.calculateVolatility)(volumeIndicator.forecast);
                    // Higher volume with reversal patterns increases confidence
                    if (volumeVolatility > 0.02) {
                        volumeConfirmation = 0.7;
                    }
                }
                // Find strongest patterns
                const strongestBullish = bullishPatterns.length > 0
                    ? bullishPatterns.reduce((max, curr) => curr.confidence > max.confidence ? curr : max)
                    : null;
                const strongestBearish = bearishPatterns.length > 0
                    ? bearishPatterns.reduce((max, curr) => curr.confidence > max.confidence ? curr : max)
                    : null;
                const result = {
                    bullishPatterns,
                    bearishPatterns,
                    bullishConcentration,
                    bearishConcentration,
                    bullishConfidence,
                    bearishConfidence,
                    volumeConfirmation,
                    strongestBullish,
                    strongestBearish,
                    dominantSignal: bullishConcentration > bearishConcentration
                        ? "bullish"
                        : bearishConcentration > bullishConcentration
                            ? "bearish"
                            : "neutral",
                    signalStrength: Math.abs(bullishConcentration - bearishConcentration),
                };
                strengthCache.set(cacheKey, { result, timestamp: Date.now() });
                return result;
            };
        })();
        // Memoized trend context analysis (equivalent to useCallback)
        this.analyzeTrendContext = (() => {
            const trendCache = new Map();
            return (patterns, priceData, trendIndicator) => {
                const cacheKey = `context:${patterns.length}:${priceData.length}:${trendIndicator.name}`;
                const cached = trendCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < 60000) {
                    // 1 minute cache
                    return cached.result;
                }
                const currentTrend = (0, types_1.calculateTrend)(trendIndicator.forecast);
                const trendStrength = (0, types_1.calculateVolatility)(trendIndicator.forecast);
                // Reversal patterns are stronger against the prevailing trend
                const contextMultiplier = currentTrend === "bullish"
                    ? { bullish: 0.8, bearish: 1.2 }
                    : currentTrend === "bearish"
                        ? { bullish: 1.2, bearish: 0.8 }
                        : { bullish: 1.0, bearish: 1.0 };
                // Support/resistance levels
                const supportLevel = Math.min(...priceData.slice(-10).map((p) => p.low));
                const resistanceLevel = Math.max(...priceData.slice(-10).map((p) => p.high));
                const currentPrice = priceData[priceData.length - 1].avg;
                const nearSupport = (currentPrice - supportLevel) / supportLevel < 0.02;
                const nearResistance = (resistanceLevel - currentPrice) / currentPrice < 0.02;
                const result = {
                    currentTrend,
                    trendStrength,
                    contextMultiplier,
                    supportLevel,
                    resistanceLevel,
                    nearSupport,
                    nearResistance,
                    reversalLikelihood: nearSupport
                        ? "bullish"
                        : nearResistance
                            ? "bearish"
                            : "neutral",
                };
                trendCache.set(cacheKey, { result, timestamp: Date.now() });
                return result;
            };
        })();
        // Memoized forecast generation (equivalent to useMemo)
        this.generateReversalForecast = (() => {
            const forecastCache = new Map();
            return (indicators, config, direction, patterns) => {
                const cacheKey = `forecast:${config.symbol}:${config.forecastDays}:${direction}:${patterns.length}`;
                const cached = forecastCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < 120000) {
                    // 2 minute cache
                    return cached.result;
                }
                const forecast = [];
                const baseIndicator = indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
                    indicators[0];
                // Average pattern confidence
                const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
                for (let day = 1; day <= config.forecastDays; day++) {
                    const basePoint = baseIndicator.forecast.find((f) => f.day === day);
                    if (!basePoint)
                        continue;
                    // Reversal patterns typically have initial sharp moves followed by consolidation
                    let reversalFactor = 1;
                    const initialPeriod = Math.min(5, config.forecastDays / 3);
                    if (direction === "buy") {
                        reversalFactor =
                            day <= initialPeriod
                                ? 1 + (day / initialPeriod) * 0.06 * avgConfidence
                                : 1 +
                                    0.06 *
                                        avgConfidence *
                                        (1 -
                                            ((day - initialPeriod) /
                                                (config.forecastDays - initialPeriod)) *
                                                0.5);
                    }
                    else if (direction === "sell") {
                        reversalFactor =
                            day <= initialPeriod
                                ? 1 - (day / initialPeriod) * 0.06 * avgConfidence
                                : 1 -
                                    0.06 *
                                        avgConfidence *
                                        (1 -
                                            ((day - initialPeriod) /
                                                (config.forecastDays - initialPeriod)) *
                                                0.5);
                    }
                    // Add volatility based on pattern strength
                    const volatilityFactor = 1 + (Math.random() - 0.5) * 0.1 * avgConfidence;
                    forecast.push({
                        day,
                        high: basePoint.high * reversalFactor * volatilityFactor,
                        low: basePoint.low * reversalFactor * volatilityFactor,
                        avg: basePoint.avg * reversalFactor,
                        confidence: basePoint.confidence *
                            avgConfidence *
                            (0.9 - (day / config.forecastDays) * 0.3),
                        indicator: `${this.name}_Reversal`,
                    });
                }
                forecastCache.set(cacheKey, { result: forecast, timestamp: Date.now() });
                return forecast;
            };
        })();
    }
    // Helper method to determine doji bias based on context
    determineDojiBias(current, previous, prev2) {
        const recentTrend = current.avg > prev2.avg ? "uptrend" : "downtrend";
        // Doji in uptrend suggests bearish reversal
        if (recentTrend === "uptrend")
            return "bearish";
        // Doji in downtrend suggests bullish reversal
        return "bullish";
    }
    // Helper method to recognize star patterns
    recognizeStarPattern(candles) {
        if (candles.length < 3)
            return null;
        const [first, star, third] = candles;
        // Check for gap and small body in middle
        const starBodySize = Math.abs(star.avg - first.avg);
        const firstBodySize = Math.abs(first.avg - (candles[0]?.avg || first.avg));
        const thirdBodySize = Math.abs(third.avg - star.avg);
        if (starBodySize < firstBodySize * 0.5 &&
            starBodySize < thirdBodySize * 0.5) {
            // Morning Star (bullish)
            if (first.avg > star.avg &&
                third.avg > star.avg &&
                third.avg > first.avg) {
                return {
                    name: "Morning Star",
                    type: "bullish",
                    confidence: 0.85,
                    description: "Three-candle bullish reversal pattern",
                    day: 0, // Will be set by caller
                };
            }
            // Evening Star (bearish)
            if (first.avg < star.avg &&
                third.avg < star.avg &&
                third.avg < first.avg) {
                return {
                    name: "Evening Star",
                    type: "bearish",
                    confidence: 0.85,
                    description: "Three-candle bearish reversal pattern",
                    day: 0, // Will be set by caller
                };
            }
        }
        return null;
    }
    async execute(indicators, config) {
        const startTime = Date.now();
        const indicatorsSignature = (0, types_1.calculateIndicatorSignature)(indicators);
        const cacheKey = (0, types_1.generateStrategyCacheKey)(this.name, config, indicatorsSignature);
        // Check cache first (equivalent to useMemo)
        const cachedResult = (0, types_1.getCachedStrategyResult)(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }
        // Find relevant indicators
        const priceIndicator = indicators.find((ind) => ind.name.toLowerCase().includes("sma")) ||
            indicators[0];
        const volumeIndicator = indicators.find((ind) => ind.name.toLowerCase().includes("vwap"));
        const trendIndicator = indicators.find((ind) => ind.name.toLowerCase().includes("ema")) ||
            priceIndicator;
        const reasons = [];
        let confidenceScore = 0;
        let recommendation = "neutral";
        // Recognize candlestick patterns
        const patterns = this.recognizePatterns(priceIndicator.forecast, config.lookbackPeriod);
        if (patterns.length === 0) {
            return {
                signal: {
                    recommendation: "neutral",
                    reasons: ["No significant candlestick patterns detected"],
                    confidenceScore: 0.1,
                    timestamp: Date.now(),
                    strategy: this.name,
                },
                forecast: priceIndicator.forecast.map((f) => ({
                    ...f,
                    indicator: `${this.name}_Neutral`,
                })),
                name: this.name,
                accuracy: 0.5,
                weight: 0.3,
                executionTime: Date.now() - startTime,
            };
        }
        // Analyze pattern strength
        const patternAnalysis = this.analyzePatternStrength(patterns, priceIndicator.forecast, volumeIndicator);
        if (patternAnalysis.dominantSignal === "bullish") {
            const strongest = patternAnalysis.strongestBullish;
            reasons.push(`Bullish candlestick pattern: ${strongest.name} (confidence: ${(strongest.confidence * 100).toFixed(0)}%)`);
            confidenceScore += strongest.confidence * 0.6;
            recommendation = "buy";
            if (patternAnalysis.bullishConcentration > 0.7) {
                reasons.push(`Strong bullish pattern concentration (${(patternAnalysis.bullishConcentration * 100).toFixed(0)}%)`);
                confidenceScore += 0.2;
            }
        }
        else if (patternAnalysis.dominantSignal === "bearish") {
            const strongest = patternAnalysis.strongestBearish;
            reasons.push(`Bearish candlestick pattern: ${strongest.name} (confidence: ${(strongest.confidence * 100).toFixed(0)}%)`);
            confidenceScore += strongest.confidence * 0.6;
            recommendation = "sell";
            if (patternAnalysis.bearishConcentration > 0.7) {
                reasons.push(`Strong bearish pattern concentration (${(patternAnalysis.bearishConcentration * 100).toFixed(0)}%)`);
                confidenceScore += 0.2;
            }
        }
        // Analyze trend context for reversal confirmation
        const trendContext = this.analyzeTrendContext(patterns, priceIndicator.forecast, trendIndicator);
        if (recommendation === "buy") {
            confidenceScore *= trendContext.contextMultiplier.bullish;
            if (trendContext.nearSupport) {
                reasons.push(`Price near support level ($${trendContext.supportLevel.toFixed(2)}) - reversal potential`);
                confidenceScore += 0.15;
            }
        }
        else if (recommendation === "sell") {
            confidenceScore *= trendContext.contextMultiplier.bearish;
            if (trendContext.nearResistance) {
                reasons.push(`Price near resistance level ($${trendContext.resistanceLevel.toFixed(2)}) - reversal potential`);
                confidenceScore += 0.15;
            }
        }
        // Volume confirmation
        if (patternAnalysis.volumeConfirmation > 0.6) {
            reasons.push(`Volume supporting reversal pattern (confirmation: ${(patternAnalysis.volumeConfirmation * 100).toFixed(0)}%)`);
            confidenceScore += 0.1;
        }
        // Generate forecast based on reversal expectations
        const forecast = this.generateReversalForecast(indicators, config, recommendation, patterns);
        // Cap confidence score at 1.0
        confidenceScore = Math.min(confidenceScore, 1.0);
        // Pattern diversity bonus
        const uniquePatterns = new Set(patterns.map((p) => p.name)).size;
        if (uniquePatterns > 2) {
            confidenceScore = Math.min(confidenceScore * 1.1, 1.0);
            reasons.push(`Multiple pattern types detected (${uniquePatterns} different patterns)`);
        }
        const signal = {
            recommendation,
            reasons,
            confidenceScore,
            timestamp: Date.now(),
            strategy: this.name,
        };
        const result = {
            signal,
            forecast,
            name: this.name,
            accuracy: this.calculateHistoricalAccuracy(indicators),
            weight: this.calculateWeight(confidenceScore),
            executionTime: Date.now() - startTime,
        };
        // Cache the result (equivalent to useMemo)
        (0, types_1.setCachedStrategyResult)(cacheKey, result);
        return result;
    }
    calculateHistoricalAccuracy(indicators) {
        // Calculate accuracy based on indicator quality and pattern reliability
        const avgAccuracy = indicators.reduce((sum, ind) => sum + ind.accuracy, 0) /
            indicators.length;
        // Candlestick patterns have moderate accuracy but good for timing (65-75%)
        return Math.min(avgAccuracy * 0.85, 0.75);
    }
    calculateWeight(confidenceScore) {
        // Weight based on confidence and strategy characteristics
        const baseWeight = 0.6; // Candlestick patterns get moderate weight
        return Math.min(baseWeight * confidenceScore, 0.8);
    }
}
exports.CandlestickReversalStrategy = CandlestickReversalStrategy;
//# sourceMappingURL=candlestickReversalStrategy.js.map