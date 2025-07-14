import { ForecastPoint } from "./index";
import { debug } from "../index";

export async function calculateIchimoku(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  forecastDays: number
): Promise<ForecastPoint[]> {
  if (closes.length < 52) {
    throw new Error("Ichimoku requires at least 52 data points");
  }

  debug.log(
    `Calculating Ichimoku with ${closes.length} data points for ${forecastDays} day forecast`
  );

  // Ichimoku parameters
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;
  const displacement = 26;

  // Calculate Tenkan-sen (Conversion Line)
  const tenkanValues: number[] = [];
  for (let i = tenkanPeriod - 1; i < closes.length; i++) {
    const high = Math.max(...highs.slice(i - tenkanPeriod + 1, i + 1));
    const low = Math.min(...lows.slice(i - tenkanPeriod + 1, i + 1));
    tenkanValues.push((high + low) / 2);
  }

  // Calculate Kijun-sen (Base Line)
  const kijunValues: number[] = [];
  for (let i = kijunPeriod - 1; i < closes.length; i++) {
    const high = Math.max(...highs.slice(i - kijunPeriod + 1, i + 1));
    const low = Math.min(...lows.slice(i - kijunPeriod + 1, i + 1));
    kijunValues.push((high + low) / 2);
  }

  // Calculate Senkou Span A (Leading Span A)
  const senkouAValues: number[] = [];
  const startIndex = Math.max(tenkanPeriod, kijunPeriod) - 1;
  for (let i = 0; i < Math.min(tenkanValues.length, kijunValues.length); i++) {
    const tenkanIndex = i + tenkanPeriod - kijunPeriod;
    if (tenkanIndex >= 0 && tenkanIndex < tenkanValues.length) {
      senkouAValues.push((tenkanValues[tenkanIndex] + kijunValues[i]) / 2);
    }
  }

  // Calculate Senkou Span B (Leading Span B)
  const senkouBValues: number[] = [];
  for (let i = senkouBPeriod - 1; i < closes.length; i++) {
    const high = Math.max(...highs.slice(i - senkouBPeriod + 1, i + 1));
    const low = Math.min(...lows.slice(i - senkouBPeriod + 1, i + 1));
    senkouBValues.push((high + low) / 2);
  }

  // Get current values
  const currentPrice = closes[closes.length - 1];
  const currentTenkan = tenkanValues[tenkanValues.length - 1];
  const currentKijun = kijunValues[kijunValues.length - 1];
  const currentSenkouA = senkouAValues[senkouAValues.length - 1];
  const currentSenkouB = senkouBValues[senkouBValues.length - 1];

  // Calculate cloud position and signals
  const aboveCloud = currentPrice > Math.max(currentSenkouA, currentSenkouB);
  const belowCloud = currentPrice < Math.min(currentSenkouA, currentSenkouB);
  const inCloud = !aboveCloud && !belowCloud;

  const tenkanKijunBullish = currentTenkan > currentKijun;
  const cloudBullish = currentSenkouA > currentSenkouB;

  // Calculate trends
  const priceTrend = calculateTrend(closes.slice(-10));
  const tenkanTrend = calculateTrend(tenkanValues.slice(-5));
  const kijunTrend = calculateTrend(kijunValues.slice(-5));

  const forecast: ForecastPoint[] = [];

  for (let day = 1; day <= forecastDays; day++) {
    // Project future values
    const futureTenkan = currentTenkan + tenkanTrend * day;
    const futureKijun = currentKijun + kijunTrend * day;

    // Calculate price prediction based on Ichimoku signals
    let priceMultiplier = 1;

    if (aboveCloud && tenkanKijunBullish && cloudBullish) {
      // Strong bullish signal
      priceMultiplier = 1.02 + (Math.abs(priceTrend) / currentPrice) * 0.3;
    } else if (belowCloud && !tenkanKijunBullish && !cloudBullish) {
      // Strong bearish signal
      priceMultiplier = 0.98 - (Math.abs(priceTrend) / currentPrice) * 0.3;
    } else if (aboveCloud) {
      // Above cloud - moderate bullish
      priceMultiplier = 1.01 + (Math.abs(priceTrend) / currentPrice) * 0.15;
    } else if (belowCloud) {
      // Below cloud - moderate bearish
      priceMultiplier = 0.99 - (Math.abs(priceTrend) / currentPrice) * 0.15;
    } else {
      // In cloud - ranging/uncertain
      priceMultiplier = 1 + (priceTrend / currentPrice) * 0.05;
    }

    // Apply time decay
    const timeDecay = Math.exp(-day / 14);
    priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;

    const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 6);
    const volatility = calculateVolatility(closes.slice(-20));
    const confidence = calculateIchimokuConfidence(
      aboveCloud,
      belowCloud,
      inCloud,
      day,
      tenkanKijunBullish,
      cloudBullish
    );

    forecast.push({
      day,
      high: predictedPrice * (1 + volatility * 0.7),
      low: predictedPrice * (1 - volatility * 0.7),
      avg: predictedPrice,
      confidence,
      indicator: "ICHIMOKU",
    });
  }

  debug.success(`Ichimoku forecast generated: ${forecast.length} points`);
  return forecast;
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  let trend = 0;
  for (let i = 1; i < values.length; i++) {
    trend += values[i] - values[i - 1];
  }

  return trend / (values.length - 1);
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

function calculateIchimokuConfidence(
  aboveCloud: boolean,
  belowCloud: boolean,
  inCloud: boolean,
  day: number,
  tenkanKijunBullish: boolean,
  cloudBullish: boolean
): number {
  let confidence = 0.73;

  // Higher confidence with clear cloud position
  if (aboveCloud || belowCloud) {
    confidence = 0.85;
  }

  // Lower confidence when in cloud (uncertain)
  if (inCloud) {
    confidence = 0.6;
  }

  // Higher confidence when all signals align
  if (
    (aboveCloud && tenkanKijunBullish && cloudBullish) ||
    (belowCloud && !tenkanKijunBullish && !cloudBullish)
  ) {
    confidence += 0.1;
  }

  // Reduce confidence with time
  confidence *= Math.exp(-day / 16);

  return Math.max(Math.min(confidence, 0.95), 0.25);
}
