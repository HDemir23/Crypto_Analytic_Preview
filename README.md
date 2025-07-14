# 📈 Crypto Forecast CLI

A professional-grade cryptocurrency forecasting CLI tool with advanced technical analysis, trading strategies, and beautiful ASCII chart visualization.

## 🚀 Features

### 📊 Technical Analysis

- **10 Technical Indicators**: RSI, EMA, MACD, SMA, Bollinger Bands, Stochastic, VWAP, ADX, Parabolic SAR, Ichimoku
- **Real-time Data**: Powered by CoinGecko API
- **Multiple Timeframes**: 10, 20, or 30-day forecasts
- **Historical Analysis**: 30-365 days of historical data support

### 🧠 Trading Strategies

- **Mean Reversion**: RSI-based overbought/oversold analysis
- **Breakout Detection**: Support/resistance with volume confirmation
- **Golden Cross**: Moving average crossover signals
- **Momentum Divergence**: Price vs momentum divergence detection
- **Candlestick Patterns**: Doji, Hammer, Engulfing, Star patterns
- **Volatility Breakout**: Bollinger squeeze and expansion detection

### 🎯 Advanced Features

- **Strategy Consensus**: Weighted signal combination from multiple strategies
- **Confidence Scoring**: Each prediction comes with confidence percentage
- **Performance Caching**: React-like memoization for optimal performance
- **ASCII Visualization**: Beautiful terminal charts for all indicators
- **Export Options**: Save forecasts to CSV/JSON files

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd crypto-forecast-cli

# Install dependencies
npm install

# Build the project
npm run build
```

## 🎯 Quick Start

### Basic Usage

```bash
# Quick BTC forecast (10 days)
npm run quick-btc

# Quick ETH forecast (10 days)
npm run quick-eth

# BTC forecast with 20 days
npm run btc-20

# ETH forecast with 30 days
npm run eth-30
```

### Advanced Usage

```bash
# Custom forecast
npm run forecast -- --coin BTC --forecast 20 --range 90

# Save results to file
npm run forecast -- --coin ETH --forecast 30 --save

# Compare with historical accuracy
npm run forecast -- --coin BTC --forecast 10 --compare
```

## 🔧 CLI Options

```bash
Usage: crypto-forecast --coin <symbol> --forecast <days> [options]

Options:
  -c, --coin       Cryptocurrency symbol (BTC, ETH, SOL, etc.)     [required]
  -f, --forecast   Forecast period (10, 20, or 30 days)            [default: 10]
  -r, --range      Historical data range (30-365 days)             [default: 60]
  -s, --save       Save forecast to file                           [default: false]
      --compare    Compare with historical accuracy                [default: false]
  -h, --help       Show help
      --version    Show version
```

## 📈 Available NPM Scripts

| Script              | Description                           |
| ------------------- | ------------------------------------- |
| `npm run quick-btc` | Quick BTC 10-day forecast             |
| `npm run quick-eth` | Quick ETH 10-day forecast             |
| `npm run btc`       | BTC 10-day forecast (compiled)        |
| `npm run eth`       | ETH 10-day forecast (compiled)        |
| `npm run btc-20`    | BTC 20-day forecast                   |
| `npm run eth-20`    | ETH 20-day forecast                   |
| `npm run btc-30`    | BTC 30-day forecast                   |
| `npm run demo`      | Demo with BTC 10-day + 90-day history |
| `npm run build`     | Compile TypeScript to JavaScript      |
| `npm run dev`       | Run in development mode               |

## 🎨 Sample Output

```
🧠 Strategy Analysis Results
==================================================
📈 Combined Signal: SELL
🎯 Confidence: 81.5%
🗳️  Strategy Consensus:
   • Buy signals: 0
   • Sell signals: 3
   • Neutral signals: 3
⚡ Strongest Signal: Mean Reversion (85.0%)

📊 Individual Strategy Results:
   1. Mean Reversion: SELL (85.0%)
      RSI indicates overbought condition
   2. Breakout: NEUTRAL (35.0%)
      Strong momentum detected
   3. Golden Cross: SELL (45.0%)
      Moving averages expanding downward
   4. Momentum Divergence: NEUTRAL (10.0%)
      No momentum divergences detected
   5. Candlestick Reversal: SELL (71.0%)
      Bearish candlestick pattern: Doji
   6. Volatility Breakout: NEUTRAL (40.0%)
      Volatility expansion detected

