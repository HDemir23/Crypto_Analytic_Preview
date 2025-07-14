"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHistoricalData = fetchHistoricalData;
exports.getCurrentPrice = getCurrentPrice;
exports.getCacheStats = getCacheStats;
exports.clearCaches = clearCaches;
exports.debugCacheContents = debugCacheContents;
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../index");
// Performance: Cache for API responses (equivalent to useMemo)
const priceCache = new Map();
// Performance: Cache for coin ID mappings
const coinIdCache = new Map();
// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100;
// CoinGecko API configuration
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const API_TIMEOUT = 10000; // 10 seconds
// Cryptocurrency symbol to CoinGecko ID mapping
const COIN_ID_MAP = {
    // Major cryptocurrencies
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    ADA: "cardano",
    DOT: "polkadot",
    MATIC: "matic-network",
    AVAX: "avalanche-2",
    LINK: "chainlink",
    UNI: "uniswap",
    ATOM: "cosmos",
    // Meme tokens
    PEPE: "pepe",
    FLOKI: "floki",
    SHIB: "shiba-inu",
    DOGE: "dogecoin",
    BONK: "bonk",
    TRUMP: "maga",
    FARTCOIN: "fartcoin",
    // Layer 1 / Ecosystem tokens
    SUI: "sui",
    SEI: "sei-network",
    JUP: "jupiter-exchange-solana",
    // Tool / Utility coins
    SNORT: "snortbot",
    SPY: "spacepay",
    BEST: "best-wallet-token",
    TOKEN6900: "token6900",
};
// Performance: Memoized coin ID resolver
function getCoinId(symbol) {
    const cacheKey = symbol.toUpperCase();
    if (coinIdCache.has(cacheKey)) {
        index_1.debug.log(`Using cached coin ID for ${symbol}`);
        return coinIdCache.get(cacheKey);
    }
    const coinId = COIN_ID_MAP[cacheKey];
    if (!coinId) {
        throw new Error(`Unsupported coin symbol: ${symbol}`);
    }
    coinIdCache.set(cacheKey, coinId);
    index_1.debug.log(`Cached coin ID for ${symbol}: ${coinId}`);
    return coinId;
}
// Performance: Cache management
function cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of priceCache.entries()) {
        if (now > entry.expires) {
            priceCache.delete(key);
            cleaned++;
        }
    }
    // Limit cache size
    if (priceCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(priceCache.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, MAX_CACHE_SIZE);
        priceCache.clear();
        entries.forEach(([key, value]) => priceCache.set(key, value));
        cleaned += priceCache.size - MAX_CACHE_SIZE;
    }
    if (cleaned > 0) {
        index_1.debug.log(`Cleaned ${cleaned} expired cache entries`);
    }
}
// Performance: Check cache for existing data
function getCachedData(symbol, days) {
    const cacheKey = `${symbol}-${days}`;
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
        index_1.debug.log(`Cache hit for ${symbol} (${days} days)`);
        return cached.data;
    }
    if (cached) {
        index_1.debug.log(`Cache expired for ${symbol} (${days} days)`);
        priceCache.delete(cacheKey);
    }
    return null;
}
// Performance: Store data in cache
function setCachedData(symbol, days, data) {
    const cacheKey = `${symbol}-${days}`;
    const now = Date.now();
    priceCache.set(cacheKey, {
        data: [...data], // Deep copy to prevent mutations
        timestamp: now,
        expires: now + CACHE_DURATION,
    });
    index_1.debug.log(`Cached ${data.length} price points for ${symbol} (${days} days)`);
}
// Format date for API requests
function formatDate(date) {
    return date.toISOString().split("T")[0];
}
// Note: normalizeData function removed - now done inline in fetchFromCoinGecko
// Fetch data from CoinGecko API using market chart endpoint (more reliable for free tier)
async function fetchFromCoinGecko(coinId, days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    // Use market chart API instead of OHLC for better free tier compatibility
    const url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart`;
    const params = {
        vs_currency: "usd",
        days: days.toString(),
        interval: days <= 1 ? "hourly" : "daily",
    };
    index_1.debug.log(`Fetching ${days} days of data for ${coinId} from CoinGecko (market chart API)`);
    index_1.debug.log(`API URL: ${url}`);
    index_1.debug.log(`Parameters:`, params);
    try {
        const response = await axios_1.default.get(url, {
            params,
            timeout: API_TIMEOUT,
            headers: {
                Accept: "application/json",
                "User-Agent": "CryptoForecastCLI/1.0.0",
            },
        });
        if (!response.data || !response.data.prices) {
            throw new Error("Invalid API response format");
        }
        const { prices, market_caps, total_volumes } = response.data;
        if (!Array.isArray(prices) || prices.length === 0) {
            throw new Error("No price data available for the specified period");
        }
        // Convert market chart data to PricePoint format
        // Market chart gives us [timestamp, price] arrays
        const normalizedData = prices.map((priceData, index) => {
            const [timestamp, price] = priceData;
            const volume = total_volumes[index] ? total_volumes[index][1] : 0;
            return {
                date: new Date(timestamp).toISOString().split("T")[0],
                close: price,
                high: price, // Market chart doesn't provide OHLC, so we use close for all
                low: price,
                volume: volume,
            };
        });
        index_1.debug.success(`Successfully fetched ${normalizedData.length} data points from market chart API`);
        return normalizedData;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.status === 429) {
                throw new Error("Rate limit exceeded. Please try again later.");
            }
            else if (error.response?.status === 404) {
                throw new Error(`Coin data not found for ${coinId}`);
            }
            else if (error.code === "ECONNABORTED") {
                throw new Error("Request timeout. Please check your internet connection.");
            }
            else if (error.response?.status === 400) {
                throw new Error(`Invalid request parameters for ${coinId}. Please check the coin symbol and date range.`);
            }
        }
        index_1.debug.error("CoinGecko API error:", error);
        throw new Error(`Failed to fetch data from CoinGecko: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
// Validate fetched data
function validateData(data, symbol, requestedDays) {
    if (!data || data.length === 0) {
        throw new Error(`No price data available for ${symbol}`);
    }
    // Check for required fields
    const invalidPoints = data.filter((point) => !point.date ||
        typeof point.close !== "number" ||
        typeof point.high !== "number" ||
        typeof point.low !== "number" ||
        isNaN(point.close) ||
        isNaN(point.high) ||
        isNaN(point.low));
    if (invalidPoints.length > 0) {
        index_1.debug.warn(`Found ${invalidPoints.length} invalid data points`);
        throw new Error(`Invalid price data detected for ${symbol}`);
    }
    // Check data consistency (note: for market chart data, high/low/close will be the same)
    const invalidRanges = data.filter((point) => point.high < point.low ||
        point.close < 0 ||
        point.high < 0 ||
        point.low < 0);
    if (invalidRanges.length > 0) {
        index_1.debug.warn(`Found ${invalidRanges.length} points with invalid price ranges`);
        throw new Error(`Inconsistent price data detected for ${symbol}`);
    }
    // Warn if we got significantly fewer days than requested
    if (data.length < requestedDays * 0.8) {
        index_1.debug.warn(`Only received ${data.length} days of data, requested ${requestedDays}`);
    }
    index_1.debug.success(`Data validation passed for ${symbol}: ${data.length} valid points`);
}
// Sort data by date (oldest to newest)
function sortData(data) {
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
// Main function to fetch historical data
async function fetchHistoricalData(symbol, days) {
    const startTime = Date.now();
    index_1.debug.log(`Starting data fetch for ${symbol} (${days} days)`);
    try {
        // Cleanup expired cache entries
        cleanupCache();
        // Check cache first (performance optimization)
        const cachedData = getCachedData(symbol, days);
        if (cachedData) {
            return {
                success: true,
                data: cachedData,
                source: "CoinGecko (cached)",
                cached: true,
                timestamp: Date.now(),
            };
        }
        // Validate input parameters
        if (!symbol || typeof symbol !== "string") {
            throw new Error("Invalid symbol parameter");
        }
        if (!days || days < 1 || days > 365) {
            throw new Error("Days must be between 1 and 365");
        }
        // Get coin ID for the symbol
        const coinId = getCoinId(symbol);
        // Fetch data from API
        const rawData = await fetchFromCoinGecko(coinId, days);
        // Validate and sort data
        validateData(rawData, symbol, days);
        const sortedData = sortData(rawData);
        // Cache the results
        setCachedData(symbol, days, sortedData);
        const duration = Date.now() - startTime;
        index_1.debug.success(`Data fetch completed in ${duration}ms`);
        return {
            success: true,
            data: sortedData,
            source: "CoinGecko",
            cached: false,
            timestamp: Date.now(),
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        index_1.debug.error(`Data fetch failed after ${duration}ms:`, error);
        return {
            success: false,
            data: [],
            error: error instanceof Error ? error.message : "Unknown error occurred",
            source: "CoinGecko",
            cached: false,
            timestamp: Date.now(),
        };
    }
}
// Get current price for a symbol
async function getCurrentPrice(symbol) {
    try {
        const coinId = getCoinId(symbol);
        const url = `${COINGECKO_BASE_URL}/simple/price`;
        const params = {
            ids: coinId,
            vs_currencies: "usd",
        };
        index_1.debug.log(`Fetching current price for ${symbol}`);
        const response = await axios_1.default.get(url, {
            params,
            timeout: API_TIMEOUT,
            headers: {
                Accept: "application/json",
                "User-Agent": "CryptoForecastCLI/1.0.0",
            },
        });
        const price = response.data[coinId]?.usd;
        if (typeof price !== "number") {
            throw new Error(`No current price available for ${symbol}`);
        }
        index_1.debug.success(`Current price for ${symbol}: $${price}`);
        return price;
    }
    catch (error) {
        index_1.debug.error(`Failed to get current price for ${symbol}:`, error);
        throw new Error(`Failed to get current price: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
// Performance monitoring
function getCacheStats() {
    cleanupCache();
    return {
        priceCache: priceCache.size,
        coinIdCache: coinIdCache.size,
        maxCacheSize: MAX_CACHE_SIZE,
        cacheDuration: CACHE_DURATION / 1000, // in seconds
    };
}
// Clear all caches (for testing)
function clearCaches() {
    priceCache.clear();
    coinIdCache.clear();
    index_1.debug.log("All data caches cleared");
}
// Get cache contents (for debugging)
function debugCacheContents() {
    index_1.debug.log("Price cache contents:");
    for (const [key, value] of priceCache.entries()) {
        const expired = Date.now() > value.expires;
        index_1.debug.log(`  ${key}: ${value.data.length} points, expires in ${Math.round((value.expires - Date.now()) / 1000)}s ${expired ? "(EXPIRED)" : ""}`);
    }
    index_1.debug.log("Coin ID cache contents:");
    for (const [key, value] of coinIdCache.entries()) {
        index_1.debug.log(`  ${key}: ${value}`);
    }
}
//# sourceMappingURL=fetchPrices.js.map