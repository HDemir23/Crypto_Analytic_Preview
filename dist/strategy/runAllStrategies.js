"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllStrategies = runAllStrategies;
exports.runSelectedStrategy = runSelectedStrategy;
exports.getCombinedStrategyCacheStats = getCombinedStrategyCacheStats;
exports.clearAllStrategyCaches = clearAllStrategyCaches;
exports.debugAllStrategyCaches = debugAllStrategyCaches;
exports.getStrategyPerformanceMetrics = getStrategyPerformanceMetrics;
const forecast_1 = require("../forecast");
const index_1 = require("./index");
const types_1 = require("./types");
// Memoized strategy execution cache (equivalent to useMemo)
const combinedResultCache = new Map();
// Cache configuration
const COMBINED_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_COMBINED_CACHE_SIZE = 10;
// Cache cleanup function (equivalent to useCallback)
const cleanupCombinedCache = (() => {
    let lastCleanup = 0;
    return () => {
        const now = Date.now();
        if (now - lastCleanup < 30000)
            return; // Only cleanup every 30 seconds
        lastCleanup = now;
        for (const [key, value] of combinedResultCache.entries()) {
            if (now > value.expires) {
                combinedResultCache.delete(key);
            }
        }
        if (combinedResultCache.size > MAX_COMBINED_CACHE_SIZE) {
            const entries = Array.from(combinedResultCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = entries.slice(0, combinedResultCache.size - MAX_COMBINED_CACHE_SIZE);
            toRemove.forEach(([key]) => combinedResultCache.delete(key));
        }
    };
})();
// Generate cache key for combined results
function generateCombinedCacheKey(indicators, config) {
    const indicatorSignature = indicators
        .map((ind) => `${ind.name}:${ind.accuracy}:${ind.weight}:${ind.forecast.length}`)
        .join("|");
    const configSignature = `${config.symbol}:${config.forecastDays}:${config.lookbackPeriod}:${config.sensitivity}:${config.riskLevel}`;
    return `combined:${configSignature}:${indicatorSignature}`;
}
// Get cached combined result (equivalent to useMemo)
function getCachedCombinedResult(cacheKey) {
    cleanupCombinedCache();
    const cached = combinedResultCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
        return cached.result;
    }
    return null;
}
// Set cached combined result (equivalent to useMemo)
function setCachedCombinedResult(cacheKey, result) {
    cleanupCombinedCache();
    combinedResultCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        expires: Date.now() + COMBINED_CACHE_DURATION,
    });
}
// Memoized signal combination logic (equivalent to useCallback)
const combineSignals = (() => {
    const signalCache = new Map();
    return (results) => {
        const cacheKey = results
            .map((r) => `${r.name}:${r.signal.recommendation}:${r.signal.confidenceScore}`)
            .join("|");
        const cached = signalCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 30000) {
            // 30 second cache
            return cached.result;
        }
        const validResults = results.filter((r) => r.signal.confidenceScore > 0.1);
        if (validResults.length === 0) {
            const neutralSignal = {
                recommendation: "neutral",
                reasons: ["No strategies provided valid signals"],
                confidenceScore: 0.1,
                timestamp: Date.now(),
                strategy: "Combined Strategy",
            };
            signalCache.set(cacheKey, {
                result: neutralSignal,
                timestamp: Date.now(),
            });
            return neutralSignal;
        }
        // Weight signals by confidence and strategy weight
        let weightedBuyScore = 0;
        let weightedSellScore = 0;
        let totalWeight = 0;
        const combinedReasons = [];
        for (const result of validResults) {
            const signal = result.signal;
            const effectiveWeight = signal.confidenceScore * result.weight;
            if (signal.recommendation === "buy") {
                weightedBuyScore += effectiveWeight;
            }
            else if (signal.recommendation === "sell") {
                weightedSellScore += effectiveWeight;
            }
            totalWeight += effectiveWeight;
            // Add significant reasons
            if (signal.confidenceScore > 0.5) {
                combinedReasons.push(`${result.name}: ${signal.reasons[0] || "Signal detected"}`);
            }
        }
        // Normalize scores
        const normalizedBuyScore = totalWeight > 0 ? weightedBuyScore / totalWeight : 0;
        const normalizedSellScore = totalWeight > 0 ? weightedSellScore / totalWeight : 0;
        // Determine final recommendation
        let recommendation;
        let confidenceScore;
        if (normalizedBuyScore > normalizedSellScore && normalizedBuyScore > 0.3) {
            recommendation = "buy";
            confidenceScore = normalizedBuyScore;
        }
        else if (normalizedSellScore > normalizedBuyScore &&
            normalizedSellScore > 0.3) {
            recommendation = "sell";
            confidenceScore = normalizedSellScore;
        }
        else {
            recommendation = "neutral";
            confidenceScore = Math.max(normalizedBuyScore, normalizedSellScore) * 0.5;
        }
        // Add consensus information
        const buyCount = validResults.filter((r) => r.signal.recommendation === "buy").length;
        const sellCount = validResults.filter((r) => r.signal.recommendation === "sell").length;
        const neutralCount = validResults.filter((r) => r.signal.recommendation === "neutral").length;
        combinedReasons.unshift(`Strategy consensus: ${buyCount} buy, ${sellCount} sell, ${neutralCount} neutral`);
        const combinedSignal = {
            recommendation,
            reasons: combinedReasons,
            confidenceScore: Math.min(confidenceScore, 1.0),
            timestamp: Date.now(),
            strategy: "Combined Strategy",
        };
        signalCache.set(cacheKey, {
            result: combinedSignal,
            timestamp: Date.now(),
        });
        return combinedSignal;
    };
})();
// Main function to run all strategies
async function runAllStrategies(indicators, config = {}) {
    const startTime = Date.now();
    // Create full configuration with defaults
    const fullConfig = (0, index_1.createStrategyConfig)(config);
    // Check cache first
    const cacheKey = generateCombinedCacheKey(indicators, fullConfig);
    const cachedResult = getCachedCombinedResult(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    // Get all available strategies
    const strategies = (0, index_1.getAllStrategies)();
    // Run all strategies in parallel for better performance
    const strategyPromises = strategies.map(async (strategy) => {
        try {
            return await strategy.execute(indicators, fullConfig);
        }
        catch (error) {
            console.warn(`Strategy ${strategy.name} failed:`, error);
            return null;
        }
    });
    const results = await Promise.all(strategyPromises);
    const validResults = results.filter(Boolean);
    if (validResults.length === 0) {
        throw new Error("No strategies executed successfully");
    }
    // Combine signals using memoized logic
    const combinedSignal = combineSignals(validResults);
    // Merge forecasts using existing merge logic
    const combinedForecast = (0, forecast_1.mergeForecasts)(validResults, fullConfig.forecastDays);
    // Calculate consensus information
    const buySignals = validResults.filter((r) => r.signal.recommendation === "buy").length;
    const sellSignals = validResults.filter((r) => r.signal.recommendation === "sell").length;
    const neutralSignals = validResults.filter((r) => r.signal.recommendation === "neutral").length;
    const avgConfidence = validResults.reduce((sum, r) => sum + r.signal.confidenceScore, 0) /
        validResults.length;
    const strongestSignal = validResults.reduce((strongest, current) => current.signal.confidenceScore > strongest.signal.confidenceScore
        ? current
        : strongest);
    // Calculate performance metrics
    const totalExecutionTime = Date.now() - startTime;
    const avgAccuracy = validResults.reduce((sum, r) => sum + r.accuracy, 0) / validResults.length;
    const totalWeight = validResults.reduce((sum, r) => sum + r.weight, 0);
    const combinedResult = {
        individualResults: validResults,
        combinedSignal,
        combinedForecast,
        consensus: {
            buySignals,
            sellSignals,
            neutralSignals,
            avgConfidence,
            strongestSignal,
        },
        performance: {
            totalExecutionTime,
            avgAccuracy,
            totalWeight,
            strategyCount: validResults.length,
        },
    };
    // Cache the result
    setCachedCombinedResult(cacheKey, combinedResult);
    return combinedResult;
}
// Get specific strategy result by name
async function runSelectedStrategy(strategyName, indicators, config = {}) {
    const strategies = (0, index_1.getAllStrategies)();
    const strategy = strategies.find((s) => s.name === strategyName);
    if (!strategy) {
        throw new Error(`Strategy '${strategyName}' not found. Available strategies: ${strategies
            .map((s) => s.name)
            .join(", ")}`);
    }
    const fullConfig = (0, index_1.createStrategyConfig)(config);
    return await strategy.execute(indicators, fullConfig);
}
// Utility functions for cache management
function getCombinedStrategyCacheStats() {
    return {
        size: combinedResultCache.size,
        maxSize: MAX_COMBINED_CACHE_SIZE,
        cacheDuration: COMBINED_CACHE_DURATION,
        individualCacheStats: (0, types_1.getStrategyCacheStats)(),
    };
}
function clearAllStrategyCaches() {
    combinedResultCache.clear();
    (0, types_1.clearStrategyCache)();
}
function debugAllStrategyCaches() {
    console.log("Combined Strategy Cache Contents:");
    for (const [key, value] of combinedResultCache.entries()) {
        console.log(`  ${key}: expires in ${value.expires - Date.now()}ms`);
    }
    console.log("\nIndividual Strategy Caches:");
    (0, types_1.debugStrategyCacheContents)();
}
// Performance monitoring
function getStrategyPerformanceMetrics() {
    // This would be implemented with actual performance tracking
    return {
        cacheHitRate: 0.8, // 80% cache hit rate
        avgExecutionTime: 150, // 150ms average
        memoryUsage: combinedResultCache.size * 1024, // Rough estimate
    };
}
//# sourceMappingURL=runAllStrategies.js.map