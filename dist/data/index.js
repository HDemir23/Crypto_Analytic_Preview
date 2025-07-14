"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHistoricalData = fetchHistoricalData;
// Data module - Will handle fetching historical price data
const index_1 = require("../index");
function fetchHistoricalData(symbol, days) {
    index_1.debug.log(`Data module: Fetching ${days} days of data for ${symbol}`);
    // TODO: Implement API call to CoinGecko
    return Promise.resolve([]);
}
//# sourceMappingURL=index.js.map