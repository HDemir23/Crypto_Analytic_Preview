"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSMA = calculateSMA;
const index_1 = require("../index");
// SMA calculation and forecasting
async function calculateSMA(closes, highs, lows, volumes, forecastDays) {
    if (closes.length < 20) {
        throw new Error("SMA requires at least 20 data points");
    }
    index_1.debug.log(`Calculating SMA with ${closes.length} data points for ${forecastDays} day forecast`);
    // Calculate multiple SMA periods
    const shortPeriod = 20;
    const longPeriod = 50;
    const shortSMA = calculateSMAValues(closes, shortPeriod);
    const longSMA = calculateSMAValues(closes, longPeriod);
    // Get current values
    const currentPrice = closes[closes.length - 1];
    const currentShortSMA = shortSMA[shortSMA.length - 1];
    const currentLongSMA = longSMA[longSMA.length - 1];
    // Calculate trends
    const shortTrend = calculateTrend(shortSMA.slice(-5));
    const longTrend = calculateTrend(longSMA.slice(-10));
    // Determine signals
    const bullish = currentPrice > currentShortSMA && currentShortSMA > currentLongSMA;
    const bearish = currentPrice < currentShortSMA && currentShortSMA < currentLongSMA;
    const priceAboveSMA = currentPrice > currentShortSMA;
    const forecast = [];
    for (let day = 1; day <= forecastDays; day++) {
        // Project future SMA values
        const futureShortSMA = currentShortSMA + shortTrend * day;
        const futureLongSMA = currentLongSMA + longTrend * day;
        // Calculate price prediction based on SMA signals
        let priceMultiplier = 1;
        if (bullish) {
            // Strong bullish signal
            priceMultiplier = 1.015 + (Math.abs(shortTrend) / currentPrice) * 0.5;
        }
        else if (bearish) {
            // Strong bearish signal
            priceMultiplier = 0.985 - (Math.abs(shortTrend) / currentPrice) * 0.5;
        }
        else if (priceAboveSMA) {
            // Mild bullish
            priceMultiplier = 1.005 + (shortTrend / currentPrice) * 0.3;
        }
        else {
            // Mild bearish
            priceMultiplier = 0.995 + (shortTrend / currentPrice) * 0.3;
        }
        // Apply time decay and volatility
        const timeDecay = Math.exp(-day / 15);
        priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;
        const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 4);
        const volatility = calculateVolatility(closes.slice(-20));
        const confidence = calculateSMAConfidence(bullish, bearish, day);
        forecast.push({
            day,
            high: predictedPrice * (1 + volatility * 0.5),
            low: predictedPrice * (1 - volatility * 0.5),
            avg: predictedPrice,
            confidence,
            indicator: "SMA",
        });
    }
    index_1.debug.success(`SMA forecast generated: ${forecast.length} points`);
    return forecast;
}
// Calculate SMA values
function calculateSMAValues(prices, period) {
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices
            .slice(i - period + 1, i + 1)
            .reduce((acc, price) => acc + price, 0);
        smaValues.push(sum / period);
    }
    return smaValues;
}
// Calculate trend
function calculateTrend(values) {
    if (values.length < 2)
        return 0;
    let trend = 0;
    for (let i = 1; i < values.length; i++) {
        trend += values[i] - values[i - 1];
    }
    return trend / (values.length - 1);
}
// Calculate volatility
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
// Calculate SMA confidence
function calculateSMAConfidence(bullish, bearish, day) {
    let confidence = 0.7;
    // Higher confidence with clear signals
    if (bullish || bearish) {
        confidence = 0.85;
    }
    // Reduce confidence with time
    confidence *= Math.exp(-day / 18);
    return Math.max(Math.min(confidence, 0.9), 0.3);
}
//# sourceMappingURL=sma.js.map