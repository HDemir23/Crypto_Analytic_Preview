import { IndicatorResult, ForecastPoint } from "../indicators";
export interface ExportConfig {
    format: "json" | "csv" | "both";
    filename?: string;
    includeIndividualIndicators?: boolean;
    includeMetadata?: boolean;
}
export interface ExportMetadata {
    symbol: string;
    forecastDays: number;
    historicalDays: number;
    generatedAt: string;
    indicatorsUsed: string[];
    totalWeight: number;
    avgConfidence: number;
    priceRange: {
        current: number;
        target: number;
        change: number;
        changePercent: number;
    };
}
export interface ForecastExportData {
    metadata: ExportMetadata;
    combinedForecast: ForecastPoint[];
    individualIndicators?: IndicatorResult[];
    performanceStats?: {
        cacheStats: any;
        executionTime: number;
        dataSource: string;
    };
}
/**
 * Export forecast data to file(s)
 * @param data - Complete forecast data to export
 * @param config - Export configuration options
 * @returns Array of created file paths
 */
export declare function exportForecast(data: ForecastExportData, config?: ExportConfig): Promise<string[]>;
/**
 * Create export metadata from indicators and forecast data
 * @param symbol - Cryptocurrency symbol
 * @param forecastDays - Number of forecast days
 * @param historicalDays - Number of historical days used
 * @param indicators - Array of indicator results
 * @param combinedForecast - Combined forecast data
 * @param currentPrice - Current price for comparison
 * @returns Export metadata object
 */
export declare function createExportMetadata(symbol: string, forecastDays: number, historicalDays: number, indicators: IndicatorResult[], combinedForecast: ForecastPoint[], currentPrice: number): ExportMetadata;
/**
 * Get export statistics
 * @returns Export statistics object
 */
export declare function getExportStats(): {
    exportDir: string;
    totalFiles: number;
    lastExport: string;
};
//# sourceMappingURL=exportForecast.d.ts.map