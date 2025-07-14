import { IndicatorResult } from "../indicators";
export declare function plotIndicatorForecast(indicator: IndicatorResult): string;
export declare function plotCombinedForecast(indicators: IndicatorResult[], weightedForecast: Array<{
    day: number;
    high: number;
    low: number;
    avg: number;
    confidence: number;
}>): string;
export declare function plotAllIndicators(indicators: IndicatorResult[]): string;
export declare function getChartCacheStats(): {
    chartCache: number;
    maxCacheSize: number;
    cacheDuration: number;
};
export declare function clearChartCaches(): void;
export declare function plotPriceComparison(currentPrice: number, forecastPrices: number[], symbol: string): string;
export declare function debugChartCacheContents(): void;
//# sourceMappingURL=plotForecast.d.ts.map