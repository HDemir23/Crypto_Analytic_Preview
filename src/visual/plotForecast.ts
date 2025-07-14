import * as asciichart from "asciichart";
import chalk from "chalk";
import { IndicatorResult, ForecastPoint } from "../indicators";
import { debug } from "../index";

// ASCII chart configuration
const CHART_CONFIG = {
  height: 12,
  padding: "  ",
  colors: [
    chalk.green, // Primary line (avg)
    chalk.blue, // High line
    chalk.red, // Low line
    chalk.yellow, // Additional lines
    chalk.magenta, // Additional lines
    chalk.cyan, // Additional lines
  ],
  format: (value: number, idx: number) => {
    return `$${value.toFixed(2)}`.padStart(10);
  },
};

// Performance cache for charts (equivalent to useMemo)
const chartCache = new Map<
  string,
  {
    chart: string;
    timestamp: number;
    expires: number;
  }
>();

const CHART_CACHE_DURATION = 60 * 1000; // 1 minute cache
const MAX_CHART_CACHE_SIZE = 20;

// Cache management
function cleanupChartCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of chartCache.entries()) {
    if (now > entry.expires) {
      chartCache.delete(key);
      cleaned++;
    }
  }

  // Limit cache size
  if (chartCache.size > MAX_CHART_CACHE_SIZE) {
    const entries = Array.from(chartCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_CHART_CACHE_SIZE);

    chartCache.clear();
    entries.forEach(([key, value]) => chartCache.set(key, value));
  }

  if (cleaned > 0) {
    debug.log(`Cleaned ${cleaned} expired chart cache entries`);
  }
}

// Get cached chart
function getCachedChart(cacheKey: string): string | null {
  const cached = chartCache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    debug.log(`Chart cache hit: ${cacheKey}`);
    return cached.chart;
  }

  if (cached) {
    debug.log(`Chart cache expired: ${cacheKey}`);
    chartCache.delete(cacheKey);
  }

  return null;
}

// Set cached chart
function setCachedChart(cacheKey: string, chart: string): void {
  const now = Date.now();

  chartCache.set(cacheKey, {
    chart,
    timestamp: now,
    expires: now + CHART_CACHE_DURATION,
  });

  debug.log(`Cached chart: ${cacheKey}`);
}

// Generate cache key for charts
function generateChartCacheKey(
  indicatorName: string,
  forecast: ForecastPoint[]
): string {
  const dataHash = forecast.map((f) => f.avg.toFixed(2)).join(",");
  return `${indicatorName}-${forecast.length}-${dataHash.slice(0, 50)}`;
}

// Plot individual indicator forecast
export function plotIndicatorForecast(indicator: IndicatorResult): string {
  cleanupChartCache();

  const cacheKey = generateChartCacheKey(indicator.name, indicator.forecast);
  const cached = getCachedChart(cacheKey);
  if (cached) return cached;

  debug.log(`Generating ASCII chart for ${indicator.name}`);

  if (!indicator.forecast || indicator.forecast.length === 0) {
    return chalk.red(`No forecast data available for ${indicator.name}`);
  }

  // Extract data series
  const days = indicator.forecast.map((f) => f.day);
  const avgPrices = indicator.forecast.map((f) => f.avg);
  const highPrices = indicator.forecast.map((f) => f.high);
  const lowPrices = indicator.forecast.map((f) => f.low);
  const confidences = indicator.forecast.map((f) => f.confidence * 100);

  // Calculate price range for better scaling
  const allPrices = [...avgPrices, ...highPrices, ...lowPrices];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  // Create ASCII chart for average prices
  const chartData = avgPrices;

  // Validate chart data for NaN or infinite values
  const validChartData = chartData.filter((val) => isFinite(val));
  if (validChartData.length === 0) {
    debug.warn(`No valid data for ${indicator.name} chart`);
    return `No valid data available for ${indicator.name} chart`;
  }

  // If we have some invalid data, replace with interpolated values
  const cleanedChartData = chartData.map((val, index) => {
    if (!isFinite(val)) {
      // Use previous valid value or average of valid data
      const previousValid =
        index > 0 ? chartData[index - 1] : validChartData[0];
      return isFinite(previousValid) ? previousValid : validChartData[0];
    }
    return val;
  });

  try {
    const chart = asciichart.plot(cleanedChartData, {
      height: CHART_CONFIG.height,
      format: CHART_CONFIG.format,
      padding: CHART_CONFIG.padding,
    });

    // Build complete visualization
    const result = buildIndicatorVisualization(
      indicator,
      chart,
      avgPrices,
      highPrices,
      lowPrices,
      confidences
    );

    // Cache the result
    setCachedChart(cacheKey, result);

    return result;
  } catch (error) {
    debug.error(`Failed to generate chart for ${indicator.name}:`, error);
    return chalk.red(`Chart generation failed for ${indicator.name}`);
  }
}

