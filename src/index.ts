import chalk from "chalk";
import {
  initializeCLI,
  CLIConfig,
  getCacheStats as getCLICacheStats,
} from "./cli";
import {
  fetchHistoricalData,
  getCurrentPrice,
  getCacheStats as getDataCacheStats,
  debugCacheContents,
} from "./data/fetchPrices";
import {
  calculateAllIndicators,
  getIndicatorCacheStats,
  INDICATORS,
  IndicatorResult,
} from "./indicators";
import {
  plotAllIndicators,
  plotCombinedForecast,
  getChartCacheStats,
  plotPriceComparison,
  debugChartCacheContents,
} from "./visual/plotForecast";
import {
  mergeForecasts,
  calculateMergedForecastStats,
  getMergedForecastCacheStats,
  clearMergedForecastCache,
  debugMergedForecastCacheContents,
} from "./forecast";
import {
  exportForecast,
  createExportMetadata,
  getExportStats,
  ForecastExportData,
  ExportConfig,
} from "./forecast/exportForecast";
import {
  runBacktest,
  displayBacktestResults,
  BacktestConfig,
} from "./forecast/backtest";
import {
  runAllStrategies,
  runSelectedStrategy,
  getCombinedStrategyCacheStats,
  clearAllStrategyCaches,
  debugAllStrategyCaches,
  CombinedStrategyResult,
} from "./strategy/runAllStrategies";
import {
  getAllStrategies,
  getStrategyNames,
  getStrategyPerformanceStats,
} from "./strategy";

// Debug logging utility
export const debug = {
  log: (message: string, data?: any) => {
    console.log(chalk.blue(`[DEBUG] ${message}`), data || "");
  },
  error: (message: string, error?: any) => {
    console.error(chalk.red(`[ERROR] ${message}`), error || "");
  },
  success: (message: string, data?: any) => {
    console.log(chalk.green(`[SUCCESS] ${message}`), data || "");
  },
  warn: (message: string, data?: any) => {
    console.warn(chalk.yellow(`[WARN] ${message}`), data || "");
  },
};

// Performance monitoring with chart cache
function displayPerformanceStats() {
  const cliStats = getCLICacheStats();
  const dataStats = getDataCacheStats();
  const indicatorStats = getIndicatorCacheStats();
  const chartStats = getChartCacheStats();
  const mergedForecastStats = getMergedForecastCacheStats();
  const strategyStats = getCombinedStrategyCacheStats();

  debug.log("Performance Stats:", {
    "CLI Configuration Cache": cliStats.configCache,
    "CLI Validation Cache": cliStats.validationCache,
    "Price Data Cache": dataStats.priceCache,
    "Coin ID Cache": dataStats.coinIdCache,
    "Indicator Cache": indicatorStats.indicatorCache,
    "Chart Cache": chartStats.chartCache,
    "Merged Forecast Cache": mergedForecastStats.size,
    "Strategy Cache": strategyStats.size,
    "Available Strategies": getStrategyNames().length,
    "Cache Duration": `${dataStats.cacheDuration}s`,
  });
}

