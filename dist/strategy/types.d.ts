import { ForecastPoint, IndicatorResult } from "../indicators";
export interface TradeSignal {
    recommendation: "buy" | "sell" | "neutral";
    reasons: string[];
    confidenceScore: number;
    timestamp: number;
    strategy: string;
}
export interface StrategyResult {
    signal: TradeSignal;
    forecast: ForecastPoint[];
    name: string;
    accuracy: number;
    weight: number;
    executionTime: number;
}
export interface StrategyConfig {
    forecastDays: number;
    symbol: string;
    lookbackPeriod?: number;
    sensitivity?: number;
    riskLevel?: "low" | "medium" | "high";
}
export interface Strategy {
    name: string;
    description: string;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
}
export declare const cleanupStrategyCache: () => void;
export declare function generateStrategyCacheKey(strategyName: string, config: StrategyConfig, indicatorsSignature: string): string;
export declare function getCachedStrategyResult(cacheKey: string): StrategyResult | null;
export declare function setCachedStrategyResult(cacheKey: string, result: StrategyResult): void;
export declare function getStrategyCacheStats(): {
    size: number;
    maxSize: number;
    cacheDuration: number;
    hitRate: number;
};
export declare function clearStrategyCache(): void;
export declare function debugStrategyCacheContents(): void;
export declare function calculateIndicatorSignature(indicators: IndicatorResult[]): string;
export declare function calculateAveragePrice(forecasts: ForecastPoint[]): number;
export declare function calculateTrend(forecasts: ForecastPoint[]): "bullish" | "bearish" | "neutral";
export declare function calculateVolatility(forecasts: ForecastPoint[]): number;
//# sourceMappingURL=types.d.ts.map