// Build complete indicator visualization
function buildIndicatorVisualization(
  indicator: IndicatorResult,
  chart: string,
  avgPrices: number[],
  highPrices: number[],
  lowPrices: number[],
  confidences: number[]
): string {
  const currentPrice = avgPrices[0];
  const finalPrice = avgPrices[avgPrices.length - 1];
  const priceChange = finalPrice - currentPrice;
  const percentChange = ((priceChange / currentPrice) * 100).toFixed(2);
  const avgConfidence = (
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  ).toFixed(1);

  const changeColor = priceChange >= 0 ? chalk.green : chalk.red;
  const changeSymbol = priceChange >= 0 ? "↗" : "↘";

  let result = "";

  // Header
  result += chalk.cyan(`\n┌${"─".repeat(65)}┐\n`);
  result += chalk.cyan(
    `│ ${chalk.bold.white(indicator.name.padEnd(30))} │ ${chalk.yellow(
      "Accuracy:"
    )} ${chalk.white((indicator.accuracy * 100).toFixed(1) + "%")} │\n`
  );
  result += chalk.cyan(
    `│ ${changeColor(
      changeSymbol + " " + percentChange + "%"
    )} change expected${" ".repeat(10)} │ ${chalk.yellow(
      "Confidence:"
    )} ${chalk.white(avgConfidence + "%")} │\n`
  );
  result += chalk.cyan(`└${"─".repeat(65)}┘\n`);

  // ASCII Chart
  result += chalk.green(chart) + "\n";

  // Forecast table (first 10 days or all if less)
  const displayDays = Math.min(indicator.forecast.length, 10);

  result += chalk.yellow(
    `\n┌──────┬────────────┬────────────┬────────────┬─────────────┐\n`
  );
  result += chalk.yellow(
    `│ Day  │    High    │    Low     │    Avg     │ Confidence  │\n`
  );
  result += chalk.yellow(
    `├──────┼────────────┼────────────┼────────────┼─────────────┤\n`
  );

  for (let i = 0; i < displayDays; i++) {
    const forecast = indicator.forecast[i];
    const dayStr = forecast.day.toString().padStart(4);
    const highStr = `$${forecast.high.toFixed(2)}`.padStart(10);
    const lowStr = `$${forecast.low.toFixed(2)}`.padStart(10);
    const avgStr = `$${forecast.avg.toFixed(2)}`.padStart(10);
    const confStr = `${(forecast.confidence * 100).toFixed(1)}%`.padStart(11);

    result += chalk.yellow(
      `│ ${dayStr} │ ${highStr} │ ${lowStr} │ ${avgStr} │ ${confStr} │\n`
    );
  }

  if (indicator.forecast.length > 10) {
    result += chalk.yellow(
      `│  ... │    ...     │    ...     │    ...     │     ...     │\n`
    );
    const lastForecast = indicator.forecast[indicator.forecast.length - 1];
    const dayStr = lastForecast.day.toString().padStart(4);
    const highStr = `$${lastForecast.high.toFixed(2)}`.padStart(10);
    const lowStr = `$${lastForecast.low.toFixed(2)}`.padStart(10);
    const avgStr = `$${lastForecast.avg.toFixed(2)}`.padStart(10);
    const confStr = `${(lastForecast.confidence * 100).toFixed(1)}%`.padStart(
      11
    );

    result += chalk.yellow(
      `│ ${dayStr} │ ${highStr} │ ${lowStr} │ ${avgStr} │ ${confStr} │\n`
    );
  }

  result += chalk.yellow(
    `└──────┴────────────┴────────────┴────────────┴─────────────┘\n`
  );

  return result;
}

