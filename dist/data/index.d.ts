export type PricePoint = {
    date: string;
    close: number;
    high: number;
    low: number;
};
export declare function fetchHistoricalData(symbol: string, days: number): Promise<PricePoint[]>;
//# sourceMappingURL=index.d.ts.map