// Display strategy results summary
function displayStrategyResultsSummary(
  strategyResults: CombinedStrategyResult
) {
  console.log(chalk.cyan("\n🧠 Strategy Analysis Results"));
  console.log(chalk.gray("=".repeat(50)));

  // Combined signal
  const signal = strategyResults.combinedSignal;
  const signalColor =
    signal.recommendation === "buy"
      ? chalk.green
      : signal.recommendation === "sell"
      ? chalk.red
      : chalk.yellow;

  console.log(
    signalColor(`📈 Combined Signal: ${signal.recommendation.toUpperCase()}`)
  );
  console.log(
    chalk.blue(`🎯 Confidence: ${(signal.confidenceScore * 100).toFixed(1)}%`)
  );

  // Consensus information
  const consensus = strategyResults.consensus;
  console.log(chalk.blue(`🗳️  Strategy Consensus:`));
  console.log(chalk.green(`   • Buy signals: ${consensus.buySignals}`));
  console.log(chalk.red(`   • Sell signals: ${consensus.sellSignals}`));
  console.log(
    chalk.yellow(`   • Neutral signals: ${consensus.neutralSignals}`)
  );

  // Strongest signal
  const strongest = consensus.strongestSignal;
  console.log(
    chalk.blue(
      `⚡ Strongest Signal: ${strongest.name} (${(
        strongest.signal.confidenceScore * 100
      ).toFixed(1)}%)`
    )
  );

  // Individual strategy results
  console.log(chalk.cyan("\n📊 Individual Strategy Results:"));
  strategyResults.individualResults.forEach((result, index) => {
    const color =
      result.signal.recommendation === "buy"
        ? chalk.green
        : result.signal.recommendation === "sell"
        ? chalk.red
        : chalk.yellow;
    console.log(
      color(
        `   ${index + 1}. ${
          result.name
        }: ${result.signal.recommendation.toUpperCase()} (${(
          result.signal.confidenceScore * 100
        ).toFixed(1)}%)`
      )
    );
    if (result.signal.reasons.length > 0) {
      console.log(chalk.gray(`      ${result.signal.reasons[0]}`));
    }
  });

  // Performance metrics
  const perf = strategyResults.performance;
  console.log(
    chalk.blue(
      `\n⏱️  Execution: ${perf.totalExecutionTime}ms | Avg Accuracy: ${(
        perf.avgAccuracy * 100
      ).toFixed(1)}%`
    )
  );
  console.log(chalk.gray("=".repeat(50)));
}

// Display data summary
function displayDataSummary(
  data: any,
  symbol: string,
  days: number,
  source: string,
  cached: boolean
) {
  const latestPrice = data[data.length - 1];
  const oldestPrice = data[0];
  const priceChange = latestPrice.close - oldestPrice.close;
  const percentChange = ((priceChange / oldestPrice.close) * 100).toFixed(2);

  console.log(
    chalk.cyan(`
┌─────────────────────────────────────────────────────────────┐
│                    📊 Data Summary                          │
├─────────────────────────────────────────────────────────────┤
│  Symbol: ${chalk.bold(symbol.padEnd(20))}                          │
│  Data Points: ${chalk.bold(
      data.length.toString().padEnd(16)
    )}                      │
│  Date Range: ${chalk.bold(oldestPrice.date)} → ${chalk.bold(
      latestPrice.date
    )}     │
│  Price Range: $${chalk.bold(
      latestPrice.close.toFixed(2).padEnd(10)
    )} (${percentChange}%)          │
│  Data Source: ${chalk.bold(
      (source + (cached ? " (cached)" : "")).padEnd(17)
    )}        │
│  Highest: $${chalk.bold(
      Math.max(...data.map((p: any) => p.high))
        .toFixed(2)
        .padEnd(15)
    )}               │
│  Lowest: $${chalk.bold(
      Math.min(...data.map((p: any) => p.low))
        .toFixed(2)
        .padEnd(16)
    )}               │
│  Avg Volume: ${chalk.bold(
      Math.round(
        data.reduce((sum: number, p: any) => sum + p.volume, 0) / data.length
      )
        .toLocaleString()
        .padEnd(12)
    )}    │
└─────────────────────────────────────────────────────────────┘
`)
  );
}

// Display technical indicators summary
function displayIndicatorsSummary(indicators: IndicatorResult[]) {
  console.log(
    chalk.magenta(`
┌─────────────────────────────────────────────────────────────┐
│               🧠 Technical Indicators Summary                │
├─────────────────────────────────────────────────────────────┤`)
  );

  indicators.forEach((indicator) => {
    const avgConfidence =
      indicator.forecast.reduce((sum, f) => sum + f.confidence, 0) /
      indicator.forecast.length;

    console.log(
      chalk.magenta(
        `│  ${indicator.name.padEnd(25)} │ Acc: ${(
          indicator.accuracy * 100
        ).toFixed(1)}% │ Conf: ${(avgConfidence * 100).toFixed(1)}% │`
      )
    );
  });

  console.log(
    chalk.magenta(
      `└─────────────────────────────────────────────────────────────┘`
    )
  );
}