// Plot combined forecast from all indicators
export function plotCombinedForecast(
  indicators: IndicatorResult[],
  weightedForecast: Array<{
    day: number;
    high: number;
    low: number;
    avg: number;
    confidence: number;
  }>
): string {
  debug.log(
    `Generating combined ASCII chart for ${indicators.length} indicators`
  );

  if (!weightedForecast || weightedForecast.length === 0) {
    return chalk.red("No combined forecast data available");
  }

  const cacheKey = `combined-${indicators.length}-${
    weightedForecast.length
  }-${weightedForecast[0].avg.toFixed(2)}`;
  const cached = getCachedChart(cacheKey);
  if (cached) return cached;

  // Extract combined data
  const avgPrices = weightedForecast.map((f) => f.avg);
  const highPrices = weightedForecast.map((f) => f.high);
  const lowPrices = weightedForecast.map((f) => f.low);
  const confidences = weightedForecast.map((f) => f.confidence * 100);

  try {
    // Validate chart data for NaN or infinite values
    const validChartData = avgPrices.filter((val) => isFinite(val));
    if (validChartData.length === 0) {
      debug.warn(`No valid data for combined forecast chart`);
      return `No valid data available for combined forecast chart`;
    }

    // If we have some invalid data, replace with interpolated values
    const cleanedChartData = avgPrices.map((val, index) => {
      if (!isFinite(val)) {
        // Use previous valid value or average of valid data
        const previousValid =
          index > 0 ? avgPrices[index - 1] : validChartData[0];
        return isFinite(previousValid) ? previousValid : validChartData[0];
      }
      return val;
    });

    // Create main chart for average prices
    const mainChart = asciichart.plot(cleanedChartData, {
      height: CHART_CONFIG.height + 2,
      format: CHART_CONFIG.format,
      padding: CHART_CONFIG.padding,
    });

    // Build complete combined visualization
    const result = buildCombinedVisualization(
      indicators,
      weightedForecast,
      mainChart,
      avgPrices,
      highPrices,
      lowPrices,
      confidences
    );

    // Cache the result
    setCachedChart(cacheKey, result);

    return result;
  } catch (error) {
    debug.error("Failed to generate combined chart:", error);
    return chalk.red("Combined chart generation failed");
  }
}

