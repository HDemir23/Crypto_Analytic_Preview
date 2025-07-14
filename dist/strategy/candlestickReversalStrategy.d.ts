import { IndicatorResult } from "../indicators";
import { Strategy, StrategyConfig, StrategyResult } from "./types";
export declare class CandlestickReversalStrategy implements Strategy {
    readonly name = "Candlestick Reversal";
    readonly description = "Identifies reversal patterns using candlestick formations like doji, hammer, shooting star, and engulfing patterns";
    private recognizePatterns;
    private determineDojiBias;
    private recognizeStarPattern;
    private analyzePatternStrength;
    private analyzeTrendContext;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
    private generateReversalForecast;
    private calculateHistoricalAccuracy;
    private calculateWeight;
}
//# sourceMappingURL=candlestickReversalStrategy.d.ts.map