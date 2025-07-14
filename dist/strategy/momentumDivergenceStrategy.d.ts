import { IndicatorResult } from "../indicators";
import { Strategy, StrategyConfig, StrategyResult } from "./types";
export declare class MomentumDivergenceStrategy implements Strategy {
    readonly name = "Momentum Divergence";
    readonly description = "Identifies divergences between price and momentum indicators (RSI, MACD, Stochastic) to predict trend reversals";
    private analyzeDivergence;
    private findPeaks;
    private calculateSlope;
    private calculateDivergenceConfidence;
    private analyzeRSIDivergence;
    private calculateRSIMomentum;
    private analyzeMACDDivergence;
    private findZeroCrossings;
    private calculateMACDMomentum;
    execute(indicators: IndicatorResult[], config: StrategyConfig): Promise<StrategyResult>;
    private generateDivergenceForecast;
    private calculateHistoricalAccuracy;
    private calculateWeight;
}
//# sourceMappingURL=momentumDivergenceStrategy.d.ts.map