// Calculate weighted average forecast
// calculateWeightedForecast function has been moved to src/forecast/mergeForecasts.ts
// Use mergeForecasts() instead for better caching and performance

// Display forecast summary statistics
function displayForecastSummary(
  forecast: any[],
  currentPrice: number,
  indicators: IndicatorResult[]
) {
  const avgForecastPrice =
    forecast.reduce((sum, f) => sum + f.avg, 0) / forecast.length;
  const expectedChange = (
    ((avgForecastPrice - currentPrice) / currentPrice) *
    100
  ).toFixed(2);
  const avgConfidence =
    forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;

  console.log(
    chalk.green(`
┌─────────────────────────────────────────────┐
│              📊 Forecast Summary             │
├─────────────────────────────────────────────┤
│  Current Price: $${currentPrice.toFixed(2).padEnd(26)} │
│  Average Forecast: $${avgForecastPrice.toFixed(2).padEnd(23)} │
│  Expected Change: ${expectedChange}%${expectedChange.padEnd(20)} │
│  Average Confidence: ${(avgConfidence * 100).toFixed(1)}%${(
      (avgConfidence * 100).toFixed(1) + "%"
    ).padEnd(25)} │
│  Indicators Used: ${indicators.length}/10${(indicators.length + "/10").padEnd(
      18
    )} │
└─────────────────────────────────────────────┘
  `)
  );
}

