// Forecast module - Handles averaging multiple predictions
import { debug } from "../index";
import { ForecastPoint, IndicatorResult } from "../indicators";

// Export all functionality from mergeForecasts.ts
export {
  mergeForecasts,
  calculateMergedForecastStats,
  getMergedForecastCacheStats,
  clearMergedForecastCache,
  debugMergedForecastCacheContents,
} from "./mergeForecasts";

// Legacy compatibility wrapper (deprecated)
export function mergeForecasts_legacy(
  forecasts: ForecastPoint[][]
): ForecastPoint[] {
  debug.log(
    "⚠️  Using legacy mergeForecasts function - please migrate to new API"
  );
  // This is a simple average without weighting
  if (forecasts.length === 0) return [];

  const days = forecasts[0].length;
  const merged: ForecastPoint[] = [];

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