// Build complete combined visualization
function buildCombinedVisualization(
  indicators: IndicatorResult[],
  weightedForecast: Array<{
    day: number;
    high: number;
    low: number;
    avg: number;
    confidence: number;
  }>,
  chart: string,
  avgPrices: number[],
  highPrices: number[],
  lowPrices: number[],
  confidences: number[]
): string {
  const currentPrice = avgPrices[0];
  const finalPrice = avgPrices[avgPrices.length - 1];
  const priceChange = finalPrice - currentPrice;
  const percentChange = ((priceChange / currentPrice) * 100).toFixed(2);
  const avgConfidence = (
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  ).toFixed(1);
  const totalWeight = indicators
    .reduce((sum, ind) => sum + ind.weight, 0)
    .toFixed(2);

  const changeColor = priceChange >= 0 ? chalk.green : chalk.red;
  const changeSymbol = priceChange >= 0 ? "📈" : "📉";

  let result = "";

  // Header with combined stats
  result += chalk.magenta(`\n┌${"─".repeat(70)}┐\n`);
  result += chalk.magenta(
    `│ ${chalk.bold.white("🎯 COMBINED FORECAST")} ${" ".repeat(
      16
    )} │ ${chalk.yellow("Indicators:")} ${chalk.white(
      indicators.length + "/10"
    )} │\n`
  );
  result += chalk.magenta(
    `│ ${changeColor(
      changeSymbol + " " + percentChange + "%"
    )} change predicted${" ".repeat(15)} │ ${chalk.yellow(
      "Total Weight:"
    )} ${chalk.white(totalWeight)} │\n`
  );
  result += chalk.magenta(
    `│ Period: ${weightedForecast.length} days${" ".repeat(
      25
    )} │ ${chalk.yellow("Avg Confidence:")} ${chalk.white(
      avgConfidence + "%"
    )} │\n`
  );
  result += chalk.magenta(`└${"─".repeat(70)}┘\n`);

  // ASCII Chart
  result += chalk.green(chart) + "\n";

  // Price range and statistics
  const maxPrice = Math.max(...avgPrices);
  const minPrice = Math.min(...avgPrices);
  const priceRange = maxPrice - minPrice;

  result += chalk.blue(`\n📊 Price Analysis:\n`);
  result += chalk.blue(`   Current: $${currentPrice.toFixed(2)}\n`);
  result += chalk.blue(
    `   Target:  $${finalPrice.toFixed(2)} (${changeColor(
      percentChange + "%"
    )})\n`
  );
  result += chalk.blue(
    `   Range:   $${minPrice.toFixed(2)} - $${maxPrice.toFixed(
      2
    )} (±$${priceRange.toFixed(2)})\n`
  );

  // Top performing indicators
  const sortedIndicators = indicators
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  result += chalk.cyan(`\n🏆 Top Performers:\n`);
  sortedIndicators.forEach((ind, idx) => {
    const medal = ["🥇", "🥈", "🥉"][idx];
    result += chalk.cyan(
      `   ${medal} ${ind.name}: ${(ind.accuracy * 100).toFixed(
        1
      )}% accuracy (${(ind.weight * 100).toFixed(1)}% weight)\n`
    );
  });

  // Detailed forecast table (first 10 days)
  const displayDays = Math.min(weightedForecast.length, 10);

  result += chalk.yellow(
    `\n┌──────┬────────────┬────────────┬────────────┬─────────────┐\n`
  );
  result += chalk.yellow(
    `│ Day  │    High    │    Low     │    Avg     │ Confidence  │\n`
  );
  result += chalk.yellow(
    `├──────┼────────────┼────────────┼────────────┼─────────────┤\n`
  );

  for (let i = 0; i < displayDays; i++) {
    const forecast = weightedForecast[i];
    const dayStr = forecast.day.toString().padStart(4);
    const highStr = `$${forecast.high.toFixed(2)}`.padStart(10);
    const lowStr = `$${forecast.low.toFixed(2)}`.padStart(10);
    const avgStr = `$${forecast.avg.toFixed(2)}`.padStart(10);
    const confStr = `${(forecast.confidence * 100).toFixed(1)}%`.padStart(11);

    result += chalk.yellow(
      `│ ${dayStr} │ ${highStr} │ ${lowStr} │ ${avgStr} │ ${confStr} │\n`
    );
  }

  if (weightedForecast.length > 10) {
    result += chalk.yellow(
      `│  ... │    ...     │    ...     │    ...     │     ...     │\n`
    );
    const lastForecast = weightedForecast[weightedForecast.length - 1];
    const dayStr = lastForecast.day.toString().padStart(4);
    const highStr = `$${lastForecast.high.toFixed(2)}`.padStart(10);
    const lowStr = `$${lastForecast.low.toFixed(2)}`.padStart(10);
    const avgStr = `$${lastForecast.avg.toFixed(2)}`.padStart(10);
    const confStr = `${(lastForecast.confidence * 100).toFixed(1)}%`.padStart(
      11
    );

    result += chalk.yellow(
      `│ ${dayStr} │ ${highStr} │ ${lowStr} │ ${avgStr} │ ${confStr} │\n`
    );
  }

  result += chalk.yellow(
    `└──────┴────────────┴────────────┴────────────┴─────────────┘\n`
  );

  return result;
}

