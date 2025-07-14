import { ForecastPoint } from "./index";
import { debug } from "../index";

// RSI calculation and forecasting
export async function calculateRSI(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  forecastDays: number
): Promise<ForecastPoint[]> {
  if (closes.length < 14) {
    throw new Error("RSI requires at least 14 data points");
  }

  debug.log(
    `Calculating RSI with ${closes.length} data points for ${forecastDays} day forecast`
  );

  // Calculate RSI values for historical data
  const period = 14;
  const rsiValues: number[] = [];

  // Calculate initial average gains and losses
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate RSI for the rest of the data
  for (let i = period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    // Exponential moving average
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgGain / (avgLoss || 0.0001); // Avoid division by zero
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(rsi);
  }

  // Get recent RSI trend
  const recentRSI = rsiValues.slice(-10); // Last 10 RSI values
  const currentRSI = recentRSI[recentRSI.length - 1];
  const currentPrice = closes[closes.length - 1];

  // Calculate RSI trend
  const rsiTrend = calculateTrend(recentRSI);

  // Generate forecast based on RSI signals
  const forecast: ForecastPoint[] = [];

  for (let day = 1; day <= forecastDays; day++) {
    // Predict future RSI
    let futureRSI = currentRSI + rsiTrend * day;
    futureRSI = Math.max(0, Math.min(100, futureRSI)); // Clamp between 0-100

    // Convert RSI signals to price predictions
    let priceMultiplier = 1;

    if (futureRSI > 70) {
      // Overbought - expect price decline
      priceMultiplier = 0.98 - ((futureRSI - 70) / 30) * 0.05;
    } else if (futureRSI < 30) {
      // Oversold - expect price increase
      priceMultiplier = 1.02 + ((30 - futureRSI) / 30) * 0.05;
    } else {
      // Neutral zone - slight continuation of trend
      const momentum = (futureRSI - 50) / 50; // -1 to 1
      priceMultiplier = 1 + momentum * 0.02;
    }

    // Apply time decay (less confidence further out)
    const timeDecay = Math.exp(-day / 10);
    priceMultiplier = 1 + (priceMultiplier - 1) * timeDecay;

    const predictedPrice = currentPrice * Math.pow(priceMultiplier, day);
    const volatility = calculateVolatility(closes.slice(-20));
    const confidence = calculateRSIConfidence(futureRSI, day);

    forecast.push({
      day,
      high: predictedPrice * (1 + volatility * 0.5),
      low: predictedPrice * (1 - volatility * 0.5),
      avg: predictedPrice,
      confidence,
      indicator: "RSI",
    });
  }

  debug.success(`RSI forecast generated: ${forecast.length} points`);
  return forecast;
}

// Calculate trend in RSI values
function calculateTrend(rsiValues: number[]): number {
  if (rsiValues.length < 2) return 0;

  let trend = 0;
  for (let i = 1; i < rsiValues.length; i++) {
    trend += rsiValues[i] - rsiValues[i - 1];
  }

  return trend / (rsiValues.length - 1);
}

// Calculate price volatility
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0.02; // Default 2% volatility

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

// Calculate confidence based on RSI values
function calculateRSIConfidence(rsi: number, day: number): number {
  let confidence = 0.8;

  // Higher confidence in extreme zones
  if (rsi > 70 || rsi < 30) {
    confidence = 0.9;
  } else if (rsi > 60 || rsi < 40) {
    confidence = 0.85;
  }

  // Reduce confidence with time
  confidence *= Math.exp(-day / 15);

  return Math.max(confidence, 0.3);
}
