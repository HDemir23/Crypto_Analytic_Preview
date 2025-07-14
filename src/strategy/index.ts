// Export all strategy classes
export { MeanReversionStrategy } from "./meanReversionStrategy";
export { BreakoutStrategy } from "./breakoutStrategy";
export { GoldenCrossStrategy } from "./goldenCrossStrategy";
export { MomentumDivergenceStrategy } from "./momentumDivergenceStrategy";
export { CandlestickReversalStrategy } from "./candlestickReversalStrategy";
export { VolatilityBreakoutStrategy } from "./volatilityBreakoutStrategy";

// Export types and utilities
export * from "./types";

// Import strategy classes for registry
import { MeanReversionStrategy } from "./meanReversionStrategy";
import { BreakoutStrategy } from "./breakoutStrategy";
import { GoldenCrossStrategy } from "./goldenCrossStrategy";
import { MomentumDivergenceStrategy } from "./momentumDivergenceStrategy";
import { CandlestickReversalStrategy } from "./candlestickReversalStrategy";
import { VolatilityBreakoutStrategy } from "./volatilityBreakoutStrategy";
import { Strategy } from "./types";

// Strategy registry with memoization (equivalent to useMemo)
const strategyRegistry = new Map<string, Strategy>();

// Initialize strategies (equivalent to useCallback)
export const initializeStrategies = (() => {
  let initialized = false;

  return (): Map<string, Strategy> => {
    if (initialized) {
      return strategyRegistry;
    }

    // Register all strategies
    const strategies = [
      new MeanReversionStrategy(),
      new BreakoutStrategy(),
      new GoldenCrossStrategy(),
      new MomentumDivergenceStrategy(),
      new CandlestickReversalStrategy(),
      new VolatilityBreakoutStrategy(),
    ];

    strategies.forEach((strategy) => {
      strategyRegistry.set(strategy.name, strategy);
    });

    initialized = true;
    return strategyRegistry;
  };
})();

// Get strategy by name (equivalent to useCallback)
export const getStrategyByName = (name: string): Strategy | undefined => {
  const registry = initializeStrategies();
  return registry.get(name);
};

// Get all available strategies
export const getAllStrategies = (): Strategy[] => {
  const registry = initializeStrategies();
  return Array.from(registry.values());
};

// Get strategy names
export const getStrategyNames = (): string[] => {
  const registry = initializeStrategies();
  return Array.from(registry.keys());
};

// Strategy categories for organization
export const STRATEGY_CATEGORIES = {
  MEAN_REVERSION: ["Mean Reversion"],
  TREND_FOLLOWING: ["Golden Cross", "Breakout"],
  MOMENTUM: ["Momentum Divergence"],
  PATTERN_RECOGNITION: ["Candlestick Reversal"],
  VOLATILITY: ["Volatility Breakout"],
} as const;

// Get strategies by category
export const getStrategiesByCategory = (
  category: keyof typeof STRATEGY_CATEGORIES
): Strategy[] => {
  const registry = initializeStrategies();
  const strategyNames = STRATEGY_CATEGORIES[category];
  return strategyNames
    .map((name) => registry.get(name))
    .filter(Boolean) as Strategy[];
};

// Performance tracking for strategies
export const getStrategyPerformanceStats = () => {
  const registry = initializeStrategies();
  const stats = new Map<
    string,
    {
      accuracy: number;
      weight: number;
      category: string;
      description: string;
    }
  >();

  for (const [name, strategy] of registry) {
    // Find category
    let category = "Other";
    for (const [catName, strategies] of Object.entries(STRATEGY_CATEGORIES)) {
      if ((strategies as readonly string[]).includes(name)) {
        category = catName;
        break;
      }
    }

    stats.set(name, {
      accuracy: 0.75, // Default accuracy, would be updated based on historical performance
      weight: 0.8, // Default weight, would be updated based on recent performance
      category,
      description: strategy.description,
    });
  }

  return stats;
};

// Default strategy configuration
export const DEFAULT_STRATEGY_CONFIG = {
  forecastDays: 10,
  symbol: "BTC",
  lookbackPeriod: 14,
  sensitivity: 0.5,
  riskLevel: "medium" as const,
};

// Create strategy configuration with defaults
export const createStrategyConfig = (overrides: Partial<any> = {}): any => {
  return {
    ...DEFAULT_STRATEGY_CONFIG,
    ...overrides,
  };
};
