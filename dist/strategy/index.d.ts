export { MeanReversionStrategy } from "./meanReversionStrategy";
export { BreakoutStrategy } from "./breakoutStrategy";
export { GoldenCrossStrategy } from "./goldenCrossStrategy";
export { MomentumDivergenceStrategy } from "./momentumDivergenceStrategy";
export { CandlestickReversalStrategy } from "./candlestickReversalStrategy";
export { VolatilityBreakoutStrategy } from "./volatilityBreakoutStrategy";
export * from "./types";
import { Strategy } from "./types";
export declare const initializeStrategies: () => Map<string, Strategy>;
export declare const getStrategyByName: (name: string) => Strategy | undefined;
export declare const getAllStrategies: () => Strategy[];
export declare const getStrategyNames: () => string[];
export declare const STRATEGY_CATEGORIES: {
    readonly MEAN_REVERSION: readonly ["Mean Reversion"];
    readonly TREND_FOLLOWING: readonly ["Golden Cross", "Breakout"];
    readonly MOMENTUM: readonly ["Momentum Divergence"];
    readonly PATTERN_RECOGNITION: readonly ["Candlestick Reversal"];
    readonly VOLATILITY: readonly ["Volatility Breakout"];
};
export declare const getStrategiesByCategory: (category: keyof typeof STRATEGY_CATEGORIES) => Strategy[];
export declare const getStrategyPerformanceStats: () => Map<string, {
    accuracy: number;
    weight: number;
    category: string;
    description: string;
}>;
export declare const DEFAULT_STRATEGY_CONFIG: {
    forecastDays: number;
    symbol: string;
    lookbackPeriod: number;
    sensitivity: number;
    riskLevel: "medium";
};
export declare const createStrategyConfig: (overrides?: Partial<any>) => any;
//# sourceMappingURL=index.d.ts.map