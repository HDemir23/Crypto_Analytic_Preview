import { ForecastPoint } from "./index";
import { debug } from "../index";

export async function calculateParabolicSAR(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  forecastDays: number
): Promise<ForecastPoint[]> {
  if (closes.length < 10) {
    throw new Error("Parabolic SAR requires at least 10 data points");
  }

  debug.log(
    `Calculating Parabolic SAR with ${closes.length} data points for ${forecastDays} day forecast`
  );

  const acceleration = 0.02;
  const maxAcceleration = 0.2;

  // Initialize SAR calculation
  let isUptrend = highs[1] > highs[0];
  let sar = isUptrend
    ? Math.min(...lows.slice(0, 2))
    : Math.max(...highs.slice(0, 2));
  let ep = isUptrend
    ? Math.max(...highs.slice(0, 2))
    : Math.min(...lows.slice(0, 2));
  let af = acceleration;

  const sarValues: number[] = [sar];

  // Calculate SAR for historical data
  for (let i = 2; i < closes.length; i++) {
    const prevSar = sar;

    // Calculate new SAR
    sar = prevSar + af * (ep - prevSar);

    if (isUptrend) {
      // Uptrend rules
      if (lows[i] <= sar) {
        // Trend reversal
        isUptrend = false;
        sar = ep;
        ep = lows[i];
        af = acceleration;
      } else {
        // Continue uptrend
        if (highs[i] > ep) {
          ep = highs[i];
          af = Math.min(af + acceleration, maxAcceleration);
        }
        sar = Math.min(sar, lows[i - 1], lows[i - 2] || lows[i - 1]);
      }
    } else {
      // Downtrend rules
      if (highs[i] >= sar) {
        // Trend reversal
        isUptrend = true;
        sar = ep;
        ep = highs[i];
        af = acceleration;
      } else {
        // Continue downtrend
        if (lows[i] < ep) {
          ep = lows[i];
          af = Math.min(af + acceleration, maxAcceleration);
        }
        sar = Math.max(sar, highs[i - 1], highs[i - 2] || highs[i - 1]);
      }
    }

    sarValues.push(sar);
  }

  // Get current values
  const currentPrice = closes[closes.length - 1];
  const currentSAR = sarValues[sarValues.length - 1];

  // Determine current trend and strength
  const bullish = currentPrice > currentSAR;
  const distance = Math.abs(currentPrice - currentSAR) / currentPrice;

  const forecast: ForecastPoint[] = [];

  for (let day = 1; day <= forecastDays; day++) {
    // Project SAR continuation
    let priceMultiplier = 1;

    if (bullish) {
      // Bullish trend - expect continuation until reversal
      priceMultiplier = 1.01 + distance * 0.5;
    } else {
      // Bearish trend - expect continuation until reversal
      priceMultiplier = 0.99 - distance * 0.5;
    }

    // Apply time decay for trend exhaustion
    const timeDecay = Math.exp(-day / 8);
    priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;

    const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 4);
    const volatility = calculateVolatility(closes.slice(-20));
    const confidence = calculateSARConfidence(distance, day, bullish);

    forecast.push({
      day,
      high: predictedPrice * (1 + volatility * 0.6),
      low: predictedPrice * (1 - volatility * 0.6),
      avg: predictedPrice,
      confidence,
      indicator: "PARABOLIC_SAR",
    });
  }

  debug.success(`Parabolic SAR forecast generated: ${forecast.length} points`);
  return forecast;
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0.02;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance =
    returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
    returns.length;

  return Math.sqrt(variance);
}

function calculateSARConfidence(
  distance: number,
  day: number,
  bullish: boolean
): number {
  let confidence = 0.71;

  // Higher confidence with larger distance from SAR
  confidence += Math.min(distance * 2, 0.15);

  // Reduce confidence with time (trends exhaust)
  confidence *= Math.exp(-day / 6);

  return Math.max(Math.min(confidence, 0.9), 0.3);
}
