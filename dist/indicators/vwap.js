"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateVWAP = calculateVWAP;
const index_1 = require("../index");
// VWAP calculation and forecasting
async function calculateVWAP(closes, highs, lows, volumes, forecastDays) {
    if (closes.length < 20) {
        throw new Error("VWAP requires at least 20 data points");
    }
    index_1.debug.log(`Calculating VWAP with ${closes.length} data points for ${forecastDays} day forecast`);
    // Calculate typical prices and VWAP
    const typicalPrices = highs.map((high, i) => (high + lows[i] + closes[i]) / 3);
    const vwapValues = [];
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    for (let i = 0; i < typicalPrices.length; i++) {
        cumulativePriceVolume += typicalPrices[i] * volumes[i];
        cumulativeVolume += volumes[i];
        if (cumulativeVolume > 0) {
            vwapValues.push(cumulativePriceVolume / cumulativeVolume);
        }
        else {
            vwapValues.push(typicalPrices[i]); // Fallback to typical price
        }
    }
    // Get current values
    const currentPrice = closes[closes.length - 1];
    const currentVWAP = vwapValues[vwapValues.length - 1];
    const priceVolumeRatio = currentPrice / currentVWAP;
    // Calculate VWAP trend and volume trend
    const vwapTrend = calculateTrend(vwapValues.slice(-10));
    const volumeTrend = calculateTrend(volumes.slice(-10));
    const avgVolume = volumes.slice(-20).reduce((sum, vol) => sum + vol, 0) / 20;
    const currentVolumeRatio = volumes[volumes.length - 1] / avgVolume;
    // Determine signals
    const aboveVWAP = currentPrice > currentVWAP;
    const highVolume = currentVolumeRatio > 1.5;
    const lowVolume = currentVolumeRatio < 0.5;
    const forecast = [];
    for (let day = 1; day <= forecastDays; day++) {
        // Project future VWAP
        const futureVWAP = currentVWAP + vwapTrend * day;
        // Calculate price prediction based on VWAP signals
        let priceMultiplier = 1;
        if (aboveVWAP && highVolume) {
            // Price above VWAP with high volume - bullish
            priceMultiplier = 1.01 + (priceVolumeRatio - 1) * 0.05;
        }
        else if (!aboveVWAP && highVolume) {
            // Price below VWAP with high volume - bearish
            priceMultiplier = 0.99 - (1 - priceVolumeRatio) * 0.05;
        }
        else if (aboveVWAP && lowVolume) {
            // Price above VWAP with low volume - weak bullish
            priceMultiplier = 1.005 + (priceVolumeRatio - 1) * 0.02;
        }
        else if (!aboveVWAP && lowVolume) {
            // Price below VWAP with low volume - weak bearish
            priceMultiplier = 0.995 - (1 - priceVolumeRatio) * 0.02;
        }
        else {
            // Normal conditions - trend following
            priceMultiplier = 1 + (vwapTrend / currentVWAP) * 0.3;
        }
        // Apply time decay
        const timeDecay = Math.exp(-day / 15);
        priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;
        const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 7);
        const volatility = calculateVolatility(closes.slice(-20));
        const confidence = calculateVWAPConfidence(priceVolumeRatio, currentVolumeRatio, day);
        forecast.push({
            day,
            high: predictedPrice * (1 + volatility * 0.6),
            low: predictedPrice * (1 - volatility * 0.6),
            avg: predictedPrice,
            confidence,
            indicator: "VWAP",
        });
    }
    index_1.debug.success(`VWAP forecast generated: ${forecast.length} points`);
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
// Calculate VWAP confidence
function calculateVWAPConfidence(priceRatio, volumeRatio, day) {
    let confidence = 0.74;
    // Higher confidence with volume confirmation
    if (volumeRatio > 1.2) {
        confidence += 0.1;
    }
    // Higher confidence when price is near VWAP
    const deviation = Math.abs(priceRatio - 1);
    if (deviation < 0.02) {
        confidence += 0.05;
    }
    // Reduce confidence with time
    confidence *= Math.exp(-day / 12);
    return Math.max(Math.min(confidence, 0.9), 0.3);
}
//# sourceMappingURL=vwap.js.map