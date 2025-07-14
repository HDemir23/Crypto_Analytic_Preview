"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEMA = calculateEMA;
const index_1 = require("../index");
// EMA calculation and forecasting
async function calculateEMA(closes, highs, lows, volumes, forecastDays) {
    if (closes.length < 12) {
        throw new Error("EMA requires at least 12 data points");
    }
    index_1.debug.log(`Calculating EMA with ${closes.length} data points for ${forecastDays} day forecast`);
    // Calculate multiple EMA periods for comprehensive analysis
    const shortPeriod = 12;
    const longPeriod = 26;
    const shortEMA = calculateEMAValues(closes, shortPeriod);
    const longEMA = calculateEMAValues(closes, longPeriod);
    // Get current values and trends
    const currentPrice = closes[closes.length - 1];
    const currentShortEMA = shortEMA[shortEMA.length - 1];
    const currentLongEMA = longEMA[longEMA.length - 1];
    // Calculate EMA trends
    const shortTrend = calculateEMATrend(shortEMA.slice(-5));
    const longTrend = calculateEMATrend(longEMA.slice(-5));
    // Determine trend strength and direction
    const trendStrength = Math.abs(currentShortEMA - currentLongEMA) / currentPrice;
    const bullish = currentShortEMA > currentLongEMA;
    const forecast = [];
    for (let day = 1; day <= forecastDays; day++) {
        // Project future EMA values
        const futureShortEMA = currentShortEMA + shortTrend * day;
        const futureLongEMA = currentLongEMA + longTrend * day;
        // Calculate price prediction based on EMA signals
        let priceMultiplier = 1;
        // Trend following logic
        if (bullish) {
            priceMultiplier = 1 + trendStrength * 0.5 * Math.exp(-day / 8);
        }
        else {
            priceMultiplier = 1 - trendStrength * 0.5 * Math.exp(-day / 8);
        }
        // Convergence/divergence adjustment
        const convergence = Math.abs(futureShortEMA - futureLongEMA) / currentPrice;
        if (convergence < trendStrength) {
            // EMAs converging - expect trend change
            priceMultiplier = 1 + (priceMultiplier - 1) * 0.7;
        }
        const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 5);
        const volatility = calculateVolatility(closes.slice(-20));
        const confidence = calculateEMAConfidence(trendStrength, day, bullish);
        forecast.push({
            day,
            high: predictedPrice * (1 + volatility * 0.6),
            low: predictedPrice * (1 - volatility * 0.6),
            avg: predictedPrice,
            confidence,
            indicator: "EMA",
        });
    }
    index_1.debug.success(`EMA forecast generated: ${forecast.length} points`);
    return forecast;
}
// Calculate EMA values for a given period
function calculateEMAValues(prices, period) {
    const emaValues = [];
    const multiplier = 2 / (period + 1);
    // Start with SMA for the first value
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    emaValues.push(ema);
    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * multiplier + ema * (1 - multiplier);
        emaValues.push(ema);
    }
    return emaValues;
}
// Calculate EMA trend
function calculateEMATrend(emaValues) {
    if (emaValues.length < 2)
        return 0;
    let trend = 0;
    for (let i = 1; i < emaValues.length; i++) {
        trend += emaValues[i] - emaValues[i - 1];
    }
    return trend / (emaValues.length - 1);
}
// Calculate price volatility
function calculateVolatility(prices) {
    if (prices.length < 2)
        return 0.02;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
        returns.length;
    return Math.sqrt(variance);
}
// Calculate confidence based on EMA signals
function calculateEMAConfidence(trendStrength, day, bullish) {
    let confidence = 0.8;
    // Higher confidence with stronger trends
    confidence += trendStrength * 0.3;
    // Slightly higher confidence for bullish trends (market bias)
    if (bullish) {
        confidence += 0.05;
    }
    // Reduce confidence with time
    confidence *= Math.exp(-day / 12);
    return Math.max(Math.min(confidence, 0.95), 0.4);
}
//# sourceMappingURL=ema.js.map