// Plot all indicators with individual charts
export function plotAllIndicators(indicators: IndicatorResult[]): string {
  debug.log(
    `Generating individual ASCII charts for ${indicators.length} indicators`
  );

  let result = chalk.bold.yellow(`\n🔍 INDIVIDUAL INDICATOR ANALYSIS\n`);
  result += chalk.gray(`${"═".repeat(70)}\n`);

  indicators.forEach((indicator, index) => {
    result += plotIndicatorForecast(indicator);

    // Add separator between indicators (except for the last one)
    if (index < indicators.length - 1) {
      result += chalk.gray(`\n${"─".repeat(70)}\n`);
    }
  });

  return result;
}

// Get chart cache statistics
export function getChartCacheStats() {
  cleanupChartCache();
  return {
    chartCache: chartCache.size,
    maxCacheSize: MAX_CHART_CACHE_SIZE,
    cacheDuration: CHART_CACHE_DURATION / 1000, // in seconds
  };
}

// Clear chart caches (for testing)
export function clearChartCaches(): void {
  chartCache.clear();
  debug.log("Chart caches cleared");
}

// Create price comparison chart
export function plotPriceComparison(
  currentPrice: number,
  forecastPrices: number[],
  symbol: string
): string {
  debug.log(`Generating price comparison chart for ${symbol}`);

  if (!forecastPrices || forecastPrices.length === 0) {
    return chalk.red("No forecast prices available for comparison");
  }

  // Create price series starting with current price
  const priceData = [currentPrice, ...forecastPrices];
  const days = Array.from({ length: priceData.length }, (_, i) => i);

  // Validate price data for NaN or infinite values
  const validPriceData = priceData.filter((val) => isFinite(val));
  if (validPriceData.length === 0) {
    debug.warn(`No valid price data for ${symbol} comparison chart`);
    return `No valid price data available for ${symbol} comparison chart`;
  }

  // If we have some invalid data, replace with interpolated values
  const cleanedPriceData = priceData.map((val, index) => {
    if (!isFinite(val)) {
      // Use previous valid value or average of valid data
      const previousValid =
        index > 0 ? priceData[index - 1] : validPriceData[0];
      return isFinite(previousValid) ? previousValid : validPriceData[0];
    }
    return val;
  });

  try {
    const chart = asciichart.plot(cleanedPriceData, {
      height: 10,
      format: (value: number) => `$${value.toFixed(0)}`,
      padding: "  ",
    });

    const priceChange =
      forecastPrices[forecastPrices.length - 1] - currentPrice;
    const percentChange = ((priceChange / currentPrice) * 100).toFixed(2);
    const changeColor = priceChange >= 0 ? chalk.green : chalk.red;

    let result = "";
    result += chalk.blue(`\n📈 ${symbol} Price Trajectory\n`);
    result += chalk.gray(`${"─".repeat(50)}\n`);
    result += chalk.blue(chart) + "\n";
    result += chalk.white(
      `Current: $${currentPrice.toFixed(2)} → Target: $${forecastPrices[
        forecastPrices.length - 1
      ].toFixed(2)}\n`
    );
    result += chalk.white(
      `Expected Change: ${changeColor(percentChange + "%")}\n`
    );

    return result;
  } catch (error) {
    debug.error(
      `Failed to generate price comparison chart for ${symbol}:`,
      error
    );
    return chalk.red(`Price comparison chart generation failed for ${symbol}`);
  }
}

// Debug chart cache contents
export function debugChartCacheContents(): void {
  debug.log("Chart cache contents:");
  for (const [key, value] of chartCache.entries()) {
    const expired = Date.now() > value.expires;
    debug.log(
      `  ${key}: expires in ${Math.round(
        (value.expires - Date.now()) / 1000
      )}s ${expired ? "(EXPIRED)" : ""}`
    );
  }
}
