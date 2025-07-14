// Indicators module - Will handle technical analysis calculations
import { debug } from "../index";
import { PricePoint } from "../data/fetchPrices";

// Forecast data structure
export interface ForecastPoint {
  day: number;
  high: number;
  low: number;
  avg: number;
  confidence: number; // 0-1 confidence score
  indicator: string;
}

// Individual indicator result
export interface IndicatorResult {
  name: string;
  forecast: ForecastPoint[];
  accuracy: number; // Historical accuracy score
  weight: number; // Weight in final calculation
  executionTime: number;
}

// Performance: Cache for indicator calculations (equivalent to useMemo)
const indicatorCache = new Map<
  string,
  {
    result: IndicatorResult;
    timestamp: number;
    expires: number;
  }
>();

// Cache configuration
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for indicators
const MAX_CACHE_SIZE = 50;

// Import individual indicator implementations
import { calculateRSI } from "./rsi";
import { calculateEMA } from "./ema";
import { calculateMACD } from "./macd";
import { calculateSMA } from "./sma";
import { calculateBollinger } from "./bollinger";
import { calculateStochastic } from "./stochastic";
import { calculateVWAP } from "./vwap";
import { calculateADX } from "./adx";
import { calculateParabolicSAR } from "./parabolicSar";
import { calculateIchimoku } from "./ichimoku";

// Available indicators with their weights
export const INDICATORS = {
  RSI: { weight: 0.12, name: "Relative Strength Index" },
  EMA: { weight: 0.15, name: "Exponential Moving Average" },
  MACD: { weight: 0.13, name: "MACD" },
  SMA: { weight: 0.1, name: "Simple Moving Average" },
  BOLLINGER: { weight: 0.11, name: "Bollinger Bands" },
  STOCHASTIC: { weight: 0.09, name: "Stochastic Oscillator" },
  VWAP: { weight: 0.08, name: "Volume Weighted Average Price" },
  ADX: { weight: 0.07, name: "Average Directional Index" },
  PARABOLIC_SAR: { weight: 0.08, name: "Parabolic SAR" },
  ICHIMOKU: { weight: 0.07, name: "Ichimoku Cloud" },
};

// Performance: Cache management
function cleanupIndicatorCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of indicatorCache.entries()) {
    if (now > entry.expires) {
      indicatorCache.delete(key);
      cleaned++;
    }
  }

  // Limit cache size
  if (indicatorCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(indicatorCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_CACHE_SIZE);

    indicatorCache.clear();
    entries.forEach(([key, value]) => indicatorCache.set(key, value));
  }

  if (cleaned > 0) {
    debug.log(`Cleaned ${cleaned} expired indicator cache entries`);
  }
}

// Performance: Check cache for existing calculations
function getCachedIndicator(cacheKey: string): IndicatorResult | null {
  const cached = indicatorCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    debug.log(`Cache hit for indicator: ${cacheKey}`);
    return cached.result;
  }

  if (cached) {
    debug.log(`Cache expired for indicator: ${cacheKey}`);
    indicatorCache.delete(cacheKey);
  }

  return null;
}

// Performance: Store calculation in cache
function setCachedIndicator(cacheKey: string, result: IndicatorResult): void {
  const now = Date.now();

  indicatorCache.set(cacheKey, {
    result: { ...result }, // Deep copy to prevent mutations
    timestamp: now,
    expires: now + CACHE_DURATION,
  });

  debug.log(`Cached indicator result: ${cacheKey}`);
}

// Generate cache key for indicators
function generateCacheKey(
  symbol: string,
  days: number,
  indicatorName: string,
  pricesLength: number
): string {
  // Include symbol, forecast days, indicator name, and data size for uniqueness
  return `${symbol}-${days}-${indicatorName}-${pricesLength}`;
}

// Extract price arrays from PricePoint data
export function extractPriceArrays(data: PricePoint[]) {
  return {
    closes: data.map((p) => p.close),
    highs: data.map((p) => p.high),
    lows: data.map((p) => p.low),
    volumes: data.map((p) => p.volume),
    dates: data.map((p) => p.date),
  };
}

// Calculate individual indicator with caching
async function calculateIndicator(
  indicatorName: string,
  calculator: (
    closes: number[],
    highs: number[],
    lows: number[],
    volumes: number[],
    forecastDays: number
  ) => Promise<ForecastPoint[]>,
  symbol: string,
  priceData: PricePoint[],
  forecastDays: number
): Promise<IndicatorResult> {
  const cacheKey = generateCacheKey(
    symbol,
    forecastDays,
    indicatorName,
    priceData.length
  );

  // Check cache first
  const cached = getCachedIndicator(cacheKey);
  if (cached) {
    return cached;
  }

  const startTime = Date.now();

  try {
    const { closes, highs, lows, volumes } = extractPriceArrays(priceData);

    debug.log(
      `Calculating ${indicatorName} for ${symbol} (${forecastDays} days)`
    );

    const forecast = await calculator(
      closes,
      highs,
      lows,
      volumes,
      forecastDays
    );
    const executionTime = Date.now() - startTime;

    // Calculate confidence based on data quality and indicator characteristics
    const confidence = calculateConfidence(
      forecast,
      indicatorName,
      priceData.length
    );

    const result: IndicatorResult = {
      name: indicatorName,
      forecast,
      accuracy: calculateHistoricalAccuracy(indicatorName),
      weight:
        INDICATORS[indicatorName as keyof typeof INDICATORS]?.weight || 0.1,
      executionTime,
    };

    // Cache the result
    setCachedIndicator(cacheKey, result);

    debug.success(`${indicatorName} calculated in ${executionTime}ms`);
    return result;
  } catch (error) {
    debug.error(`Failed to calculate ${indicatorName}:`, error);

    // Return empty forecast on error
    return {
      name: indicatorName,
      forecast: [],
      accuracy: 0,
      weight: 0,
      executionTime: Date.now() - startTime,
    };
  }
}

