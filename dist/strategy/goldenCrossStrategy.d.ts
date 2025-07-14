import { IndicatorResult } from "../indicators";
import { Strategy, StrategyConfig, StrategyResult } from "./types";
export declare class GoldenCrossStrategy implements Strategy {
    readonly name = "Golden Cross";
    readonly description = "Identifies trend reversals using moving average crossovers, particularly golden cross (50 SMA crossing above 200 SMA) and death cross patterns";
    private analyzeCrossovers;
    private calculateSpreadTrend;
    private analyzeTrendStrength;
    private analyzeVolumeConfirmation;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
    private generateGoldenCrossForecast;
    private calculateHistoricalAccuracy;
    private calculateWeight;
}
//# sourceMappingURL=goldenCrossStrategy.d.ts.map