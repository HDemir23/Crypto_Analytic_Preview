"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugMergedForecastCacheContents = exports.clearMergedForecastCache = exports.getMergedForecastCacheStats = exports.calculateMergedForecastStats = exports.mergeForecasts = void 0;
exports.mergeForecasts_legacy = mergeForecasts_legacy;
// Forecast module - Handles averaging multiple predictions
const index_1 = require("../index");
// Export all functionality from mergeForecasts.ts
var mergeForecasts_1 = require("./mergeForecasts");
Object.defineProperty(exports, "mergeForecasts", { enumerable: true, get: function () { return mergeForecasts_1.mergeForecasts; } });
Object.defineProperty(exports, "calculateMergedForecastStats", { enumerable: true, get: function () { return mergeForecasts_1.calculateMergedForecastStats; } });
Object.defineProperty(exports, "getMergedForecastCacheStats", { enumerable: true, get: function () { return mergeForecasts_1.getMergedForecastCacheStats; } });
Object.defineProperty(exports, "clearMergedForecastCache", { enumerable: true, get: function () { return mergeForecasts_1.clearMergedForecastCache; } });
Object.defineProperty(exports, "debugMergedForecastCacheContents", { enumerable: true, get: function () { return mergeForecasts_1.debugMergedForecastCacheContents; } });
// Legacy compatibility wrapper (deprecated)
function mergeForecasts_legacy(forecasts) {
    index_1.debug.log("⚠️  Using legacy mergeForecasts function - please migrate to new API");
    // This is a simple average without weighting
    if (forecasts.length === 0)
        return [];
    const days = forecasts[0].length;
    const merged = [];
    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
        let totalHigh = 0;
        let totalLow = 0;
        let totalAvg = 0;
        let totalConfidence = 0;
        let count = 0;
        forecasts.forEach((forecast) => {
            if (forecast[dayIdx]) {
                totalHigh += forecast[dayIdx].high;
                totalLow += forecast[dayIdx].low;
                totalAvg += forecast[dayIdx].avg;
                totalConfidence += forecast[dayIdx].confidence;
                count++;
            }
        });
        if (count > 0) {
            merged.push({
                day: dayIdx + 1,
                high: totalHigh / count,
                low: totalLow / count,
                avg: totalAvg / count,
                confidence: totalConfidence / count,
                indicator: "SIMPLE_AVERAGE",
            });
        }
    }
    return merged;
}
//# sourceMappingURL=index.js.map