// Display comprehensive overall summary
function displayOverallSummary(
  indicators: IndicatorResult[],
  strategyResults: any,
  forecast: any[],
  currentPrice: number,
  config: any,
  executionTime: number
) {
  // Calculate overall indicators performance
  const avgIndicatorAccuracy =
    indicators.reduce((sum, ind) => sum + ind.accuracy, 0) / indicators.length;
  const avgIndicatorConfidence =
    indicators.reduce((sum, ind) => {
      const indConfidence =
        ind.forecast.reduce((s, f) => s + f.confidence, 0) /
        ind.forecast.length;
      return sum + indConfidence;
    }, 0) / indicators.length;

  // Calculate strategy consensus
  const buySignals = strategyResults.individualResults.filter(
    (s: any) => s.signal.recommendation === "buy"
  ).length;
  const sellSignals = strategyResults.individualResults.filter(
    (s: any) => s.signal.recommendation === "sell"
  ).length;
  const neutralSignals = strategyResults.individualResults.filter(
    (s: any) => s.signal.recommendation === "neutral"
  ).length;

  const avgStrategyConfidence =
    strategyResults.individualResults.reduce(
      (sum: number, s: any) => sum + s.signal.confidenceScore,
      0
    ) / strategyResults.individualResults.length;

  // Calculate forecast summary
  const avgForecastPrice =
    forecast.reduce((sum, f) => sum + f.avg, 0) / forecast.length;
  const expectedChange =
    ((avgForecastPrice - currentPrice) / currentPrice) * 100;
  const forecastConfidence =
    forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;

  // Determine overall recommendation
  let overallRecommendation = "NEUTRAL";
  let recommendationColor = chalk.yellow;

  if (buySignals > sellSignals && buySignals > neutralSignals) {
    overallRecommendation = "BUY";
    recommendationColor = chalk.green;
  } else if (sellSignals > buySignals && sellSignals > neutralSignals) {
    overallRecommendation = "SELL";
    recommendationColor = chalk.red;
  }

  // Determine trend direction
  const trendDirection =
    expectedChange > 0
      ? "UPTREND"
      : expectedChange < 0
      ? "DOWNTREND"
      : "SIDEWAYS";
  const trendEmoji =
    expectedChange > 0 ? "📈" : expectedChange < 0 ? "📉" : "➡️";

  console.log(
    chalk.cyan(`
╔══════════════════════════════════════════════════════════════════════╗
║                          🎯 OVERALL ANALYSIS                         ║
║                     Combined Results Summary                         ║
╠══════════════════════════════════════════════════════════════════════╣`)
  );

  console.log(
    chalk.white(
      `║  📊 Analysis Summary:                                                ║`
    )
  );
  console.log(
    chalk.white(`║     • Cryptocurrency: ${config.coin.padEnd(45)} ║`)
  );
  console.log(
    chalk.white(
      `║     • Forecast Period: ${config.forecast} days${(
        " " +
        config.forecast +
        " days"
      ).padEnd(37)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Historical Data: ${config.range} days${(
        " " +
        config.range +
        " days"
      ).padEnd(37)} ║`
    )
  );

  console.log(
    chalk.cyan(
      `║                                                                      ║`
    )
  );
  console.log(
    chalk.white(
      `║  🧠 Technical Indicators (${indicators.length}/10):                                  ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Average Accuracy: ${(avgIndicatorAccuracy * 100).toFixed(1)}%${(
        (avgIndicatorAccuracy * 100).toFixed(1) + "%"
      ).padEnd(35)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Average Confidence: ${(avgIndicatorConfidence * 100).toFixed(
        1
      )}%${((avgIndicatorConfidence * 100).toFixed(1) + "%").padEnd(33)} ║`
    )
  );

  console.log(
    chalk.cyan(
      `║                                                                      ║`
    )
  );
  console.log(
    chalk.white(
      `║  🎯 Trading Strategies (${strategyResults.individualResults.length}/6):                              ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Buy Signals: ${buySignals} strategies${(
        " " +
        buySignals +
        " strategies"
      ).padEnd(34)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Sell Signals: ${sellSignals} strategies${(
        " " +
        sellSignals +
        " strategies"
      ).padEnd(33)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Neutral Signals: ${neutralSignals} strategies${(
        " " +
        neutralSignals +
        " strategies"
      ).padEnd(31)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Average Confidence: ${(avgStrategyConfidence * 100).toFixed(
        1
      )}%${((avgStrategyConfidence * 100).toFixed(1) + "%").padEnd(31)} ║`
    )
  );

  console.log(
    chalk.cyan(
      `║                                                                      ║`
    )
  );
  console.log(
    recommendationColor(
      `║  🏆 OVERALL RECOMMENDATION: ${overallRecommendation.padEnd(37)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Current Price: $${currentPrice.toFixed(2).padEnd(40)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Target Price: $${avgForecastPrice.toFixed(2).padEnd(41)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Expected Change: ${expectedChange.toFixed(2)}%${(
        expectedChange.toFixed(2) + "%"
      ).padEnd(36)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Trend Direction: ${trendEmoji} ${trendDirection.padEnd(36)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Forecast Confidence: ${(forecastConfidence * 100).toFixed(1)}%${(
        (forecastConfidence * 100).toFixed(1) + "%"
      ).padEnd(31)} ║`
    )
  );

  console.log(
    chalk.cyan(
      `║                                                                      ║`
    )
  );
  console.log(
    chalk.white(
      `║  ⚡ Performance:                                                     ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Total Analysis Time: ${executionTime.toFixed(0)}ms${(
        executionTime.toFixed(0) + "ms"
      ).padEnd(31)} ║`
    )
  );
  console.log(
    chalk.white(
      `║     • Average per Indicator: ${(
        executionTime / indicators.length
      ).toFixed(0)}ms${(
        (executionTime / indicators.length).toFixed(0) + "ms"
      ).padEnd(28)} ║`
    )
  );

  console.log(
    chalk.cyan(
      `╚══════════════════════════════════════════════════════════════════════╝`
    )
  );
}

