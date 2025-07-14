"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
exports.main = main;
const chalk_1 = __importDefault(require("chalk"));
const cli_1 = require("./cli");
const fetchPrices_1 = require("./data/fetchPrices");
const indicators_1 = require("./indicators");
const plotForecast_1 = require("./visual/plotForecast");
const forecast_1 = require("./forecast");
const exportForecast_1 = require("./forecast/exportForecast");
const backtest_1 = require("./forecast/backtest");
const runAllStrategies_1 = require("./strategy/runAllStrategies");
const strategy_1 = require("./strategy");
// Debug logging utility
exports.debug = {
    log: (message, data) => {
        console.log(chalk_1.default.blue(`[DEBUG] ${message}`), data || "");
    },
    error: (message, error) => {
        console.error(chalk_1.default.red(`[ERROR] ${message}`), error || "");
    },
    success: (message, data) => {
        console.log(chalk_1.default.green(`[SUCCESS] ${message}`), data || "");
    },
    warn: (message, data) => {
        console.warn(chalk_1.default.yellow(`[WARN] ${message}`), data || "");
    },
};
// Performance monitoring with chart cache
function displayPerformanceStats() {
    const cliStats = (0, cli_1.getCacheStats)();
    const dataStats = (0, fetchPrices_1.getCacheStats)();
    const indicatorStats = (0, indicators_1.getIndicatorCacheStats)();
    const chartStats = (0, plotForecast_1.getChartCacheStats)();
    const mergedForecastStats = (0, forecast_1.getMergedForecastCacheStats)();
    const strategyStats = (0, runAllStrategies_1.getCombinedStrategyCacheStats)();
    exports.debug.log("Performance Stats:", {
        "CLI Configuration Cache": cliStats.configCache,
        "CLI Validation Cache": cliStats.validationCache,
        "Price Data Cache": dataStats.priceCache,
        "Coin ID Cache": dataStats.coinIdCache,
        "Indicator Cache": indicatorStats.indicatorCache,
        "Chart Cache": chartStats.chartCache,
        "Merged Forecast Cache": mergedForecastStats.size,
        "Strategy Cache": strategyStats.size,
        "Available Strategies": (0, strategy_1.getStrategyNames)().length,
        "Cache Duration": `${dataStats.cacheDuration}s`,
    });
}
// Display strategy results summary
function displayStrategyResultsSummary(strategyResults) {
    console.log(chalk_1.default.cyan("\n🧠 Strategy Analysis Results"));
    console.log(chalk_1.default.gray("=".repeat(50)));
    // Combined signal
    const signal = strategyResults.combinedSignal;
    const signalColor = signal.recommendation === "buy"
        ? chalk_1.default.green
        : signal.recommendation === "sell"
            ? chalk_1.default.red
            : chalk_1.default.yellow;
    console.log(signalColor(`📈 Combined Signal: ${signal.recommendation.toUpperCase()}`));
    console.log(chalk_1.default.blue(`🎯 Confidence: ${(signal.confidenceScore * 100).toFixed(1)}%`));
    // Consensus information
    const consensus = strategyResults.consensus;
    console.log(chalk_1.default.blue(`🗳️  Strategy Consensus:`));
    console.log(chalk_1.default.green(`   • Buy signals: ${consensus.buySignals}`));
    console.log(chalk_1.default.red(`   • Sell signals: ${consensus.sellSignals}`));
    console.log(chalk_1.default.yellow(`   • Neutral signals: ${consensus.neutralSignals}`));
    // Strongest signal
    const strongest = consensus.strongestSignal;
    console.log(chalk_1.default.blue(`⚡ Strongest Signal: ${strongest.name} (${(strongest.signal.confidenceScore * 100).toFixed(1)}%)`));
    // Individual strategy results
    console.log(chalk_1.default.cyan("\n📊 Individual Strategy Results:"));
    strategyResults.individualResults.forEach((result, index) => {
        const color = result.signal.recommendation === "buy"
            ? chalk_1.default.green
            : result.signal.recommendation === "sell"
                ? chalk_1.default.red
                : chalk_1.default.yellow;
        console.log(color(`   ${index + 1}. ${result.name}: ${result.signal.recommendation.toUpperCase()} (${(result.signal.confidenceScore * 100).toFixed(1)}%)`));
        if (result.signal.reasons.length > 0) {
            console.log(chalk_1.default.gray(`      ${result.signal.reasons[0]}`));
        }
    });
    // Performance metrics
    const perf = strategyResults.performance;
    console.log(chalk_1.default.blue(`\n⏱️  Execution: ${perf.totalExecutionTime}ms | Avg Accuracy: ${(perf.avgAccuracy * 100).toFixed(1)}%`));
    console.log(chalk_1.default.gray("=".repeat(50)));
}
// Display data summary
function displayDataSummary(data, symbol, days, source, cached) {
    const latestPrice = data[data.length - 1];
    const oldestPrice = data[0];
    const priceChange = latestPrice.close - oldestPrice.close;
    const percentChange = ((priceChange / oldestPrice.close) * 100).toFixed(2);
    console.log(chalk_1.default.cyan(`
┌─────────────────────────────────────────────────────────────┐
│                    📊 Data Summary                          │
├─────────────────────────────────────────────────────────────┤
│  Symbol: ${chalk_1.default.bold(symbol.padEnd(20))}                          │
│  Data Points: ${chalk_1.default.bold(data.length.toString().padEnd(16))}                      │
│  Date Range: ${chalk_1.default.bold(oldestPrice.date)} → ${chalk_1.default.bold(latestPrice.date)}     │
│  Price Range: $${chalk_1.default.bold(latestPrice.close.toFixed(2).padEnd(10))} (${percentChange}%)          │
│  Data Source: ${chalk_1.default.bold((source + (cached ? " (cached)" : "")).padEnd(17))}        │
│  Highest: $${chalk_1.default.bold(Math.max(...data.map((p) => p.high))
        .toFixed(2)
        .padEnd(15))}               │
│  Lowest: $${chalk_1.default.bold(Math.min(...data.map((p) => p.low))
        .toFixed(2)
        .padEnd(16))}               │
│  Avg Volume: ${chalk_1.default.bold(Math.round(data.reduce((sum, p) => sum + p.volume, 0) / data.length)
        .toLocaleString()
        .padEnd(12))}    │
└─────────────────────────────────────────────────────────────┘
`));
}
// Display technical indicators summary
function displayIndicatorsSummary(indicators) {
    console.log(chalk_1.default.magenta(`
┌─────────────────────────────────────────────────────────────┐
│               🧠 Technical Indicators Summary                │
├─────────────────────────────────────────────────────────────┤`));
    indicators.forEach((indicator) => {
        const avgConfidence = indicator.forecast.reduce((sum, f) => sum + f.confidence, 0) /
            indicator.forecast.length;
        console.log(chalk_1.default.magenta(`│  ${indicator.name.padEnd(25)} │ Acc: ${(indicator.accuracy * 100).toFixed(1)}% │ Conf: ${(avgConfidence * 100).toFixed(1)}% │`));
    });
    console.log(chalk_1.default.magenta(`└─────────────────────────────────────────────────────────────┘`));
}
// Calculate weighted average forecast
// calculateWeightedForecast function has been moved to src/forecast/mergeForecasts.ts
// Use mergeForecasts() instead for better caching and performance
// Display forecast summary statistics
function displayForecastSummary(forecast, currentPrice, indicators) {
    const avgForecastPrice = forecast.reduce((sum, f) => sum + f.avg, 0) / forecast.length;
    const expectedChange = (((avgForecastPrice - currentPrice) / currentPrice) *
        100).toFixed(2);
    const avgConfidence = forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;
    console.log(chalk_1.default.green(`
┌─────────────────────────────────────────────┐
│              📊 Forecast Summary             │
├─────────────────────────────────────────────┤
│  Current Price: $${currentPrice.toFixed(2).padEnd(26)} │
│  Average Forecast: $${avgForecastPrice.toFixed(2).padEnd(23)} │
│  Expected Change: ${expectedChange}%${expectedChange.padEnd(20)} │
│  Average Confidence: ${(avgConfidence * 100).toFixed(1)}%${((avgConfidence * 100).toFixed(1) + "%").padEnd(25)} │
│  Indicators Used: ${indicators.length}/10${(indicators.length + "/10").padEnd(18)} │
└─────────────────────────────────────────────┘
  `));
}
// Display comprehensive overall summary
function displayOverallSummary(indicators, strategyResults, forecast, currentPrice, config, executionTime) {
    // Calculate overall indicators performance
    const avgIndicatorAccuracy = indicators.reduce((sum, ind) => sum + ind.accuracy, 0) / indicators.length;
    const avgIndicatorConfidence = indicators.reduce((sum, ind) => {
        const indConfidence = ind.forecast.reduce((s, f) => s + f.confidence, 0) /
            ind.forecast.length;
        return sum + indConfidence;
    }, 0) / indicators.length;
    // Calculate strategy consensus
    const buySignals = strategyResults.individualResults.filter((s) => s.signal.recommendation === "buy").length;
    const sellSignals = strategyResults.individualResults.filter((s) => s.signal.recommendation === "sell").length;
    const neutralSignals = strategyResults.individualResults.filter((s) => s.signal.recommendation === "neutral").length;
    const avgStrategyConfidence = strategyResults.individualResults.reduce((sum, s) => sum + s.signal.confidenceScore, 0) / strategyResults.individualResults.length;
    // Calculate forecast summary
    const avgForecastPrice = forecast.reduce((sum, f) => sum + f.avg, 0) / forecast.length;
    const expectedChange = ((avgForecastPrice - currentPrice) / currentPrice) * 100;
    const forecastConfidence = forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;
    // Determine overall recommendation
    let overallRecommendation = "NEUTRAL";
    let recommendationColor = chalk_1.default.yellow;
    if (buySignals > sellSignals && buySignals > neutralSignals) {
        overallRecommendation = "BUY";
        recommendationColor = chalk_1.default.green;
    }
    else if (sellSignals > buySignals && sellSignals > neutralSignals) {
        overallRecommendation = "SELL";
        recommendationColor = chalk_1.default.red;
    }
    // Determine trend direction
    const trendDirection = expectedChange > 0
        ? "UPTREND"
        : expectedChange < 0
            ? "DOWNTREND"
            : "SIDEWAYS";
    const trendEmoji = expectedChange > 0 ? "📈" : expectedChange < 0 ? "📉" : "➡️";
    console.log(chalk_1.default.cyan(`
╔══════════════════════════════════════════════════════════════════════╗
║                          🎯 OVERALL ANALYSIS                         ║
║                     Combined Results Summary                         ║
╠══════════════════════════════════════════════════════════════════════╣`));
    console.log(chalk_1.default.white(`║  📊 Analysis Summary:                                                ║`));
    console.log(chalk_1.default.white(`║     • Cryptocurrency: ${config.coin.padEnd(45)} ║`));
    console.log(chalk_1.default.white(`║     • Forecast Period: ${config.forecast} days${(" " +
        config.forecast +
        " days").padEnd(37)} ║`));
    console.log(chalk_1.default.white(`║     • Historical Data: ${config.range} days${(" " +
        config.range +
        " days").padEnd(37)} ║`));
    console.log(chalk_1.default.cyan(`║                                                                      ║`));
    console.log(chalk_1.default.white(`║  🧠 Technical Indicators (${indicators.length}/10):                                  ║`));
    console.log(chalk_1.default.white(`║     • Average Accuracy: ${(avgIndicatorAccuracy * 100).toFixed(1)}%${((avgIndicatorAccuracy * 100).toFixed(1) + "%").padEnd(35)} ║`));
    console.log(chalk_1.default.white(`║     • Average Confidence: ${(avgIndicatorConfidence * 100).toFixed(1)}%${((avgIndicatorConfidence * 100).toFixed(1) + "%").padEnd(33)} ║`));
    console.log(chalk_1.default.cyan(`║                                                                      ║`));
    console.log(chalk_1.default.white(`║  🎯 Trading Strategies (${strategyResults.individualResults.length}/6):                              ║`));
    console.log(chalk_1.default.white(`║     • Buy Signals: ${buySignals} strategies${(" " +
        buySignals +
        " strategies").padEnd(34)} ║`));
    console.log(chalk_1.default.white(`║     • Sell Signals: ${sellSignals} strategies${(" " +
        sellSignals +
        " strategies").padEnd(33)} ║`));
    console.log(chalk_1.default.white(`║     • Neutral Signals: ${neutralSignals} strategies${(" " +
        neutralSignals +
        " strategies").padEnd(31)} ║`));
    console.log(chalk_1.default.white(`║     • Average Confidence: ${(avgStrategyConfidence * 100).toFixed(1)}%${((avgStrategyConfidence * 100).toFixed(1) + "%").padEnd(31)} ║`));
    console.log(chalk_1.default.cyan(`║                                                                      ║`));
    console.log(recommendationColor(`║  🏆 OVERALL RECOMMENDATION: ${overallRecommendation.padEnd(37)} ║`));
    console.log(chalk_1.default.white(`║     • Current Price: $${currentPrice.toFixed(2).padEnd(40)} ║`));
    console.log(chalk_1.default.white(`║     • Target Price: $${avgForecastPrice.toFixed(2).padEnd(41)} ║`));
    console.log(chalk_1.default.white(`║     • Expected Change: ${expectedChange.toFixed(2)}%${(expectedChange.toFixed(2) + "%").padEnd(36)} ║`));
    console.log(chalk_1.default.white(`║     • Trend Direction: ${trendEmoji} ${trendDirection.padEnd(36)} ║`));
    console.log(chalk_1.default.white(`║     • Forecast Confidence: ${(forecastConfidence * 100).toFixed(1)}%${((forecastConfidence * 100).toFixed(1) + "%").padEnd(31)} ║`));
    console.log(chalk_1.default.cyan(`║                                                                      ║`));
    console.log(chalk_1.default.white(`║  ⚡ Performance:                                                     ║`));
    console.log(chalk_1.default.white(`║     • Total Analysis Time: ${executionTime.toFixed(0)}ms${(executionTime.toFixed(0) + "ms").padEnd(31)} ║`));
    console.log(chalk_1.default.white(`║     • Average per Indicator: ${(executionTime / indicators.length).toFixed(0)}ms${((executionTime / indicators.length).toFixed(0) + "ms").padEnd(28)} ║`));
    console.log(chalk_1.default.cyan(`╚══════════════════════════════════════════════════════════════════════╝`));
}
// Main application workflow with ASCII charts
async function runForecastWorkflow(config) {
    exports.debug.log("Starting forecast workflow...");
    const workflowStartTime = Date.now();
    try {
        // Step 3: Data fetching
        console.log(chalk_1.default.cyan("📥 Step 3: Fetching Historical Data..."));
        const fetchStartTime = Date.now();
        const response = await (0, fetchPrices_1.fetchHistoricalData)(config.coin, config.range);
        const fetchDuration = Date.now() - fetchStartTime;
        if (!response.success) {
            throw new Error(`Data fetch failed: ${response.error}`);
        }
        console.log(chalk_1.default.green(`✅ ${config.range} days of data successfully fetched (${fetchDuration}ms)`));
        displayDataSummary(response.data, config.coin, config.range, response.source, response.cached);
        // Get current price for comparison
        try {
            const currentPrice = await (0, fetchPrices_1.getCurrentPrice)(config.coin);
            console.log(chalk_1.default.green(`💰 Current ${config.coin} Price: $${currentPrice.toFixed(2)}`));
        }
        catch (error) {
            exports.debug.warn("Could not fetch current price:", error);
        }
        // Step 4: Technical indicators
        console.log(chalk_1.default.magenta("🧠 Step 4: Calculating Technical Indicators..."));
        const indicatorStartTime = Date.now();
        const indicators = await (0, indicators_1.calculateAllIndicators)(config.coin, response.data, config.forecast);
        const indicatorDuration = Date.now() - indicatorStartTime;
        console.log(chalk_1.default.green(`✅ 10 technical indicators calculated (${indicatorDuration}ms)`));
        displayIndicatorsSummary(indicators);
        // Step 5: Strategy Analysis
        console.log(chalk_1.default.blue("🧠 Step 5: Analyzing Trading Strategies..."));
        const strategyStartTime = Date.now();
        const strategyResults = await (0, runAllStrategies_1.runAllStrategies)(indicators, {
            forecastDays: config.forecast,
            symbol: config.coin,
            lookbackPeriod: 14,
            sensitivity: 0.5,
            riskLevel: "medium",
        });
        const strategyDuration = Date.now() - strategyStartTime;
        console.log(chalk_1.default.green(`✅ Strategy analysis completed (${strategyDuration}ms)`));
        displayStrategyResultsSummary(strategyResults);
        // Step 6: ASCII Chart Visualization
        console.log(chalk_1.default.yellow("📊 Step 6: Creating Visual Charts..."));
        const chartStartTime = Date.now();
        // Display individual indicator charts
        const individualCharts = (0, plotForecast_1.plotAllIndicators)(indicators);
        console.log(individualCharts);
        // Step 7: Calculate weighted forecast using mergeForecasts
        console.log(chalk_1.default.cyan("📈 Step 7: Merging Forecasts..."));
        const mergedForecastStartTime = Date.now();
        const weightedForecast = (0, forecast_1.mergeForecasts)(indicators, config.forecast);
        const mergedForecastStats = (0, forecast_1.calculateMergedForecastStats)(weightedForecast, indicators);
        const mergedForecastDuration = Date.now() - mergedForecastStartTime;
        console.log(chalk_1.default.green(`✅ Forecasts merged (${mergedForecastDuration}ms)`));
        // Display combined forecast chart
        const combinedChart = (0, plotForecast_1.plotCombinedForecast)(indicators, weightedForecast);
        console.log(combinedChart);
        // Optional: Price trajectory comparison
        const currentPrice = response.data[response.data.length - 1].close;
        const forecastPrices = weightedForecast.map((f) => f.avg);
        const priceComparison = (0, plotForecast_1.plotPriceComparison)(currentPrice, forecastPrices, config.coin);
        console.log(priceComparison);
        const chartDuration = Date.now() - chartStartTime;
        console.log(chalk_1.default.green(`✅ Charts created (${chartDuration}ms)`));
        // Display summary statistics
        displayForecastSummary(weightedForecast, currentPrice, indicators);
        // Step 8: Results output
        console.log(chalk_1.default.green("📋 Step 8: Preparing Results..."));
        // Optional: Save results
        if (config.save) {
            console.log(chalk_1.default.cyan("💾 Saving forecast to file..."));
            try {
                const exportMetadata = (0, exportForecast_1.createExportMetadata)(config.coin, config.forecast, config.range, indicators, weightedForecast, currentPrice);
                const exportData = {
                    metadata: exportMetadata,
                    combinedForecast: weightedForecast,
                    individualIndicators: indicators,
                    performanceStats: {
                        cacheStats: {
                            data: (0, fetchPrices_1.getCacheStats)(),
                            indicators: (0, indicators_1.getIndicatorCacheStats)(),
                            charts: (0, plotForecast_1.getChartCacheStats)(),
                            mergedForecast: (0, forecast_1.getMergedForecastCacheStats)(),
                        },
                        executionTime: Date.now() - workflowStartTime,
                        dataSource: response.source,
                    },
                };
                const exportConfig = {
                    format: "both", // Export both JSON and CSV
                    includeIndividualIndicators: true,
                    includeMetadata: true,
                };
                const exportedFiles = await (0, exportForecast_1.exportForecast)(exportData, exportConfig);
                console.log(chalk_1.default.green("✅ Export completed successfully!"));
                exportedFiles.forEach((file) => {
                    console.log(chalk_1.default.cyan(`   📁 ${file}`));
                });
                const exportStats = (0, exportForecast_1.getExportStats)();
                console.log(chalk_1.default.blue(`📊 Export Directory: ${exportStats.exportDir}`));
                console.log(chalk_1.default.blue(`📊 Total Files: ${exportStats.totalFiles}`));
            }
            catch (error) {
                exports.debug.error("Export failed:", error);
                console.log(chalk_1.default.red(`❌ Export failed: ${error instanceof Error ? error.message : "Unknown error"}`));
            }
        }
        // Optional: Backtest with enhanced configuration
        if (config.compare) {
            console.log(chalk_1.default.magenta("🔍 Running Historical Backtest Analysis..."));
            try {
                const backtestConfig = {
                    periods: 12, // Test 12 historical periods for robust analysis
                    forecastDays: config.forecast,
                    historicalRange: Math.max(90, config.range), // Ensure minimum 90 days
                    minDataPoints: 90, // Require at least 90 data points
                };
                console.log(chalk_1.default.cyan(`📊 Backtest Configuration:`));
                console.log(chalk_1.default.cyan(`   • Test Periods: ${backtestConfig.periods}`));
                console.log(chalk_1.default.cyan(`   • Historical Range: ${backtestConfig.historicalRange} days`));
                console.log(chalk_1.default.cyan(`   • Forecast Days: ${backtestConfig.forecastDays}`));
                console.log(chalk_1.default.cyan(`   • Min Data Points: ${backtestConfig.minDataPoints}`));
                const backtestAnalysis = await (0, backtest_1.runBacktest)(config.coin, backtestConfig);
                (0, backtest_1.displayBacktestResults)(backtestAnalysis);
                console.log(chalk_1.default.green("✅ Backtest analysis completed!"));
            }
            catch (error) {
                exports.debug.error("Backtest failed:", error);
                console.log(chalk_1.default.red(`❌ Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`));
                console.log(chalk_1.default.yellow("Note: Backtest requires extensive historical data. Try with --range 90 or higher."));
            }
        }
        // Step 8: Display comprehensive overall summary
        const totalExecutionTime = Date.now() - workflowStartTime;
        displayOverallSummary(indicators, strategyResults, weightedForecast, currentPrice, config, totalExecutionTime);
        console.log(chalk_1.default.green("✅ Analysis completed successfully!"));
    }
    catch (error) {
        exports.debug.error("Forecast workflow failed:", error);
        throw error;
    }
}
// Main function
async function main() {
    try {
        exports.debug.log("Starting Crypto Forecast CLI Tool...");
        // Step 1: Already completed - Project setup
        exports.debug.success("Step 1: Project Setup ✅");
        // Step 2: CLI Interface
        exports.debug.log("Step 2: Initializing CLI Interface...");
        const config = (0, cli_1.initializeCLI)();
        exports.debug.success("Step 2: CLI Interface ✅");
        // Step 3: Data fetching - implemented!
        exports.debug.success("Step 3: Data Fetching ✅");
        // Step 4: Technical indicators - implemented!
        exports.debug.success("Step 4: Technical Indicators ✅");
        // Step 5: ASCII Chart Visualization - implemented!
        exports.debug.success("Step 5: ASCII Chart Visualization ✅");
        // Display performance stats
        displayPerformanceStats();
        // Run the forecast workflow
        await runForecastWorkflow(config);
        // Show final cache stats
        console.log(chalk_1.default.blue("\n📊 Final Performance Statistics:"));
        displayPerformanceStats();
        // Optional: Show cache contents for debugging
        if (process.env.DEBUG_CACHE) {
            (0, fetchPrices_1.debugCacheContents)();
            (0, plotForecast_1.debugChartCacheContents)();
            (0, forecast_1.debugMergedForecastCacheContents)();
        }
        console.log(chalk_1.default.green(`
┌─────────────────────────────────────────────┐
│            ✅ Forecast Complete!            │
│                                             │
│  ${config.coin} ${config.forecast}-day forecast generated      │
│  Using ${config.range} days of historical data     │
│  Powered by 10 Technical Indicators        │
│  📊 ASCII Charts + Advanced Analytics       │
└─────────────────────────────────────────────┘
    `));
    }
    catch (error) {
        exports.debug.error("Application failed:", error);
        console.error(chalk_1.default.red(`
❌ Application Error: ${error instanceof Error ? error.message : "Unknown error"}
    
Please check your internet connection and try again.
For help, run: npm run dev -- --help
`));
        process.exit(1);
    }
}
// Execute if this file is run directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map