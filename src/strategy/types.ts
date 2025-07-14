import { ForecastPoint, IndicatorResult } from "../indicators";

// Trade signal interface
export interface TradeSignal {
  recommendation: "buy" | "sell" | "neutral";
  reasons: string[];
  confidenceScore: number; // 0-1 confidence score
  timestamp: number;
  strategy: string;
}

// Strategy result interface
export interface StrategyResult {
  signal: TradeSignal;
  forecast: ForecastPoint[];
  name: string;
  accuracy: number;
  weight: number;
  executionTime: number;
}

// Strategy configuration interface
export interface StrategyConfig {
  forecastDays: number;
  symbol: string;
  lookbackPeriod?: number;
  sensitivity?: number;
  riskLevel?: "low" | "medium" | "high";
}

// Base strategy interface
export interface Strategy {
  name: string;
  description: string;
  execute(
    indicators: IndicatorResult[],
    config: StrategyConfig
  ): Promise<StrategyResult>;
}

// Performance: Cache for strategy calculations (equivalent to useMemo)
const strategyCache = new Map<
  string,
  {
    result: StrategyResult;
    timestamp: number;
    expires: number;
  }
>();

// Cache configuration
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for strategies
const MAX_CACHE_SIZE = 30;

// Cache cleanup function (equivalent to useCallback)
export const cleanupStrategyCache = (() => {
  let lastCleanup = 0;
  return () => {
    const now = Date.now();
    // Only cleanup every 30 seconds to avoid excessive work
    if (now - lastCleanup < 30000) return;
    lastCleanup = now;

    for (const [key, value] of strategyCache.entries()) {
      if (now > value.expires) {
        strategyCache.delete(key);
      }
    }

    // If still too many entries, remove oldest
    if (strategyCache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(strategyCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, strategyCache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => strategyCache.delete(key));
    }
  };
})();

// Generate cache key for strategies
export function generateStrategyCacheKey(
  strategyName: string,
  config: StrategyConfig,
  indicatorsSignature: string
): string {
  const configSignature = `${config.symbol}:${config.forecastDays}:${
    config.lookbackPeriod || "default"
  }:${config.sensitivity || "default"}:${config.riskLevel || "medium"}`;
  return `strategy:${strategyName}:${configSignature}:${indicatorsSignature}`;
}

// Get cached strategy result (equivalent to useMemo)
export function getCachedStrategyResult(
  cacheKey: string
): StrategyResult | null {
  cleanupStrategyCache();
  const cached = strategyCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    return cached.result;
  }

  return null;
}

// Set cached strategy result (equivalent to useMemo)
export function setCachedStrategyResult(
  cacheKey: string,
  result: StrategyResult
): void {
  cleanupStrategyCache();
  strategyCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    expires: Date.now() + CACHE_DURATION,
  });
}

// Get strategy cache stats
export function getStrategyCacheStats() {
  return {
    size: strategyCache.size,
    maxSize: MAX_CACHE_SIZE,
    cacheDuration: CACHE_DURATION,
    hitRate: 0, // Can be calculated based on usage
  };
}

// Clear strategy cache
export function clearStrategyCache(): void {
  strategyCache.clear();
}

// Debug strategy cache contents
export function debugStrategyCacheContents(): void {
  console.log("Strategy Cache Contents:");
  for (const [key, value] of strategyCache.entries()) {
    console.log(`  ${key}: expires in ${value.expires - Date.now()}ms`);
  }
}

// Utility functions for strategy calculations
export function calculateIndicatorSignature(
  indicators: IndicatorResult[]
): string {
  return indicators
    .map(
      (ind) =>
        `${ind.name}:${ind.accuracy.toFixed(2)}:${ind.weight.toFixed(2)}:${
          ind.forecast.length
        }`
    )
    .join("|");
}

// Helper function to calculate average from forecast points
export function calculateAveragePrice(forecasts: ForecastPoint[]): number {
  if (forecasts.length === 0) return 0;
  return (
    forecasts.reduce((sum, point) => sum + point.avg, 0) / forecasts.length
  );
}

// Helper function to calculate trend from forecast points
export function calculateTrend(
  forecasts: ForecastPoint[]
): "bullish" | "bearish" | "neutral" {
  if (forecasts.length < 2) return "neutral";

  const firstHalf = forecasts.slice(0, Math.floor(forecasts.length / 2));
  const secondHalf = forecasts.slice(Math.floor(forecasts.length / 2));

  const firstAvg = calculateAveragePrice(firstHalf);
  const secondAvg = calculateAveragePrice(secondHalf);

  const change = (secondAvg - firstAvg) / firstAvg;

  if (change > 0.02) return "bullish";
  if (change < -0.02) return "bearish";
  return "neutral";
}

// Helper function to calculate volatility from forecast points
export function calculateVolatility(forecasts: ForecastPoint[]): number {
  if (forecasts.length < 2) return 0;

  const prices = forecasts.map((f) => f.avg);
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
    prices.length;

  return Math.sqrt(variance) / mean; // Coefficient of variation
}
