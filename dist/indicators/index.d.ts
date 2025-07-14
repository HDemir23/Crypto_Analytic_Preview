import { PricePoint } from "../data/fetchPrices";
export interface ForecastPoint {
    day: number;
    high: number;
    low: number;
    avg: number;
    confidence: number;
    indicator: string;
}
export interface IndicatorResult {
    name: string;
    forecast: ForecastPoint[];
    accuracy: number;
    weight: number;
    executionTime: number;
}
export declare const INDICATORS: {
    RSI: {
        weight: number;
        name: string;
    };
    EMA: {
        weight: number;
        name: string;
    };
    MACD: {
        weight: number;
        name: string;
    };
    SMA: {
        weight: number;
        name: string;
    };
    BOLLINGER: {
        weight: number;
        name: string;
    };
    STOCHASTIC: {
        weight: number;
        name: string;
    };
    VWAP: {
        weight: number;
        name: string;
    };
    ADX: {
        weight: number;
        name: string;
    };
    PARABOLIC_SAR: {
        weight: number;
        name: string;
    };
    ICHIMOKU: {
        weight: number;
        name: string;
    };
};
export declare function extractPriceArrays(data: PricePoint[]): {
    closes: number[];
    highs: number[];
    lows: number[];
    volumes: number[];
    dates: string[];
};
export declare function calculateAllIndicators(symbol: string, priceData: PricePoint[], forecastDays: number): Promise<IndicatorResult[]>;
export declare function getIndicatorCacheStats(): {
    indicatorCache: number;
    maxCacheSize: number;
    cacheDuration: number;
};
export declare function clearIndicatorCaches(): void;
export declare function debugIndicatorCacheContents(): void;
//# sourceMappingURL=index.d.ts.map