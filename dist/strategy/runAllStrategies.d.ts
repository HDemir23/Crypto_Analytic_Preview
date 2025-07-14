import { IndicatorResult, ForecastPoint } from "../indicators";
import { StrategyConfig, StrategyResult, TradeSignal } from "./types";
export interface CombinedStrategyResult {
    individualResults: StrategyResult[];
    combinedSignal: TradeSignal;
    combinedForecast: ForecastPoint[];
    consensus: {
        buySignals: number;
        sellSignals: number;
        neutralSignals: number;
        avgConfidence: number;
        strongestSignal: StrategyResult;
    };
    performance: {
        totalExecutionTime: number;
        avgAccuracy: number;
        totalWeight: number;
        strategyCount: number;
    };
}
export declare function runAllStrategies(indicators: IndicatorResult[], config?: Partial<StrategyConfig>): Promise<CombinedStrategyResult>;
export declare function runSelectedStrategy(strategyName: string, indicators: IndicatorResult[], config?: Partial<StrategyConfig>): Promise<StrategyResult>;
export declare function getCombinedStrategyCacheStats(): {
    size: number;
    maxSize: number;
    cacheDuration: number;
    individualCacheStats: {
        size: number;
        maxSize: number;
        cacheDuration: number;
        hitRate: number;
    };
};
export declare function clearAllStrategyCaches(): void;
export declare function debugAllStrategyCaches(): void;
export declare function getStrategyPerformanceMetrics(): {
    cacheHitRate: number;
    avgExecutionTime: number;
    memoryUsage: number;
};
//# sourceMappingURL=runAllStrategies.d.ts.map