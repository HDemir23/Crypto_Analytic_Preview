export interface PricePoint {
    date: string;
    close: number;
    high: number;
    low: number;
    volume: number;
}
export interface APIResponse {
    success: boolean;
    data: PricePoint[];
    error?: string;
    source: string;
    cached: boolean;
    timestamp: number;
}
export declare function fetchHistoricalData(symbol: string, days: number): Promise<APIResponse>;
export declare function getCurrentPrice(symbol: string): Promise<number>;
export declare function getCacheStats(): {
    priceCache: number;
    coinIdCache: number;
    maxCacheSize: number;
    cacheDuration: number;
};
export declare function clearCaches(): void;
export declare function debugCacheContents(): void;
//# sourceMappingURL=fetchPrices.d.ts.map