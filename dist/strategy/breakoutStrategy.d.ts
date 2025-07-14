import { IndicatorResult } from "../indicators";
import { Strategy, StrategyConfig, StrategyResult } from "./types";
export declare class BreakoutStrategy implements Strategy {
    readonly name = "Breakout";
    readonly description = "Identifies price breakouts from established ranges, support/resistance levels, and volume confirmation";
    private calculateSupportResistance;
    private analyzeVolumeBreakout;
    private analyzeMomentum;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
    private generateBreakoutForecast;
    private calculateHistoricalAccuracy;
    private calculateWeight;
}
//# sourceMappingURL=breakoutStrategy.d.ts.map