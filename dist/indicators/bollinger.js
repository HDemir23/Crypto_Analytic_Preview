"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBollinger = calculateBollinger;
const index_1 = require("../index");
// Bollinger Bands calculation and forecasting
async function calculateBollinger(closes, highs, lows, volumes, forecastDays) {
    if (closes.length < 20) {
        throw new Error("Bollinger Bands requires at least 20 data points");
    }
    index_1.debug.log(`Calculating Bollinger Bands with ${closes.length} data points for ${forecastDays} day forecast`);
    const period = 20;
    const multiplier = 2;
    // Calculate SMA and standard deviation
    const smaValues = calculateSMA(closes, period);
    const upperBand = [];
    const lowerBand = [];
    for (let i = period - 1; i < closes.length; i++) {
        const sma = smaValues[i - period + 1];
        const slice = closes.slice(i - period + 1, i + 1);
        const stdDev = calculateStandardDeviation(slice, sma);
        upperBand.push(sma + multiplier * stdDev);
        lowerBand.push(sma - multiplier * stdDev);
    }
    // Get current values
    const currentPrice = closes[closes.length - 1];
    const currentSMA = smaValues[smaValues.length - 1];
    const currentUpper = upperBand[upperBand.length - 1];
    const currentLower = lowerBand[lowerBand.length - 1];
    const bandWidth = currentUpper - currentLower;
    // Calculate position within bands
    const positionInBands = (currentPrice - currentLower) / bandWidth;
    // Calculate trends
    const smaTrend = calculateTrend(smaValues.slice(-5));
    const bandWidthTrend = calculateTrend(upperBand
        .slice(-5)
        .map((upper, i) => upper - lowerBand[lowerBand.length - 5 + i]));
    // Determine signals
    const nearUpperBand = positionInBands > 0.8;
    const nearLowerBand = positionInBands < 0.2;
    const squeeze = bandWidth < currentPrice * 0.1; // Band width less than 10% of price
    const forecast = [];
    for (let day = 1; day <= forecastDays; day++) {
        // Project future values
        const futureSMA = currentSMA + smaTrend * day;
        const futureBandWidth = bandWidth + bandWidthTrend * day * 0.5;
        const futureUpper = futureSMA + futureBandWidth / 2;
        const futureLower = futureSMA - futureBandWidth / 2;
        // Calculate price prediction based on Bollinger signals
        let priceMultiplier = 1;
        if (nearUpperBand) {
            // Near upper band - expect reversion
            priceMultiplier = 0.99 - (positionInBands - 0.8) * 0.1;
        }
        else if (nearLowerBand) {
            // Near lower band - expect bounce
            priceMultiplier = 1.01 + (0.2 - positionInBands) * 0.1;
        }
        else if (squeeze) {
            // Bollinger squeeze - expect breakout
            priceMultiplier = 1 + (smaTrend / currentPrice) * 2;
        }
        else {
            // Normal range - trend following
            priceMultiplier = 1 + (smaTrend / currentPrice) * 0.5;
        }
        // Apply time decay
        const timeDecay = Math.exp(-day / 12);
        priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;
        const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 5);
        const volatility = futureBandWidth / (4 * futureSMA); // Use band width as volatility measure
        const confidence = calculateBollingerConfidence(positionInBands, squeeze, day);
        forecast.push({
            day,
            high: Math.min(predictedPrice * (1 + volatility), futureUpper * 0.95),
            low: Math.max(predictedPrice * (1 - volatility), futureLower * 1.05),
            avg: predictedPrice,
            confidence,
            indicator: "BOLLINGER",
        });
    }
    index_1.debug.success(`Bollinger Bands forecast generated: ${forecast.length} points`);
    return forecast;
}
// Calculate SMA
function calculateSMA(prices, period) {
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices
            .slice(i - period + 1, i + 1)
            .reduce((acc, price) => acc + price, 0);
        smaValues.push(sum / period);
    }
    return smaValues;
}
// Calculate standard deviation
function calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
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
// Calculate Bollinger confidence
function calculateBollingerConfidence(position, squeeze, day) {
    let confidence = 0.76;
    // Higher confidence at band extremes
    if (position > 0.8 || position < 0.2) {
        confidence = 0.85;
    }
    // Higher confidence during squeeze
    if (squeeze) {
        confidence += 0.1;
    }
    // Reduce confidence with time
    confidence *= Math.exp(-day / 14);
    return Math.max(Math.min(confidence, 0.9), 0.3);
}
//# sourceMappingURL=bollinger.js.map