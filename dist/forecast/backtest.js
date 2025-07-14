"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBacktest = runBacktest;
exports.displayBacktestResults = displayBacktestResults;
const index_1 = require("../index");
const indicators_1 = require("../indicators");
const fetchPrices_1 = require("../data/fetchPrices");
const mergeForecasts_1 = require("./mergeForecasts");
const chalk_1 = __importDefault(require("chalk"));
/**
 * Run comprehensive backtest analysis
 * @param symbol - Cryptocurrency symbol
 * @param config - Backtest configuration
 * @returns Complete backtest analysis
 */
async function runBacktest(symbol, config) {
    const startTime = Date.now();
    index_1.debug.log(`Starting backtest for ${symbol} with ${config.periods} periods`);
    console.log(chalk_1.default.yellow(`🔍 Running comprehensive backtest analysis...`));
    console.log(chalk_1.default.cyan(`   Symbol: ${symbol}`));
    console.log(chalk_1.default.cyan(`   Periods: ${config.periods}`));
    console.log(chalk_1.default.cyan(`   Forecast Days: ${config.forecastDays}`));
    console.log(chalk_1.default.cyan(`   Historical Range: ${config.historicalRange} days`));
    const results = [];
    const indicatorAccuracies = {};
    const indicatorErrors = {};
    // Calculate required historical data range
    const totalDaysNeeded = config.historicalRange + config.periods * config.forecastDays + 30; // Buffer
    try {
        // Fetch extensive historical data
        index_1.debug.log(`Fetching ${totalDaysNeeded} days of historical data for backtest`);
        const response = await (0, fetchPrices_1.fetchHistoricalData)(symbol, totalDaysNeeded);
        if (!response.success || !response.data) {
            throw new Error(`Failed to fetch historical data: ${response.error}`);
        }
        const historicalData = response.data;
        index_1.debug.success(`Fetched ${historicalData.length} historical data points`);
        // Run backtest for each period
        for (let period = 0; period < config.periods; period++) {
            console.log(chalk_1.default.blue(`📊 Testing period ${period + 1}/${config.periods}...`));
            try {
                const result = await runSingleBacktest(symbol, historicalData, period, config);
                results.push(result);
                // Collect indicator performance data
                result.indicators.forEach((ind) => {
                    if (!indicatorAccuracies[ind.name]) {
                        indicatorAccuracies[ind.name] = [];
                        indicatorErrors[ind.name] = [];
                    }
                    indicatorAccuracies[ind.name].push(ind.accuracy);
                    indicatorErrors[ind.name].push(ind.avgError);
                });
                index_1.debug.success(`Period ${period + 1} completed - Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
            }
            catch (error) {
                index_1.debug.error(`Failed to run backtest for period ${period + 1}:`, error);
                console.log(chalk_1.default.red(`❌ Period ${period + 1} failed - skipping`));
            }
        }
        // Analyze overall performance
        const analysis = analyzeBacktestResults(symbol, results, config, indicatorAccuracies, indicatorErrors);
        const totalTime = Date.now() - startTime;
        index_1.debug.success(`Backtest completed in ${totalTime}ms`);
        return analysis;
    }
    catch (error) {
        index_1.debug.error("Backtest failed:", error);
        throw new Error(`Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
/**
 * Run backtest for a single historical period
 * @param symbol - Cryptocurrency symbol
 * @param historicalData - Complete historical dataset
 * @param period - Period index
 * @param config - Backtest configuration
 * @returns Single backtest result
 */
async function runSingleBacktest(symbol, historicalData, period, config) {
    // Calculate data slice for this period
    const endIndex = historicalData.length - 1 - period * config.forecastDays;
    const startIndex = endIndex - config.historicalRange;
    if (startIndex < 0) {
        throw new Error(`Insufficient data for period ${period + 1}`);
    }
    // Extract training data (historical) and validation data (actual future)
    const trainingData = historicalData.slice(startIndex, endIndex);
    const validationData = historicalData.slice(endIndex, endIndex + config.forecastDays);
    if (trainingData.length < config.historicalRange ||
        validationData.length < config.forecastDays) {
        throw new Error(`Insufficient data for complete backtest period ${period + 1}`);
    }
    // Run indicators on training data
    const indicators = await (0, indicators_1.calculateAllIndicators)(symbol, trainingData, config.forecastDays);
    // Generate merged forecast
    const mergedForecast = (0, mergeForecasts_1.mergeForecasts)(indicators, config.forecastDays);
    // Extract actual prices and predicted prices
    const actualPrices = validationData.map((point) => point.close);
    const predictedPrices = mergedForecast.map((point) => point.avg);
    // Calculate accuracy metrics
    const accuracy = calculateAccuracy(actualPrices, predictedPrices);
    const avgError = calculateAverageError(actualPrices, predictedPrices);
    const maxError = calculateMaxError(actualPrices, predictedPrices);
    // Calculate individual indicator performance
    const indicatorPerformance = indicators.map((indicator) => ({
        name: indicator.name,
        accuracy: calculateAccuracy(actualPrices, indicator.forecast.map((f) => f.avg)),
        avgError: calculateAverageError(actualPrices, indicator.forecast.map((f) => f.avg)),
    }));
    return {
        period: period + 1,
        startDate: trainingData[0].date,
        endDate: validationData[validationData.length - 1].date,
        actualPrices,
        predictedPrices,
        accuracy,
        avgError,
        maxError,
        indicators: indicatorPerformance,
    };
}
/**
 * Analyze complete backtest results
 * @param symbol - Cryptocurrency symbol
 * @param results - Array of backtest results
 * @param config - Backtest configuration
 * @param indicatorAccuracies - Indicator accuracy data
 * @param indicatorErrors - Indicator error data
 * @returns Complete analysis
 */
function analyzeBacktestResults(symbol, results, config, indicatorAccuracies, indicatorErrors) {
    if (results.length === 0) {
        throw new Error("No successful backtest results to analyze");
    }
    // Calculate overall metrics
    const overallAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    const avgError = results.reduce((sum, r) => sum + r.avgError, 0) / results.length;
    const maxError = Math.max(...results.map((r) => r.maxError));
    const minError = Math.min(...results.map((r) => r.avgError));
    // Analyze indicator performance
    const indicatorPerformance = {};
    Object.keys(indicatorAccuracies).forEach((name) => {
        const accuracies = indicatorAccuracies[name];
        const errors = indicatorErrors[name];
        indicatorPerformance[name] = {
            accuracy: accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length,
            avgError: errors.reduce((sum, err) => sum + err, 0) / errors.length,
            reliability: calculateReliability(accuracies),
            rank: 0, // Will be set after sorting
        };
    });
    // Rank indicators by overall performance
    const sortedIndicators = Object.entries(indicatorPerformance).sort(([, a], [, b]) => b.accuracy - a.accuracy);
    sortedIndicators.forEach(([name], index) => {
        indicatorPerformance[name].rank = index + 1;
    });
    // Generate recommendations
    const recommendations = generateRecommendations(overallAccuracy, indicatorPerformance, results);
    return {
        symbol,
        totalPeriods: results.length,
        forecastDays: config.forecastDays,
        overallAccuracy,
        avgError,
        maxError,
        minError,
        results,
        indicatorPerformance,
        recommendations,
    };
}
/**
 * Calculate accuracy percentage between actual and predicted values
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns Accuracy percentage (0-1)
 */
function calculateAccuracy(actual, predicted) {
    if (actual.length !== predicted.length || actual.length === 0) {
        return 0;
    }
    let totalError = 0;
    let totalRange = 0;
    for (let i = 0; i < actual.length; i++) {
        const error = Math.abs(actual[i] - predicted[i]);
        const range = Math.max(actual[i], predicted[i]) - Math.min(actual[i], predicted[i]);
        totalError += error;
        totalRange += actual[i]; // Use actual price as baseline
    }
    const avgError = totalError / actual.length;
    const avgPrice = totalRange / actual.length;
    // Convert to accuracy percentage (higher is better)
    const errorRate = avgError / avgPrice;
    return Math.max(0, 1 - errorRate);
}
/**
 * Calculate average percentage error
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns Average percentage error
 */
function calculateAverageError(actual, predicted) {
    if (actual.length !== predicted.length || actual.length === 0) {
        return 100;
    }
    let totalError = 0;
    for (let i = 0; i < actual.length; i++) {
        const error = Math.abs(actual[i] - predicted[i]) / actual[i];
        totalError += error;
    }
    return (totalError / actual.length) * 100;
}
/**
 * Calculate maximum percentage error
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns Maximum percentage error
 */
function calculateMaxError(actual, predicted) {
    if (actual.length !== predicted.length || actual.length === 0) {
        return 100;
    }
    let maxError = 0;
    for (let i = 0; i < actual.length; i++) {
        const error = Math.abs(actual[i] - predicted[i]) / actual[i];
        maxError = Math.max(maxError, error);
    }
    return maxError * 100;
}
/**
 * Calculate reliability score based on consistency of accuracy
 * @param accuracies - Array of accuracy values
 * @returns Reliability score (0-1)
 */
function calculateReliability(accuracies) {
    if (accuracies.length === 0)
        return 0;
    const mean = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - mean, 2), 0) /
        accuracies.length;
    const stdDev = Math.sqrt(variance);
    // Lower standard deviation = higher reliability
    return Math.max(0, 1 - stdDev / mean);
}
/**
 * Generate recommendations based on backtest analysis
 * @param overallAccuracy - Overall forecast accuracy
 * @param indicatorPerformance - Performance data for each indicator
 * @param results - Individual backtest results
 * @returns Array of recommendation strings
 */
function generateRecommendations(overallAccuracy, indicatorPerformance, results) {
    const recommendations = [];
    // Overall performance assessment
    if (overallAccuracy > 0.8) {
        recommendations.push("🎯 Excellent forecast accuracy - system is highly reliable");
    }
    else if (overallAccuracy > 0.6) {
        recommendations.push("✅ Good forecast accuracy - system shows strong predictive power");
    }
    else if (overallAccuracy > 0.4) {
        recommendations.push("⚠️  Moderate accuracy - consider adjusting parameters or indicators");
    }
    else {
        recommendations.push("❌ Low accuracy - review data quality and indicator selection");
    }
    // Best performing indicators
    const topIndicators = Object.entries(indicatorPerformance)
        .sort(([, a], [, b]) => b.accuracy - a.accuracy)
        .slice(0, 3);
    recommendations.push(`🏆 Top performing indicators: ${topIndicators
        .map(([name]) => name)
        .join(", ")}`);
    // Reliability assessment
    const reliableIndicators = Object.entries(indicatorPerformance).filter(([, perf]) => perf.reliability > 0.7);
    if (reliableIndicators.length > 0) {
        recommendations.push(`🔒 Most reliable indicators: ${reliableIndicators
            .map(([name]) => name)
            .join(", ")}`);
    }
    // Trend analysis
    const recentResults = results.slice(-3);
    const recentAccuracy = recentResults.reduce((sum, r) => sum + r.accuracy, 0) /
        recentResults.length;
    if (recentAccuracy > overallAccuracy + 0.1) {
        recommendations.push("📈 Performance improving over recent periods");
    }
    else if (recentAccuracy < overallAccuracy - 0.1) {
        recommendations.push("📉 Performance declining in recent periods - consider parameter adjustment");
    }
    return recommendations;
}
/**
 * Display backtest results in a formatted console output
 * @param analysis - Complete backtest analysis
 */
function displayBacktestResults(analysis) {
    console.log(chalk_1.default.green(`
┌─────────────────────────────────────────────────────────────────┐
│                    🔍 BACKTEST ANALYSIS RESULTS                  │
└─────────────────────────────────────────────────────────────────┘`));
    console.log(chalk_1.default.cyan(`
📊 Overall Performance:
   Symbol: ${analysis.symbol}
   Periods Tested: ${analysis.totalPeriods}
   Forecast Days: ${analysis.forecastDays}
   Overall Accuracy: ${chalk_1.default.bold((analysis.overallAccuracy * 100).toFixed(1) + "%")}
   Average Error: ${analysis.avgError.toFixed(2)}%
   Max Error: ${analysis.maxError.toFixed(2)}%
   Min Error: ${analysis.minError.toFixed(2)}%`));
    console.log(chalk_1.default.yellow(`
🏆 Indicator Performance Rankings:`));
    const sortedIndicators = Object.entries(analysis.indicatorPerformance).sort(([, a], [, b]) => b.accuracy - a.accuracy);
    sortedIndicators.forEach(([name, perf]) => {
        const medal = perf.rank === 1
            ? "🥇"
            : perf.rank === 2
                ? "🥈"
                : perf.rank === 3
                    ? "🥉"
                    : "  ";
        const accuracyColor = perf.accuracy > 0.7
            ? chalk_1.default.green
            : perf.accuracy > 0.5
                ? chalk_1.default.yellow
                : chalk_1.default.red;
        console.log(`   ${medal} ${name.padEnd(15)} │ ${accuracyColor((perf.accuracy * 100).toFixed(1) + "%")} │ Error: ${perf.avgError.toFixed(2)}% │ Reliability: ${(perf.reliability * 100).toFixed(0)}%`);
    });
    console.log(chalk_1.default.magenta(`
💡 Recommendations:`));
    analysis.recommendations.forEach((rec) => {
        console.log(`   ${rec}`);
    });
    console.log(chalk_1.default.blue(`
📈 Period-by-Period Results:`));
    analysis.results.forEach((result) => {
        const accuracyColor = result.accuracy > 0.7
            ? chalk_1.default.green
            : result.accuracy > 0.5
                ? chalk_1.default.yellow
                : chalk_1.default.red;
        console.log(`   Period ${result.period}: ${accuracyColor((result.accuracy * 100).toFixed(1) + "%")} │ Error: ${result.avgError.toFixed(2)}% │ ${result.startDate} → ${result.endDate}`);
    });
}
//# sourceMappingURL=backtest.js.map