"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStrategyCache = void 0;
exports.generateStrategyCacheKey = generateStrategyCacheKey;
exports.getCachedStrategyResult = getCachedStrategyResult;
exports.setCachedStrategyResult = setCachedStrategyResult;
exports.getStrategyCacheStats = getStrategyCacheStats;
exports.clearStrategyCache = clearStrategyCache;
exports.debugStrategyCacheContents = debugStrategyCacheContents;
exports.calculateIndicatorSignature = calculateIndicatorSignature;
exports.calculateAveragePrice = calculateAveragePrice;
exports.calculateTrend = calculateTrend;
exports.calculateVolatility = calculateVolatility;
// Performance: Cache for strategy calculations (equivalent to useMemo)
const strategyCache = new Map();
// Cache configuration
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for strategies
const MAX_CACHE_SIZE = 30;
// Cache cleanup function (equivalent to useCallback)
exports.cleanupStrategyCache = (() => {
    let lastCleanup = 0;
    return () => {
        const now = Date.now();
        // Only cleanup every 30 seconds to avoid excessive work
        if (now - lastCleanup < 30000)
            return;
        lastCleanup = now;
        for (const [key, value] of strategyCache.entries()) {
            if (now > value.expires) {
                strategyCache.delete(key);
            }
        }
        // If still too many entries, remove oldest
        if (strategyCache.size > MAX_CACHE_SIZE) {
            const entries = Array.from(strategyCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            const toRemove = entries.slice(0, strategyCache.size - MAX_CACHE_SIZE);
            toRemove.forEach(([key]) => strategyCache.delete(key));
        }
    };
})();
// Generate cache key for strategies
function generateStrategyCacheKey(strategyName, config, indicatorsSignature) {
    const configSignature = `${config.symbol}:${config.forecastDays}:${config.lookbackPeriod || "default"}:${config.sensitivity || "default"}:${config.riskLevel || "medium"}`;
    return `strategy:${strategyName}:${configSignature}:${indicatorsSignature}`;
}
// Get cached strategy result (equivalent to useMemo)
function getCachedStrategyResult(cacheKey) {
    (0, exports.cleanupStrategyCache)();
    const cached = strategyCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
        return cached.result;
    }
    return null;
}
// Set cached strategy result (equivalent to useMemo)
function setCachedStrategyResult(cacheKey, result) {
    (0, exports.cleanupStrategyCache)();
    strategyCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        expires: Date.now() + CACHE_DURATION,
    });
}
// Get strategy cache stats
function getStrategyCacheStats() {
    return {
        size: strategyCache.size,
        maxSize: MAX_CACHE_SIZE,
        cacheDuration: CACHE_DURATION,
        hitRate: 0, // Can be calculated based on usage
    };
}
// Clear strategy cache
function clearStrategyCache() {
    strategyCache.clear();
}
// Debug strategy cache contents
function debugStrategyCacheContents() {
    console.log("Strategy Cache Contents:");
    for (const [key, value] of strategyCache.entries()) {
        console.log(`  ${key}: expires in ${value.expires - Date.now()}ms`);
    }
}
// Utility functions for strategy calculations
function calculateIndicatorSignature(indicators) {
    return indicators
        .map((ind) => `${ind.name}:${ind.accuracy.toFixed(2)}:${ind.weight.toFixed(2)}:${ind.forecast.length}`)
        .join("|");
}
// Helper function to calculate average from forecast points
function calculateAveragePrice(forecasts) {
    if (forecasts.length === 0)
        return 0;
    return (forecasts.reduce((sum, point) => sum + point.avg, 0) / forecasts.length);
}
// Helper function to calculate trend from forecast points
function calculateTrend(forecasts) {
    if (forecasts.length < 2)
        return "neutral";
    const firstHalf = forecasts.slice(0, Math.floor(forecasts.length / 2));
    const secondHalf = forecasts.slice(Math.floor(forecasts.length / 2));
    const firstAvg = calculateAveragePrice(firstHalf);
    const secondAvg = calculateAveragePrice(secondHalf);
    const change = (secondAvg - firstAvg) / firstAvg;
    if (change > 0.02)
        return "bullish";
    if (change < -0.02)
        return "bearish";
    return "neutral";
}
// Helper function to calculate volatility from forecast points
function calculateVolatility(forecasts) {
    if (forecasts.length < 2)
        return 0;
    const prices = forecasts.map((f) => f.avg);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
        prices.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
}
//# sourceMappingURL=types.js.map