⏱️  Execution: 5ms | Avg Accuracy: 62.7%
==================================================
```

## 🔍 Technical Indicators

| Indicator           | Description                           | Best For                       |
| ------------------- | ------------------------------------- | ------------------------------ |
| **RSI**             | Relative Strength Index               | Overbought/oversold conditions |
| **EMA**             | Exponential Moving Average            | Trend direction and momentum   |
| **MACD**            | Moving Average Convergence Divergence | Trend changes and momentum     |
| **SMA**             | Simple Moving Average                 | Long-term trend analysis       |
| **Bollinger Bands** | Volatility and price extremes         | Support/resistance levels      |
| **Stochastic**      | Momentum oscillator                   | Entry/exit timing              |
| **VWAP**            | Volume Weighted Average Price         | Intraday trading levels        |
| **ADX**             | Average Directional Index             | Trend strength measurement     |
| **Parabolic SAR**   | Stop and Reverse                      | Trend reversal points          |
| **Ichimoku**        | Comprehensive trend analysis          | Support/resistance clouds      |

## 🧠 Trading Strategies

### Mean Reversion Strategy

- **Focus**: RSI overbought/oversold levels
- **Signals**: Buy when RSI < 30, Sell when RSI > 70
- **Best For**: Range-bound markets

### Breakout Strategy

- **Focus**: Support/resistance breaks with volume
- **Signals**: Direction based on breakout strength
- **Best For**: Trending markets

### Golden Cross Strategy

- **Focus**: EMA/SMA crossover patterns
- **Signals**: Golden cross (bullish), Death cross (bearish)
- **Best For**: Medium-term trends

### Momentum Divergence Strategy

- **Focus**: Price vs momentum divergences
- **Signals**: Bearish/bullish divergences
- **Best For**: Trend reversal prediction

### Candlestick Reversal Strategy

- **Focus**: Japanese candlestick patterns
- **Signals**: Reversal pattern recognition
- **Best For**: Short-term reversals

### Volatility Breakout Strategy

- **Focus**: Bollinger squeeze and expansion
- **Signals**: Direction based on volatility expansion
- **Best For**: Breakout trading

## 🎯 Supported Cryptocurrencies

The tool supports all major cryptocurrencies available on CoinGecko:

- **Bitcoin (BTC)**
- **Ethereum (ETH)**
- **Binance Coin (BNB)**
- **Solana (SOL)**
- **Cardano (ADA)**
- **Polygon (MATIC)**
- **Avalanche (AVAX)**
- **Chainlink (LINK)**
- **And many more...**

## 📊 Performance Features

### Caching System

- **React-like Memoization**: useCallback and useMemo patterns
- **Multi-level Caching**: Price data, indicators, strategies, charts
- **TTL Management**: Automatic cache expiration and cleanup
- **Performance Monitoring**: Real-time cache hit rates

### Debug Information

- **Execution Times**: Detailed timing for each component
- **Cache Statistics**: Hit rates and performance metrics
- **API Calls**: Request monitoring and optimization
- **Memory Usage**: Automatic garbage collection

## 🔧 Development

### Project Structure

```
src/
├── cli/                    # Command-line interface
├── data/                   # Data fetching and caching
├── indicators/             # Technical indicators
├── strategy/               # Trading strategies
├── visual/                 # ASCII chart generation
├── forecast/               # Forecast merging and export
└── index.ts               # Main entry point
```

### Key Technologies

- **TypeScript**: Type-safe development
- **Axios**: HTTP requests to CoinGecko API
- **Yargs**: Command-line argument parsing
- **Chalk**: Terminal styling and colors
- **ASCIIChart**: Beautiful terminal charts
- **Math.js**: Mathematical computations

## 🚀 Advanced Usage Examples

### 1. Quick Analysis

```bash
# Fast BTC analysis
npm run quick-btc

# Fast ETH analysis
npm run quick-eth
```

### 2. Detailed Forecasting

```bash
# 30-day BTC forecast with 90-day history
npm run forecast -- --coin BTC --forecast 30 --range 90

# ETH forecast with file export
npm run forecast -- --coin ETH --forecast 20 --save
```

### 3. Performance Analysis

```bash
# Compare with historical accuracy
npm run forecast -- --coin BTC --forecast 10 --compare
```

### 4. Multiple Coins

```bash
# Analyze different cryptocurrencies
npm run forecast -- --coin SOL --forecast 10
npm run forecast -- --coin ADA --forecast 20
npm run forecast -- --coin MATIC --forecast 30
```

## 🎯 Interpretation Guide

### Signal Strength

- **85%+ Confidence**: Very strong signal
- **70-84% Confidence**: Strong signal
- **50-69% Confidence**: Moderate signal
- **30-49% Confidence**: Weak signal
- **<30% Confidence**: Very weak signal

### Strategy Consensus

- **Buy Signals > Sell Signals**: Overall bullish
- **Sell Signals > Buy Signals**: Overall bearish
- **Neutral Dominant**: Sideways movement expected

### Indicator Accuracy

- **75%+ Accuracy**: Highly reliable
- **65-74% Accuracy**: Good reliability
- **55-64% Accuracy**: Moderate reliability
- **<55% Accuracy**: Low reliability

## 📈 Best Practices

1. **Use Multiple Timeframes**: Combine 10, 20, and 30-day forecasts
2. **Check Strategy Consensus**: Don't rely on single strategy
3. **Monitor Confidence Scores**: Higher confidence = more reliable
4. **Consider Market Conditions**: Adapt strategy selection to market phase
5. **Regular Updates**: Run forecasts regularly for fresh data

## 🔧 Troubleshooting

### Common Issues

1. **API Rate Limits**: Wait a few minutes between requests
2. **Network Errors**: Check internet connection
3. **Build Errors**: Run `npm install` and `npm run build`
4. **TypeScript Errors**: Ensure all dependencies are installed

### Performance Optimization

1. **Use Caching**: Results are cached for 5 minutes
2. **Smaller Ranges**: Use shorter historical ranges for faster execution
3. **Parallel Execution**: Multiple indicators run simultaneously

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **CoinGecko API** for cryptocurrency data
- **Technical Analysis Community** for indicator implementations
- **ASCII Chart Libraries** for terminal visualization
- **Open Source Community** for inspiration and support

---

**⚠️ Disclaimer**: This tool is for educational and research purposes only. Cryptocurrency trading involves substantial risk. Always do your own research and consult with financial advisors before making investment decisions.

## 🔗 Links

- [CoinGecko API](https://www.coingecko.com/en/api)
- [Technical Analysis Guide](https://www.investopedia.com/technical-analysis-4689657)
- [Cryptocurrency Trading Basics](https://www.investopedia.com/cryptocurrency-4427699)

---

Made with ❤️ by the Crypto Forecast CLI team
