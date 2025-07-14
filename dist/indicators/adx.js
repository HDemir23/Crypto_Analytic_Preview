"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateADX = calculateADX;
const index_1 = require("../index");
// ADX calculation and forecasting
async function calculateADX(closes, highs, lows, volumes, forecastDays) {
    if (closes.length < 28) {
        throw new Error("ADX requires at least 28 data points");
    }
    index_1.debug.log(`Calculating ADX with ${closes.length} data points for ${forecastDays} day forecast`);
    const period = 14;
    // Calculate True Range, +DI, -DI, and ADX
    const trueRanges = [];
    const plusDMs = [];
    const minusDMs = [];
    for (let i = 1; i < closes.length; i++) {
        // True Range
        const highLow = highs[i] - lows[i];
        const highClose = Math.abs(highs[i] - closes[i - 1]);
        const lowClose = Math.abs(lows[i] - closes[i - 1]);
        const tr = Math.max(highLow, highClose, lowClose);
        trueRanges.push(tr);
        // Directional Movement
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];
        const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
        const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
        plusDMs.push(plusDM);
        minusDMs.push(minusDM);
    }
    // Calculate smoothed values
    const smoothedTRs = calculateSmoothed(trueRanges, period);
    const smoothedPlusDMs = calculateSmoothed(plusDMs, period);
    const smoothedMinusDMs = calculateSmoothed(minusDMs, period);
    // Calculate DI+ and DI-
    const plusDIs = [];
    const minusDIs = [];
    for (let i = 0; i < smoothedTRs.length; i++) {
        const plusDI = (smoothedPlusDMs[i] / smoothedTRs[i]) * 100;
        const minusDI = (smoothedMinusDMs[i] / smoothedTRs[i]) * 100;
        plusDIs.push(plusDI);
        minusDIs.push(minusDI);
    }
    // Calculate DX and ADX
    const dxValues = [];
    for (let i = 0; i < plusDIs.length; i++) {
        const diSum = plusDIs[i] + minusDIs[i];
        const diDiff = Math.abs(plusDIs[i] - minusDIs[i]);
        const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
        dxValues.push(dx);
    }
    const adxValues = calculateSmoothed(dxValues, period);
    // Get current values
    const currentPrice = closes[closes.length - 1];
    const currentADX = adxValues[adxValues.length - 1];
    const currentPlusDI = plusDIs[plusDIs.length - 1];
    const currentMinusDI = minusDIs[minusDIs.length - 1];
    // Calculate trends
    const adxTrend = calculateTrend(adxValues.slice(-5));
    const priceTrend = calculateTrend(closes.slice(-10));
    // Determine signals
    const strongTrend = currentADX > 25;
    const veryStrongTrend = currentADX > 40;
    const bullish = currentPlusDI > currentMinusDI;
    const forecast = [];
    for (let day = 1; day <= forecastDays; day++) {
        // Project future ADX
        let futureADX = currentADX + adxTrend * day;
        futureADX = Math.max(0, Math.min(100, futureADX));
        // Calculate price prediction based on ADX signals
        let priceMultiplier = 1;
        if (veryStrongTrend) {
            // Very strong trend - follow direction
            const trendStrength = futureADX / 100;
            if (bullish) {
                priceMultiplier = 1.015 + trendStrength * 0.02;
            }
            else {
                priceMultiplier = 0.985 - trendStrength * 0.02;
            }
        }
        else if (strongTrend) {
            // Strong trend - moderate follow
            const trendStrength = futureADX / 100;
            if (bullish) {
                priceMultiplier = 1.01 + trendStrength * 0.01;
            }
            else {
                priceMultiplier = 0.99 - trendStrength * 0.01;
            }
        }
        else {
            // Weak trend - expect ranging
            priceMultiplier = 1 + (priceTrend / currentPrice) * 0.1;
        }
        // Apply time decay
        const timeDecay = Math.exp(-day / 16);
        priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;
        const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 8);
        const volatility = calculateVolatility(closes.slice(-20));
        const confidence = calculateADXConfidence(currentADX, futureADX, day);
        forecast.push({
            day,
            high: predictedPrice * (1 + volatility * 0.5),
            low: predictedPrice * (1 - volatility * 0.5),
            avg: predictedPrice,
            confidence,
            indicator: "ADX",
        });
    }
    index_1.debug.success(`ADX forecast generated: ${forecast.length} points`);
    return forecast;
}
// Calculate smoothed values (Wilder's smoothing)
function calculateSmoothed(values, period) {
    const smoothed = [];
    let sum = values.slice(0, period).reduce((acc, val) => acc + val, 0);
    smoothed.push(sum / period);
    for (let i = period; i < values.length; i++) {
        const newValue = (smoothed[smoothed.length - 1] * (period - 1) + values[i]) / period;
        smoothed.push(newValue);
    }
    return smoothed;
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
// Calculate ADX confidence
function calculateADXConfidence(currentADX, futureADX, day) {
    let confidence = 0.66;
    // Higher confidence with stronger trends
    if (currentADX > 40) {
        confidence = 0.8;
    }
    else if (currentADX > 25) {
        confidence = 0.75;
    }
    // Lower confidence if ADX is declining
    if (futureADX < currentADX) {
        confidence *= 0.9;
    }
    // Reduce confidence with time
    confidence *= Math.exp(-day / 14);
    return Math.max(Math.min(confidence, 0.85), 0.25);
}
//# sourceMappingURL=adx.js.map