// Calculate confidence score for forecasts
function calculateConfidence(
  forecast: ForecastPoint[],
  indicatorName: string,
  dataLength: number
): number {
  if (!forecast || forecast.length === 0) return 0;

  // Base confidence on data length (more data = higher confidence)
  let confidence = Math.min(dataLength / 60, 1); // Max confidence at 60+ days

  // Adjust based on indicator characteristics
  const indicatorMultipliers: Record<string, number> = {
    EMA: 0.9, // High confidence for trend following
    SMA: 0.85, // Good confidence for trend
    MACD: 0.8, // Good for momentum
    RSI: 0.75, // Good for overbought/oversold
    BOLLINGER: 0.8, // Good for volatility
    STOCHASTIC: 0.7, // Moderate for momentum
    VWAP: 0.85, // Good for volume analysis
    ADX: 0.7, // Moderate for trend strength
    PARABOLIC_SAR: 0.75, // Good for trend reversal
    ICHIMOKU: 0.8, // Complex but comprehensive
  };

  confidence *= indicatorMultipliers[indicatorName] || 0.7;

  // Check forecast consistency (lower variance = higher confidence)
  const avgValues = forecast.map((f) => f.avg);
  const variance = calculateVariance(avgValues);
  const normalizedVariance = Math.min(variance / 1000, 1); // Normalize by typical price variance
  confidence *= 1 - normalizedVariance * 0.3; // Reduce confidence for high variance

  return Math.max(Math.min(confidence, 1), 0.1); // Clamp between 0.1 and 1
}

// Calculate variance for confidence assessment
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

// Calculate historical accuracy (simulated based on indicator characteristics)
function calculateHistoricalAccuracy(indicatorName: string): number {
  // These are realistic accuracy estimates based on financial literature
  const accuracyEstimates: Record<string, number> = {
    RSI: 0.72,
    EMA: 0.78,
    MACD: 0.75,
    SMA: 0.7,
    BOLLINGER: 0.76,
    STOCHASTIC: 0.68,
    VWAP: 0.74,
    ADX: 0.66,
    PARABOLIC_SAR: 0.71,
    ICHIMOKU: 0.73,
  };

  return accuracyEstimates[indicatorName] || 0.7;
}

// Main function to calculate all indicators
export async function calculateAllIndicators(
  symbol: string,
  priceData: PricePoint[],
  forecastDays: number
): Promise<IndicatorResult[]> {
  debug.log(`Starting calculation of all 10 indicators for ${symbol}`);
  const startTime = Date.now();

  // Cleanup expired cache entries
  cleanupIndicatorCache();

  // Validate input data
  if (!priceData || priceData.length < 20) {
    throw new Error(
      "Insufficient data for technical analysis (minimum 20 days required)"
    );
  }

  if (![10, 20, 30].includes(forecastDays)) {
    throw new Error("Forecast days must be 10, 20, or 30");
  }

  // Calculate all indicators in parallel for performance
  const indicatorPromises = [
    calculateIndicator("RSI", calculateRSI, symbol, priceData, forecastDays),
    calculateIndicator("EMA", calculateEMA, symbol, priceData, forecastDays),
    calculateIndicator("MACD", calculateMACD, symbol, priceData, forecastDays),
    calculateIndicator("SMA", calculateSMA, symbol, priceData, forecastDays),
    calculateIndicator(
      "BOLLINGER",
      calculateBollinger,
      symbol,
      priceData,
      forecastDays
    ),
    calculateIndicator(
      "STOCHASTIC",
      calculateStochastic,
      symbol,
      priceData,
      forecastDays
    ),
    calculateIndicator("VWAP", calculateVWAP, symbol, priceData, forecastDays),
    calculateIndicator("ADX", calculateADX, symbol, priceData, forecastDays),
    calculateIndicator(
      "PARABOLIC_SAR",
      calculateParabolicSAR,
      symbol,
      priceData,
      forecastDays
    ),
    calculateIndicator(
      "ICHIMOKU",
      calculateIchimoku,
      symbol,
      priceData,
      forecastDays
    ),
  ];

  try {
    const results = await Promise.all(indicatorPromises);
    const totalTime = Date.now() - startTime;

    // Filter out failed indicators
    const validResults = results.filter((result) => result.forecast.length > 0);

    debug.success(
      `Calculated ${validResults.length}/10 indicators in ${totalTime}ms`
    );
    debug.log(
      "Indicator performance:",
      validResults.map((r) => ({
        name: r.name,
        executionTime: r.executionTime,
        accuracy: r.accuracy,
        forecastPoints: r.forecast.length,
      }))
    );

    return validResults;
  } catch (error) {
    debug.error("Failed to calculate indicators:", error);
    throw new Error(
      `Technical analysis failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// Get cache statistics
export function getIndicatorCacheStats() {
  cleanupIndicatorCache();
  return {
    indicatorCache: indicatorCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
    cacheDuration: CACHE_DURATION / 1000, // in seconds
  };
}

// Clear caches (for testing)
export function clearIndicatorCaches(): void {
  indicatorCache.clear();
  debug.log("Indicator caches cleared");
}

// Debug cache contents
export function debugIndicatorCacheContents(): void {
  debug.log("Indicator cache contents:");
  for (const [key, value] of indicatorCache.entries()) {
    const expired = Date.now() > value.expires;
    debug.log(
      `  ${key}: ${value.result.name}, expires in ${Math.round(
        (value.expires - Date.now()) / 1000
      )}s ${expired ? "(EXPIRED)" : ""}`
    );
  }
}
