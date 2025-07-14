import { ForecastPoint, IndicatorResult } from "../indicators";
/**
 * Merge multiple indicator forecasts into a single weighted average forecast
 * @param indicators - Array of indicator results with their forecasts
 * @param days - Number of days to forecast
 * @returns Unified ForecastPoint[] with averaged values
 */
export declare function mergeForecasts(indicators: IndicatorResult[], days: number): ForecastPoint[];
/**
 * Calculate additional statistics for the merged forecast
 * @param mergedForecast - The merged forecast points
 * @param indicators - The original indicator results
 * @returns Statistics object with analysis
 */
export declare function calculateMergedForecastStats(mergedForecast: ForecastPoint[], indicators: IndicatorResult[]): {
    totalWeight: number;
    avgConfidence: number;
    priceRange: {
        high: number;
        low: number;
        spread: number;
    };
    trend: {
        direction: string;
        strength: number;
    };
    contributingIndicators: number;
    forecastDays: number;
};
/**
 * Get merged forecast cache statistics
 * @returns Cache statistics object
 */
export declare function getMergedForecastCacheStats(): {
    size: number;
    maxSize: number;
    entries: {
        key: string;
        timestamp: number;
        expires: number;
        age: number;
    }[];
};
/**
 * Clear merged forecast cache
 */
export declare function clearMergedForecastCache(): void;
/**
 * Debug merged forecast cache contents
 */
export declare function debugMergedForecastCacheContents(): void;
//# sourceMappingURL=mergeForecasts.d.ts.map