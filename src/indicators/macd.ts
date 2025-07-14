import { ForecastPoint } from "./index";
import { debug } from "../index";

// MACD calculation and forecasting
export async function calculateMACD(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  forecastDays: number
): Promise<ForecastPoint[]> {
  if (closes.length < 26) {
    throw new Error("MACD requires at least 26 data points");
  }

  debug.log(
    `Calculating MACD with ${closes.length} data points for ${forecastDays} day forecast`
  );

  // MACD parameters
  const fastPeriod = 12;
  const slowPeriod = 26;
  const signalPeriod = 9;

  // Calculate EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;

  for (let i = startIndex; i < fastEMA.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i - startIndex]);
  }

  // Calculate Signal line (EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Calculate Histogram (MACD - Signal)
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalPeriod - 1] - signalLine[i]);
  }

  // Get current values
  const currentPrice = closes[closes.length - 1];
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const currentHistogram = histogram[histogram.length - 1];

  // Analyze trends
  const macdTrend = calculateTrend(macdLine.slice(-5));
  const signalTrend = calculateTrend(signalLine.slice(-5));
  const histogramTrend = calculateTrend(histogram.slice(-3));

  // Determine signals
  const bullishCrossover =
    currentMACD > currentSignal && macdTrend > signalTrend;
  const bearishCrossover =
    currentMACD < currentSignal && macdTrend < signalTrend;
  const momentum = currentHistogram > 0 ? 1 : -1;

  const forecast: ForecastPoint[] = [];

  for (let day = 1; day <= forecastDays; day++) {
    // Project future MACD values
    const futureMACD = currentMACD + macdTrend * day;
    const futureSignal = currentSignal + signalTrend * day;
    const futureHistogram = currentHistogram + histogramTrend * day;

    // Calculate price prediction based on MACD signals
    let priceMultiplier = 1;

    // Crossover signals
    if (bullishCrossover) {
      priceMultiplier = 1.02 + (Math.abs(futureHistogram) / currentPrice) * 0.1;
    } else if (bearishCrossover) {
      priceMultiplier = 0.98 - (Math.abs(futureHistogram) / currentPrice) * 0.1;
    } else {
      // Momentum continuation
      priceMultiplier =
        1 + ((momentum * Math.abs(futureHistogram)) / currentPrice) * 0.05;
    }

    // Apply time decay
    const timeDecay = Math.exp(-day / 12);
    priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;

    const predictedPrice = currentPrice * Math.pow(priceMultiplier, day / 6);
    const volatility = calculateVolatility(closes.slice(-20));
    const confidence = calculateMACDConfidence(
      futureHistogram,
      day,
      bullishCrossover || bearishCrossover
    );

    // Validate prediction values to avoid NaN
    if (
      !isFinite(predictedPrice) ||
      !isFinite(volatility) ||
      !isFinite(confidence)
    ) {
      // Fallback to simple trend-based prediction
      const simplePrediction = currentPrice * (1 + momentum * 0.01 * day);
      forecast.push({
        day,
        high: simplePrediction * 1.02,
        low: simplePrediction * 0.98,
        avg: simplePrediction,
        confidence: 0.5,
        indicator: "MACD",
      });
      continue;
    }

    forecast.push({
      day,
      high: predictedPrice * (1 + volatility * 0.7),
      low: predictedPrice * (1 - volatility * 0.7),
      avg: predictedPrice,
      confidence,
      indicator: "MACD",
    });
  }

  debug.success(`MACD forecast generated: ${forecast.length} points`);
  return forecast;
}

// Calculate EMA values
function calculateEMA(prices: number[], period: number): number[] {
  const emaValues: number[] = [];
  const multiplier = 2 / (period + 1);

  let ema =
    prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  emaValues.push(ema);

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
    emaValues.push(ema);
  }

  return emaValues;
}

// Calculate trend
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;

  let trend = 0;
  for (let i = 1; i < values.length; i++) {
    trend += values[i] - values[i - 1];
  }

  return trend / (values.length - 1);
}

// Calculate volatility
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

// Calculate MACD confidence
function calculateMACDConfidence(
  histogram: number,
  day: number,
  crossover: boolean
): number {
  let confidence = 0.75;

  // Higher confidence with stronger histogram
  confidence += Math.min(Math.abs(histogram) * 0.1, 0.15);

  // Higher confidence during crossovers
  if (crossover) {
    confidence += 0.1;
  }

  // Reduce confidence with time
  confidence *= Math.exp(-day / 10);

  return Math.max(Math.min(confidence, 0.9), 0.3);
}
