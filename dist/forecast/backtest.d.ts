export interface BacktestConfig {
    periods: number;
    forecastDays: number;
    historicalRange: number;
    minDataPoints?: number;
}
export interface BacktestResult {
    period: number;
    startDate: string;
    endDate: string;
    actualPrices: number[];
    predictedPrices: number[];
    accuracy: number;
    avgError: number;
    maxError: number;
    indicators: {
        name: string;
        accuracy: number;
        avgError: number;
    }[];
}
export interface BacktestAnalysis {
    symbol: string;
    totalPeriods: number;
    forecastDays: number;
    overallAccuracy: number;
    avgError: number;
    maxError: number;
    minError: number;
    results: BacktestResult[];
    indicatorPerformance: {
        [key: string]: {
            accuracy: number;
            avgError: number;
            reliability: number;
            rank: number;
        };
    };
    recommendations: string[];
}
/**
 * Run comprehensive backtest analysis
 * @param symbol - Cryptocurrency symbol
 * @param config - Backtest configuration
 * @returns Complete backtest analysis
 */
export declare function runBacktest(symbol: string, config: BacktestConfig): Promise<BacktestAnalysis>;
/**
 * Display backtest results in a formatted console output
 * @param analysis - Complete backtest analysis
 */
export declare function displayBacktestResults(analysis: BacktestAnalysis): void;
//# sourceMappingURL=backtest.d.ts.map