// Main application workflow with ASCII charts
async function runForecastWorkflow(config: CLIConfig) {
  debug.log("Starting forecast workflow...");
  const workflowStartTime = Date.now();

  try {
    // Step 3: Data fetching
    console.log(chalk.cyan("📥 Step 3: Fetching Historical Data..."));

    const fetchStartTime = Date.now();
    const response = await fetchHistoricalData(config.coin, config.range);
    const fetchDuration = Date.now() - fetchStartTime;

    if (!response.success) {
      throw new Error(`Data fetch failed: ${response.error}`);
    }

    console.log(
      chalk.green(
        `✅ ${config.range} days of data successfully fetched (${fetchDuration}ms)`
      )
    );
    displayDataSummary(
      response.data,
      config.coin,
      config.range,
      response.source,
      response.cached
    );

    // Get current price for comparison
    try {
      const currentPrice = await getCurrentPrice(config.coin);
      console.log(
        chalk.green(
          `💰 Current ${config.coin} Price: $${currentPrice.toFixed(2)}`
        )
      );
    } catch (error) {
      debug.warn("Could not fetch current price:", error);
    }

    // Step 4: Technical indicators
    console.log(
      chalk.magenta("🧠 Step 4: Calculating Technical Indicators...")
    );

    const indicatorStartTime = Date.now();
    const indicators = await calculateAllIndicators(
      config.coin,
      response.data,
      config.forecast
    );
    const indicatorDuration = Date.now() - indicatorStartTime;

    console.log(
      chalk.green(
        `✅ 10 technical indicators calculated (${indicatorDuration}ms)`
      )
    );
    displayIndicatorsSummary(indicators);

    // Step 5: Strategy Analysis
    console.log(chalk.blue("🧠 Step 5: Analyzing Trading Strategies..."));

    const strategyStartTime = Date.now();
    const strategyResults = await runAllStrategies(indicators, {
      forecastDays: config.forecast,
      symbol: config.coin,
      lookbackPeriod: 14,
      sensitivity: 0.5,
      riskLevel: "medium",
    });
    const strategyDuration = Date.now() - strategyStartTime;

    console.log(
      chalk.green(`✅ Strategy analysis completed (${strategyDuration}ms)`)
    );
    displayStrategyResultsSummary(strategyResults);

    // Step 6: ASCII Chart Visualization
    console.log(chalk.yellow("📊 Step 6: Creating Visual Charts..."));

    const chartStartTime = Date.now();

    // Display individual indicator charts
    const individualCharts = plotAllIndicators(indicators);
    console.log(individualCharts);

    // Step 7: Calculate weighted forecast using mergeForecasts
    console.log(chalk.cyan("📈 Step 7: Merging Forecasts..."));

    const mergedForecastStartTime = Date.now();
    const weightedForecast = mergeForecasts(indicators, config.forecast);
    const mergedForecastStats = calculateMergedForecastStats(
      weightedForecast,
      indicators
    );
    const mergedForecastDuration = Date.now() - mergedForecastStartTime;

    console.log(
      chalk.green(`✅ Forecasts merged (${mergedForecastDuration}ms)`)
    );

    // Display combined forecast chart
    const combinedChart = plotCombinedForecast(indicators, weightedForecast);
    console.log(combinedChart);

    // Optional: Price trajectory comparison
    const currentPrice = response.data[response.data.length - 1].close;
    const forecastPrices = weightedForecast.map((f) => f.avg);
    const priceComparison = plotPriceComparison(
      currentPrice,
      forecastPrices,
      config.coin
    );
    console.log(priceComparison);

    const chartDuration = Date.now() - chartStartTime;
    console.log(chalk.green(`✅ Charts created (${chartDuration}ms)`));

    // Display summary statistics
    displayForecastSummary(weightedForecast, currentPrice, indicators);

    // Step 8: Results output
    console.log(chalk.green("📋 Step 8: Preparing Results..."));

    // Optional: Save results
    if (config.save) {
      console.log(chalk.cyan("💾 Saving forecast to file..."));

      try {
        const exportMetadata = createExportMetadata(
          config.coin,
          config.forecast,
          config.range,
          indicators,
          weightedForecast,
          currentPrice
        );

        const exportData: ForecastExportData = {
          metadata: exportMetadata,
          combinedForecast: weightedForecast,
          individualIndicators: indicators,
          performanceStats: {
            cacheStats: {
              data: getDataCacheStats(),
              indicators: getIndicatorCacheStats(),
              charts: getChartCacheStats(),
              mergedForecast: getMergedForecastCacheStats(),
            },
            executionTime: Date.now() - workflowStartTime,
            dataSource: response.source,
          },
        };

        const exportConfig: ExportConfig = {
          format: "both", // Export both JSON and CSV
          includeIndividualIndicators: true,
          includeMetadata: true,
        };

        const exportedFiles = await exportForecast(exportData, exportConfig);

        console.log(chalk.green("✅ Export completed successfully!"));
        exportedFiles.forEach((file) => {
          console.log(chalk.cyan(`   📁 ${file}`));
        });

        const exportStats = getExportStats();
        console.log(
          chalk.blue(`📊 Export Directory: ${exportStats.exportDir}`)
        );
        console.log(chalk.blue(`📊 Total Files: ${exportStats.totalFiles}`));
      } catch (error) {
        debug.error("Export failed:", error);
        console.log(
          chalk.red(
            `❌ Export failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
      }
    }

    // Optional: Backtest with enhanced configuration
    if (config.compare) {
      console.log(chalk.magenta("🔍 Running Historical Backtest Analysis..."));

      try {
        const backtestConfig: BacktestConfig = {
          periods: 12, // Test 12 historical periods for robust analysis
          forecastDays: config.forecast,
          historicalRange: Math.max(90, config.range), // Ensure minimum 90 days
          minDataPoints: 90, // Require at least 90 data points
        };

        console.log(chalk.cyan(`📊 Backtest Configuration:`));
        console.log(chalk.cyan(`   • Test Periods: ${backtestConfig.periods}`));
        console.log(
          chalk.cyan(
            `   • Historical Range: ${backtestConfig.historicalRange} days`
          )
        );
        console.log(
          chalk.cyan(`   • Forecast Days: ${backtestConfig.forecastDays}`)
        );
        console.log(
          chalk.cyan(`   • Min Data Points: ${backtestConfig.minDataPoints}`)
        );

        const backtestAnalysis = await runBacktest(config.coin, backtestConfig);
        displayBacktestResults(backtestAnalysis);

        console.log(chalk.green("✅ Backtest analysis completed!"));
      } catch (error) {
        debug.error("Backtest failed:", error);
        console.log(
          chalk.red(
            `❌ Backtest failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
        );
        console.log(
          chalk.yellow(
            "Note: Backtest requires extensive historical data. Try with --range 90 or higher."
          )
        );
      }
    }

    // Step 8: Display comprehensive overall summary
    const totalExecutionTime = Date.now() - workflowStartTime;
    displayOverallSummary(
      indicators,
      strategyResults,
      weightedForecast,
      currentPrice,
      config,
      totalExecutionTime
    );

    console.log(chalk.green("✅ Analysis completed successfully!"));
  } catch (error) {
    debug.error("Forecast workflow failed:", error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    debug.log("Starting Crypto Forecast CLI Tool...");

    // Step 1: Already completed - Project setup
    debug.success("Step 1: Project Setup ✅");

    // Step 2: CLI Interface
    debug.log("Step 2: Initializing CLI Interface...");
    const config = initializeCLI();
    debug.success("Step 2: CLI Interface ✅");

    // Step 3: Data fetching - implemented!
    debug.success("Step 3: Data Fetching ✅");

    // Step 4: Technical indicators - implemented!
    debug.success("Step 4: Technical Indicators ✅");

    // Step 5: ASCII Chart Visualization - implemented!
    debug.success("Step 5: ASCII Chart Visualization ✅");

    // Display performance stats
    displayPerformanceStats();

    // Run the forecast workflow
    await runForecastWorkflow(config);

    // Show final cache stats
    console.log(chalk.blue("\n📊 Final Performance Statistics:"));
    displayPerformanceStats();

    // Optional: Show cache contents for debugging
    if (process.env.DEBUG_CACHE) {
      debugCacheContents();
      debugChartCacheContents();
      debugMergedForecastCacheContents();
    }

    console.log(
      chalk.green(`
┌─────────────────────────────────────────────┐
│            ✅ Forecast Complete!            │
│                                             │
│  ${config.coin} ${config.forecast}-day forecast generated      │
│  Using ${config.range} days of historical data     │
│  Powered by 10 Technical Indicators        │
│  📊 ASCII Charts + Advanced Analytics       │
└─────────────────────────────────────────────┘
    `)
    );
  } catch (error) {
    debug.error("Application failed:", error);
    console.error(
      chalk.red(`
❌ Application Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }
    
Please check your internet connection and try again.
For help, run: npm run dev -- --help
`)
    );
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}

export { main };
