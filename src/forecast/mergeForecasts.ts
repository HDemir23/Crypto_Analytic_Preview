import { debug } from "../index";
import { ForecastPoint, IndicatorResult } from "../indicators";

// Performance: Cache for merged forecasts (equivalent to useMemo)
const mergedForecastCache = new Map<
  string,
  {
    result: ForecastPoint[];
    timestamp: number;
    expires: number;
  }
>();

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for merged forecasts
const MAX_CACHE_SIZE = 20;

// Cache cleanup function
function cleanupMergedForecastCache(): void {
  const now = Date.now();
  for (const [key, value] of mergedForecastCache.entries()) {
    if (now > value.expires) {
      mergedForecastCache.delete(key);
    }
  }

  // If still too many entries, remove oldest
  if (mergedForecastCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(mergedForecastCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(
      0,
      mergedForecastCache.size - MAX_CACHE_SIZE
    );
    toRemove.forEach(([key]) => mergedForecastCache.delete(key));
  }
}

// Generate cache key for merged forecasts
function generateMergedForecastCacheKey(
  indicators: IndicatorResult[],
  days: number
): string {
  const indicatorSignature = indicators
    .map(
      (ind) =>
        `${ind.name}:${ind.accuracy}:${ind.weight}:${ind.forecast.length}`
    )
    .join("|");
  return `merged_forecast:${days}:${indicatorSignature}`;
}

// Get cached merged forecast
function getCachedMergedForecast(cacheKey: string): ForecastPoint[] | null {
  cleanupMergedForecastCache();
  const cached = mergedForecastCache.get(cacheKey);

  if (cached && Date.now() <= cached.expires) {
    debug.log(`Cache hit for merged forecast: ${cacheKey}`);
    return cached.result;
  }

  return null;
}

// Set cached merged forecast
function setCachedMergedForecast(
  cacheKey: string,
  result: ForecastPoint[]
): void {
  cleanupMergedForecastCache();
  mergedForecastCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    expires: Date.now() + CACHE_DURATION,
  });
}

/**
 * Merge multiple indicator forecasts into a single weighted average forecast
 * @param indicators - Array of indicator results with their forecasts
 * @param days - Number of days to forecast
 * @returns Unified ForecastPoint[] with averaged values
 */
export function mergeForecasts(
  indicators: IndicatorResult[],
  days: number
): ForecastPoint[] {
  const startTime = Date.now();

  // Generate cache key
  const cacheKey = generateMergedForecastCacheKey(indicators, days);

  // Check cache first
  const cached = getCachedMergedForecast(cacheKey);
  if (cached) {
    debug.log(`Using cached merged forecast (${Date.now() - startTime}ms)`);
    return cached;
  }

  debug.log(
    `Merging forecasts from ${indicators.length} indicators for ${days} days`
  );

  // Calculate total weight for normalization
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);

  if (totalWeight === 0) {
    debug.warn("Total weight is zero, using equal weights");
    indicators.forEach((ind) => (ind.weight = 1));
  }

  const mergedForecast: ForecastPoint[] = [];

  // Process each day
  for (let day = 1; day <= days; day++) {
    let weightedHigh = 0;
    let weightedLow = 0;
    let weightedAvg = 0;
    let weightedConfidence = 0;
    let contributingIndicators = 0;

    // Aggregate values from all indicators for this day
    indicators.forEach((indicator) => {
      const dayForecast = indicator.forecast.find((f) => f.day === day);
      if (dayForecast) {
        const normalizedWeight = indicator.weight / totalWeight;
        weightedHigh += dayForecast.high * normalizedWeight;
        weightedLow += dayForecast.low * normalizedWeight;
        weightedAvg += dayForecast.avg * normalizedWeight;
        weightedConfidence += dayForecast.confidence * normalizedWeight;
        contributingIndicators++;
      }
    });

    // Add safety check for missing data
    if (contributingIndicators === 0) {
      debug.warn(`No indicators provided forecast for day ${day}`);
      continue;
    }

    // Validate merged values to avoid NaN
    const validHigh = isFinite(weightedHigh) ? weightedHigh : 0;
    const validLow = isFinite(weightedLow) ? weightedLow : 0;
    const validAvg = isFinite(weightedAvg) ? weightedAvg : 0;
    const validConfidence = isFinite(weightedConfidence)
      ? weightedConfidence
      : 0;

    // Create merged forecast point
    const mergedPoint: ForecastPoint = {
      day,
      high: validHigh,
      low: validLow,
      avg: validAvg,
      confidence: validConfidence,
      indicator: "MERGED_AVERAGE",
    };

    mergedForecast.push(mergedPoint);
  }

  const executionTime = Date.now() - startTime;
  debug.success(`Merged forecast generated in ${executionTime}ms`);

  // Cache the result
  setCachedMergedForecast(cacheKey, mergedForecast);

  return mergedForecast;
}

/**
 * Calculate additional statistics for the merged forecast
 * @param mergedForecast - The merged forecast points
 * @param indicators - The original indicator results
 * @returns Statistics object with analysis
 */
export function calculateMergedForecastStats(
  mergedForecast: ForecastPoint[],
  indicators: IndicatorResult[]
) {
  const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
  const avgConfidence =
    mergedForecast.reduce((sum, point) => sum + point.confidence, 0) /
    mergedForecast.length;

  // Calculate price range
  const allHighs = mergedForecast.map((p) => p.high);
  const allLows = mergedForecast.map((p) => p.low);
  const maxHigh = Math.max(...allHighs);
  const minLow = Math.min(...allLows);

  // Calculate trend direction
  const firstAvg = mergedForecast[0]?.avg || 0;
  const lastAvg = mergedForecast[mergedForecast.length - 1]?.avg || 0;
  const trendDirection = lastAvg > firstAvg ? "BULLISH" : "BEARISH";
  const trendStrength = Math.abs((lastAvg - firstAvg) / firstAvg) * 100;

  return {
    totalWeight,
    avgConfidence,
    priceRange: {
      high: maxHigh,
      low: minLow,
      spread: maxHigh - minLow,
    },
    trend: {
      direction: trendDirection,
      strength: trendStrength,
    },
    contributingIndicators: indicators.length,
    forecastDays: mergedForecast.length,
  };
}

/**
 * Get merged forecast cache statistics
 * @returns Cache statistics object
 */
export function getMergedForecastCacheStats() {
  return {
    size: mergedForecastCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(mergedForecastCache.entries()).map(([key, value]) => ({
      key,
      timestamp: value.timestamp,
      expires: value.expires,
      age: Date.now() - value.timestamp,
    })),
  };
}

/**
 * Clear merged forecast cache
 */
export function clearMergedForecastCache(): void {
  mergedForecastCache.clear();
  debug.log("Merged forecast cache cleared");
}

/**
 * Debug merged forecast cache contents
 */
export function debugMergedForecastCacheContents(): void {
  console.log("🔍 Merged Forecast Cache Contents:");
  console.log(`  Size: ${mergedForecastCache.size}/${MAX_CACHE_SIZE}`);

  if (mergedForecastCache.size > 0) {
    mergedForecastCache.forEach((value, key) => {
      const age = Date.now() - value.timestamp;
      const remaining = value.expires - Date.now();
      console.log(`  ${key}: age=${age}ms, remaining=${remaining}ms`);
    });
  } else {
    console.log("  (empty)");
  }
}
