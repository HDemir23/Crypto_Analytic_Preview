"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArguments = parseArguments;
exports.validateConfiguration = validateConfiguration;
exports.displayConfigSummary = displayConfigSummary;
exports.initializeCLI = initializeCLI;
exports.getCacheStats = getCacheStats;
exports.clearCaches = clearCaches;
// CLI module - Will handle command line argument parsing
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("../index");
// Performance: Cache for validated configurations
const configCache = new Map();
// Performance: Memoize validation results
const validationCache = new Map();
// Supported cryptocurrencies (expandable)
const SUPPORTED_COINS = [
    // Major cryptocurrencies
    "BTC",
    "ETH",
    "SOL",
    "ADA",
    "DOT",
    "MATIC",
    "AVAX",
    "LINK",
    "UNI",
    "ATOM",
    // Meme tokens
    "PEPE",
    "FLOKI",
    "SHIB",
    "DOGE",
    "BONK",
    "TRUMP",
    "FARTCOIN",
    // Layer 1 / Ecosystem tokens
    "SUI",
    "SEI",
    "JUP",
    // Tool / Utility coins
    "SNORT",
    "SPY",
    "BEST",
    "TOKEN6900",
];
// Validation functions with memoization
function validateCoin(coin) {
    const cacheKey = `coin:${coin}`;
    if (validationCache.has(cacheKey)) {
        return validationCache.get(cacheKey);
    }
    const upperCoin = coin.toUpperCase();
    const result = SUPPORTED_COINS.includes(upperCoin)
        ? { valid: true }
        : {
            valid: false,
            error: `Unsupported coin: ${coin}. Supported: ${SUPPORTED_COINS.join(", ")}`,
        };
    validationCache.set(cacheKey, result);
    return result;
}
function validateForecast(forecast) {
    const cacheKey = `forecast:${forecast}`;
    if (validationCache.has(cacheKey)) {
        return validationCache.get(cacheKey);
    }
    const result = [10, 20, 30].includes(forecast)
        ? { valid: true }
        : {
            valid: false,
            error: `Forecast must be 10, 20, or 30 days. Got: ${forecast}`,
        };
    validationCache.set(cacheKey, result);
    return result;
}
function validateRange(range) {
    const cacheKey = `range:${range}`;
    if (validationCache.has(cacheKey)) {
        return validationCache.get(cacheKey);
    }
    const result = range >= 30 && range <= 365
        ? { valid: true }
        : {
            valid: false,
            error: `Range must be between 30 and 365 days. Got: ${range}`,
        };
    validationCache.set(cacheKey, result);
    return result;
}
// Display CLI banner
function displayBanner() {
    console.log(chalk_1.default.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                📈 Crypto Forecast CLI Tool                   ║
║              Technical Analysis with ASCII Charts            ║
║                                                              ║
║  Usage: crypto-forecast --coin BTC --forecast 20 --range 60  ║
╚══════════════════════════════════════════════════════════════╝
`));
}
// Help examples
function displayExamples() {
    console.log(chalk_1.default.yellow(`
Examples:
  crypto-forecast --coin BTC --forecast 10           # 10-day BTC forecast
  crypto-forecast --coin ETH --forecast 30 --range 90 # 30-day ETH forecast with 90-day history
  crypto-forecast --coin SOL --forecast 20 --save    # Save forecast to file
  crypto-forecast --coin BTC --forecast 10 --compare # Compare with historical accuracy
`));
}
// Performance: Cached configuration parser
function parseArguments() {
    const args = process.argv.slice(2);
    const cacheKey = args.join("|");
    if (configCache.has(cacheKey)) {
        index_1.debug.log("Using cached CLI configuration");
        return configCache.get(cacheKey);
    }
    index_1.debug.log("Parsing CLI arguments...");
    const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .scriptName("crypto-forecast")
        .usage("Usage: $0 --coin <symbol> --forecast <days> [options]")
        .option("coin", {
        alias: "c",
        type: "string",
        description: "Cryptocurrency symbol (e.g., BTC, ETH, SOL)",
        demandOption: true,
    })
        .option("forecast", {
        alias: "f",
        type: "number",
        description: "Number of days to forecast (10, 20, or 30)",
        default: 10,
        choices: [10, 20, 30],
    })
        .option("range", {
        alias: "r",
        type: "number",
        description: "Historical data range in days (30-365)",
        default: 60,
    })
        .option("save", {
        alias: "s",
        type: "boolean",
        description: "Save forecast to file",
        default: false,
    })
        .option("compare", {
        type: "boolean",
        description: "Compare with historical accuracy (backtest)",
        default: false,
    })
        .example("$0 --coin BTC --forecast 10", "Forecast BTC for 10 days")
        .example("$0 --coin ETH --forecast 30 --range 90", "Forecast ETH for 30 days using 90-day history")
        .help("h")
        .alias("h", "help")
        .version("1.0.0")
        .epilog("For more information, visit: https://github.com/your-repo/crypto-forecast")
        .parseSync();
    const config = {
        coin: argv.coin.toUpperCase(),
        forecast: argv.forecast,
        range: argv.range,
        save: argv.save,
        compare: argv.compare,
    };
    // Cache the parsed configuration
    configCache.set(cacheKey, config);
    return config;
}
// Validate configuration with performance optimizations
function validateConfiguration(config) {
    index_1.debug.log("Validating CLI configuration...", config);
    // Validate coin
    const coinValidation = validateCoin(config.coin);
    if (!coinValidation.valid) {
        index_1.debug.error("Invalid coin:", coinValidation.error);
        console.error(chalk_1.default.red(`❌ ${coinValidation.error}`));
        process.exit(1);
    }
    // Validate forecast
    const forecastValidation = validateForecast(config.forecast);
    if (!forecastValidation.valid) {
        index_1.debug.error("Invalid forecast:", forecastValidation.error);
        console.error(chalk_1.default.red(`❌ ${forecastValidation.error}`));
        process.exit(1);
    }
    // Validate range
    const rangeValidation = validateRange(config.range);
    if (!rangeValidation.valid) {
        index_1.debug.error("Invalid range:", rangeValidation.error);
        console.error(chalk_1.default.red(`❌ ${rangeValidation.error}`));
        process.exit(1);
    }
    index_1.debug.success("CLI configuration validated successfully");
}
// Display configuration summary
function displayConfigSummary(config) {
    console.log(chalk_1.default.green(`
┌─────────────────────────────────────────────┐
│            📊 Configuration Summary         │
├─────────────────────────────────────────────┤
│  Cryptocurrency: ${chalk_1.default.bold(config.coin.padEnd(20))}    │
│  Forecast Period: ${chalk_1.default.bold(config.forecast + " days".padEnd(18))}    │
│  Historical Range: ${chalk_1.default.bold(config.range + " days".padEnd(17))}    │
│  Save to File: ${chalk_1.default.bold(config.save ? "Yes" : "No".padEnd(21))}    │
│  Backtest Mode: ${chalk_1.default.bold(config.compare ? "Yes" : "No".padEnd(20))}    │
└─────────────────────────────────────────────┘
`));
}
// Main CLI initialization function
function initializeCLI() {
    index_1.debug.log("CLI module initialized");
    displayBanner();
    try {
        const config = parseArguments();
        validateConfiguration(config);
        displayConfigSummary(config);
        index_1.debug.success("CLI initialization completed successfully");
        return config;
    }
    catch (error) {
        index_1.debug.error("CLI initialization failed:", error);
        displayExamples();
        process.exit(1);
    }
}
// Performance monitoring
function getCacheStats() {
    return {
        configCache: configCache.size,
        validationCache: validationCache.size,
    };
}
// Clear caches (for testing)
function clearCaches() {
    configCache.clear();
    validationCache.clear();
    index_1.debug.log("CLI caches cleared");
}
//# sourceMappingURL=index.js.map