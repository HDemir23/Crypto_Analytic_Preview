// CLI module - Will handle command line argument parsing
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import chalk from "chalk";
import { debug } from "../index";

// CLI configuration interface
export interface CLIConfig {
  coin: string;
  forecast: number;
  range: number;
  save?: boolean;
  compare?: boolean;
}

// Performance: Cache for validated configurations
const configCache = new Map<string, CLIConfig>();

// Performance: Memoize validation results
const validationCache = new Map<string, { valid: boolean; error?: string }>();

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
function validateCoin(coin: string): { valid: boolean; error?: string } {
  const cacheKey = `coin:${coin}`;

  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }

  const upperCoin = coin.toUpperCase();
  const result = SUPPORTED_COINS.includes(upperCoin)
    ? { valid: true }
    : {
        valid: false,
        error: `Unsupported coin: ${coin}. Supported: ${SUPPORTED_COINS.join(
          ", "
        )}`,
      };

  validationCache.set(cacheKey, result);
  return result;
}

function validateForecast(forecast: number): {
  valid: boolean;
  error?: string;
} {
  const cacheKey = `forecast:${forecast}`;

  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
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

function validateRange(range: number): { valid: boolean; error?: string } {
  const cacheKey = `range:${range}`;

  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }

  const result =
    range >= 30 && range <= 365
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
  console.log(
    chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                📈 Crypto Forecast CLI Tool                   ║
║              Technical Analysis with ASCII Charts            ║
║                                                              ║
║  Usage: crypto-forecast --coin BTC --forecast 20 --range 60  ║
╚══════════════════════════════════════════════════════════════╝
`)
  );
}

// Help examples
function displayExamples() {
  console.log(
    chalk.yellow(`
Examples:
  crypto-forecast --coin BTC --forecast 10           # 10-day BTC forecast
  crypto-forecast --coin ETH --forecast 30 --range 90 # 30-day ETH forecast with 90-day history
  crypto-forecast --coin SOL --forecast 20 --save    # Save forecast to file
  crypto-forecast --coin BTC --forecast 10 --compare # Compare with historical accuracy
`)
  );
}

// Performance: Cached configuration parser
export function parseArguments(): CLIConfig {
  const args = process.argv.slice(2);
  const cacheKey = args.join("|");

  if (configCache.has(cacheKey)) {
    debug.log("Using cached CLI configuration");
    return configCache.get(cacheKey)!;
  }

  debug.log("Parsing CLI arguments...");

  const argv = yargs(hideBin(process.argv))
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
    .example(
      "$0 --coin ETH --forecast 30 --range 90",
      "Forecast ETH for 30 days using 90-day history"
    )
    .help("h")
    .alias("h", "help")
    .version("1.0.0")
    .epilog(
      "For more information, visit: https://github.com/your-repo/crypto-forecast"
    )
    .parseSync();

  const config: CLIConfig = {
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
export function validateConfiguration(config: CLIConfig): void {
  debug.log("Validating CLI configuration...", config);

  // Validate coin
  const coinValidation = validateCoin(config.coin);
  if (!coinValidation.valid) {
    debug.error("Invalid coin:", coinValidation.error);
    console.error(chalk.red(`❌ ${coinValidation.error}`));
    process.exit(1);
  }

  // Validate forecast
  const forecastValidation = validateForecast(config.forecast);
  if (!forecastValidation.valid) {
    debug.error("Invalid forecast:", forecastValidation.error);
    console.error(chalk.red(`❌ ${forecastValidation.error}`));
    process.exit(1);
  }

  // Validate range
  const rangeValidation = validateRange(config.range);
  if (!rangeValidation.valid) {
    debug.error("Invalid range:", rangeValidation.error);
    console.error(chalk.red(`❌ ${rangeValidation.error}`));
    process.exit(1);
  }

  debug.success("CLI configuration validated successfully");
}

// Display configuration summary
export function displayConfigSummary(config: CLIConfig): void {
  console.log(
    chalk.green(`
┌─────────────────────────────────────────────┐
│            📊 Configuration Summary         │
├─────────────────────────────────────────────┤
│  Cryptocurrency: ${chalk.bold(config.coin.padEnd(20))}    │
│  Forecast Period: ${chalk.bold(config.forecast + " days".padEnd(18))}    │
│  Historical Range: ${chalk.bold(config.range + " days".padEnd(17))}    │
│  Save to File: ${chalk.bold(config.save ? "Yes" : "No".padEnd(21))}    │
│  Backtest Mode: ${chalk.bold(config.compare ? "Yes" : "No".padEnd(20))}    │
└─────────────────────────────────────────────┘
`)
  );
}

// Main CLI initialization function
export function initializeCLI(): CLIConfig {
  debug.log("CLI module initialized");

  displayBanner();

  try {
    const config = parseArguments();
    validateConfiguration(config);
    displayConfigSummary(config);

    debug.success("CLI initialization completed successfully");
    return config;
  } catch (error) {
    debug.error("CLI initialization failed:", error);
    displayExamples();
    process.exit(1);
  }
}

// Performance monitoring
export function getCacheStats() {
  return {
    configCache: configCache.size,
    validationCache: validationCache.size,
  };
}

// Clear caches (for testing)
export function clearCaches() {
  configCache.clear();
  validationCache.clear();
  debug.log("CLI caches cleared");
}
