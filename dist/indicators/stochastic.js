"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStochastic = calculateStochastic;
const index_1 = require("../index");
// Stochastic Oscillator calculation and forecasting
async function calculateStochastic(closes, highs, lows, volumes, forecastDays) {
    if (closes.length < 14) {
        throw new Error("Stochastic requires at least 14 data points");
    }
    index_1.debug.log(`Calculating Stochastic with ${closes.length} data points for ${forecastDays} day forecast`);
    const kPeriod = 14;
    const dPeriod = 3;
    // Calculate %K values
    const kValues = [];
    for (let i = kPeriod - 1; i < closes.length; i++) {
        const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
        const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
        const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
        kValues.push(k);
    }
    // Calculate %D values (SMA of %K)
    const dValues = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
        const sum = kValues
            .slice(i - dPeriod + 1, i + 1)
            .reduce((acc, val) => acc + val, 0);
        dValues.push(sum / dPeriod);
    }
    // Get current values
    const currentPrice = closes[closes.length - 1];
    const currentK = kValues[kValues.length - 1];
    const currentD = dValues[dValues.length - 1];
    // Calculate trends
    const kTrend = calculateTrend(kValues.slice(-3));
    const dTrend = calculateTrend(dValues.slice(-3));
    // Determine signals
    const overbought = currentK > 80 && currentD > 80;
    const oversold = currentK < 20 && currentD < 20;
    const bullishCrossover = currentK > currentD && kTrend > dTrend;
    const bearishCrossover = currentK < currentD && kTrend < dTrend;
    const forecast = [];
    for (let day = 1; day <= forecastDays; day++) {
        // Project future stochastic values
        let futureK = currentK + kTrend * day;
        let futureD = currentD + dTrend * day;
        // Clamp between 0-100
        futureK = Math.max(0, Math.min(100, futureK));
        futureD = Math.max(0, Math.min(100, futureD));
        // Calculate price prediction
        let priceMultiplier = 1;
        if (overbought) {
            // Overbought - expect decline
            priceMultiplier = 0.99 - ((currentK - 80) / 20) * 0.03;
        }
        else if (oversold) {
            // Oversold - expect rally
            priceMultiplier = 1.01 + ((20 - currentK) / 20) * 0.03;
        }
        else if (bullishCrossover) {
            // Bullish crossover
            priceMultiplier = 1.015 + (Math.abs(kTrend - dTrend) / 100) * 0.02;
        }
        else if (bearishCrossover) {
            // Bearish crossover
            priceMultiplier = 0.985 - (Math.abs(kTrend - dTrend) / 100) * 0.02;
        }
        else {
            // Neutral - slight momentum continuation
            const momentum = (futureK - 50) / 50;
            priceMultiplier = 1 + momentum * 0.01;
        }
        // Apply time decay
        const timeDecay = Math.exp(-day / 10);
        priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;
        const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 6);
        const volatility = calculateVolatility(closes.slice(-20));
        const confidence = calculateStochasticConfidence(currentK, currentD, day, overbought || oversold);
        forecast.push({
            day,
            high: predictedPrice * (1 + volatility * 0.6),
            low: predictedPrice * (1 - volatility * 0.6),
            avg: predictedPrice,
            confidence,
            indicator: "STOCHASTIC",
        });
    }
    index_1.debug.success(`Stochastic forecast generated: ${forecast.length} points`);
    return forecast;
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
// Calculate Stochastic confidence
function calculateStochasticConfidence(k, d, day, extreme) {
    let confidence = 0.68;
    // Higher confidence in extreme zones
    if (extreme) {
        confidence = 0.82;
    }
    // Higher confidence when K and D agree
    if (Math.abs(k - d) < 10) {
        confidence += 0.05;
    }
    // Reduce confidence with time
    confidence *= Math.exp(-day / 8);
    return Math.max(Math.min(confidence, 0.9), 0.3);
}
//# sourceMappingURL=stochastic.js.map