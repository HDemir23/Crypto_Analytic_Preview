"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStrategyConfig = exports.DEFAULT_STRATEGY_CONFIG = exports.getStrategyPerformanceStats = exports.getStrategiesByCategory = exports.STRATEGY_CATEGORIES = exports.getStrategyNames = exports.getAllStrategies = exports.getStrategyByName = exports.initializeStrategies = exports.VolatilityBreakoutStrategy = exports.CandlestickReversalStrategy = exports.MomentumDivergenceStrategy = exports.GoldenCrossStrategy = exports.BreakoutStrategy = exports.MeanReversionStrategy = void 0;
// Export all strategy classes
var meanReversionStrategy_1 = require("./meanReversionStrategy");
Object.defineProperty(exports, "MeanReversionStrategy", { enumerable: true, get: function () { return meanReversionStrategy_1.MeanReversionStrategy; } });
var breakoutStrategy_1 = require("./breakoutStrategy");
Object.defineProperty(exports, "BreakoutStrategy", { enumerable: true, get: function () { return breakoutStrategy_1.BreakoutStrategy; } });
var goldenCrossStrategy_1 = require("./goldenCrossStrategy");
Object.defineProperty(exports, "GoldenCrossStrategy", { enumerable: true, get: function () { return goldenCrossStrategy_1.GoldenCrossStrategy; } });
var momentumDivergenceStrategy_1 = require("./momentumDivergenceStrategy");
Object.defineProperty(exports, "MomentumDivergenceStrategy", { enumerable: true, get: function () { return momentumDivergenceStrategy_1.MomentumDivergenceStrategy; } });
var candlestickReversalStrategy_1 = require("./candlestickReversalStrategy");
Object.defineProperty(exports, "CandlestickReversalStrategy", { enumerable: true, get: function () { return candlestickReversalStrategy_1.CandlestickReversalStrategy; } });
var volatilityBreakoutStrategy_1 = require("./volatilityBreakoutStrategy");
Object.defineProperty(exports, "VolatilityBreakoutStrategy", { enumerable: true, get: function () { return volatilityBreakoutStrategy_1.VolatilityBreakoutStrategy; } });
// Export types and utilities
__exportStar(require("./types"), exports);
// Import strategy classes for registry
const meanReversionStrategy_2 = require("./meanReversionStrategy");
const breakoutStrategy_2 = require("./breakoutStrategy");
const goldenCrossStrategy_2 = require("./goldenCrossStrategy");
const momentumDivergenceStrategy_2 = require("./momentumDivergenceStrategy");
const candlestickReversalStrategy_2 = require("./candlestickReversalStrategy");
const volatilityBreakoutStrategy_2 = require("./volatilityBreakoutStrategy");
// Strategy registry with memoization (equivalent to useMemo)
const strategyRegistry = new Map();
// Initialize strategies (equivalent to useCallback)
exports.initializeStrategies = (() => {
    let initialized = false;
    return () => {
        if (initialized) {
            return strategyRegistry;
        }
        // Register all strategies
        const strategies = [
            new meanReversionStrategy_2.MeanReversionStrategy(),
            new breakoutStrategy_2.BreakoutStrategy(),
            new goldenCrossStrategy_2.GoldenCrossStrategy(),
            new momentumDivergenceStrategy_2.MomentumDivergenceStrategy(),
            new candlestickReversalStrategy_2.CandlestickReversalStrategy(),
            new volatilityBreakoutStrategy_2.VolatilityBreakoutStrategy(),
        ];
        strategies.forEach((strategy) => {
            strategyRegistry.set(strategy.name, strategy);
        });
        initialized = true;
        return strategyRegistry;
    };
})();
// Get strategy by name (equivalent to useCallback)
const getStrategyByName = (name) => {
    const registry = (0, exports.initializeStrategies)();
    return registry.get(name);
};
exports.getStrategyByName = getStrategyByName;
// Get all available strategies
const getAllStrategies = () => {
    const registry = (0, exports.initializeStrategies)();
    return Array.from(registry.values());
};
exports.getAllStrategies = getAllStrategies;
// Get strategy names
const getStrategyNames = () => {
    const registry = (0, exports.initializeStrategies)();
    return Array.from(registry.keys());
};
exports.getStrategyNames = getStrategyNames;
// Strategy categories for organization
exports.STRATEGY_CATEGORIES = {
    MEAN_REVERSION: ["Mean Reversion"],
    TREND_FOLLOWING: ["Golden Cross", "Breakout"],
    MOMENTUM: ["Momentum Divergence"],
    PATTERN_RECOGNITION: ["Candlestick Reversal"],
    VOLATILITY: ["Volatility Breakout"],
};
// Get strategies by category
const getStrategiesByCategory = (category) => {
    const registry = (0, exports.initializeStrategies)();
    const strategyNames = exports.STRATEGY_CATEGORIES[category];
    return strategyNames
        .map((name) => registry.get(name))
        .filter(Boolean);
};
exports.getStrategiesByCategory = getStrategiesByCategory;
// Performance tracking for strategies
const getStrategyPerformanceStats = () => {
    const registry = (0, exports.initializeStrategies)();
    const stats = new Map();
    for (const [name, strategy] of registry) {
        // Find category
        let category = "Other";
        for (const [catName, strategies] of Object.entries(exports.STRATEGY_CATEGORIES)) {
            if (strategies.includes(name)) {
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
exports.getStrategyPerformanceStats = getStrategyPerformanceStats;
// Default strategy configuration
exports.DEFAULT_STRATEGY_CONFIG = {
    forecastDays: 10,
    symbol: "BTC",
    lookbackPeriod: 14,
    sensitivity: 0.5,
    riskLevel: "medium",
};
// Create strategy configuration with defaults
const createStrategyConfig = (overrides = {}) => {
    return {
        ...exports.DEFAULT_STRATEGY_CONFIG,
        ...overrides,
    };
};
exports.createStrategyConfig = createStrategyConfig;
//# sourceMappingURL=index.js.map