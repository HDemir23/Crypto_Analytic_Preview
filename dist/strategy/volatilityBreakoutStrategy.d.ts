import { IndicatorResult } from "../indicators";
import { Strategy, StrategyConfig, StrategyResult } from "./types";
export declare class VolatilityBreakoutStrategy implements Strategy {
    readonly name = "Volatility Breakout";
    readonly description = "Identifies breakouts based on volatility expansion after periods of compression using Bollinger Bands and ATR";
    private analyzeVolatilityPattern;
    private detectCompressionPhase;
    private detectExpansionPhase;
    private analyzeBollingerSqueeze;
    private analyzeBreakoutDirection;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
    private generateVolatilityForecast;
    private calculateHistoricalAccuracy;
    private calculateWeight;
}
//# sourceMappingURL=volatilityBreakoutStrategy.d.ts.map