import { IndicatorResult } from "../indicators";
import { Strategy, StrategyConfig, StrategyResult } from "./types";
export declare class MeanReversionStrategy implements Strategy {
    readonly name = "Mean Reversion";
    readonly description = "Identifies oversold/overbought conditions using RSI, Bollinger Bands, and statistical analysis";
    private analyzeRSI;
    private analyzeBollinger;
    private calculateMeanReversion;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
    private generateMeanReversionForecast;
    private calculateHistoricalAccuracy;
    private calculateWeight;
}
//# sourceMappingURL=meanReversionStrategy.d.ts.map