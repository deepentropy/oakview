# OakView Examples

This directory contains working examples demonstrating how to integrate OakView into your projects.

## Available Examples

### 1. CSV Example
**Path:** `examples/csv-example/`

Load and display historical market data from CSV files. Perfect for:
- Static data visualization
- Backtesting strategies
- Demos and prototypes
- Offline applications

**Features:**
- Simple CSV file loading
- Flexible file naming patterns
- Multiple time format support
- No server required

[View CSV Example Documentation →](./csv-example/README.md)

### 2. WebSocket Example (Generic Template)
**Path:** `examples/websocket-example/`

Generic template for integrating real-time WebSocket data. Ideal for:
- Custom WebSocket integrations
- Learning how to build providers
- Adapting to your own backend
- Testing and development

**Features:**
- Real-time data streaming template
- Mock provider for testing
- Automatic reconnection example
- Bar aggregation from ticks
- Multiple symbol support

[View WebSocket Example Documentation →](./websocket-example/README.md)

### 3. VoltTrading Integration (Production Example)
**Path:** `examples/volttrading-integration/`

Production-ready integration with VoltTrading backend. Best for:
- VoltTrading platform users
- Production trading applications
- Complete reference implementation
- Multi-pane layouts with state management

**Features:**
- Complete VoltTrading provider
- Historical data via REST API
- Real-time quotes via WebSocket
- Client-side bar aggregation (33 timeframes)
- Reference-counted subscriptions
- Symbol search integration
- Multi-pane configuration persistence

[View VoltTrading Integration Documentation →](./volttrading-integration/README.md)

## Quick Start

### CSV Example

```bash
cd examples/csv-example
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### WebSocket Example

```bash
cd examples/websocket-example
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### VoltTrading Integration

```bash
cd examples/volttrading-integration
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

> **Note:** Requires VoltTrading backend running on http://localhost:8000

## Project Structure

```
examples/
├── README.md                              # This file
│
├── csv-example/                           # Static CSV data example
│   ├── README.md                         # Detailed documentation
│   ├── index.html                        # Demo page
│   ├── package.json                      # Dependencies
│   ├── providers/                        # Custom provider
│   │   └── csv-provider.js              # CSV data provider implementation
│   └── data/                             # Sample CSV files
│       ├── SPX_1D.csv
│       └── QQQ_60.csv
│
├── websocket-example/                     # Generic WebSocket template
│   ├── README.md                         # Detailed documentation
│   ├── index.html                        # Demo page with mock provider
│   ├── package.json                      # Dependencies
│   └── providers/                        # Custom provider templates
│       └── custom-websocket-provider.js  # Generic WebSocket template
│
└── volttrading-integration/               # Production VoltTrading integration
    ├── README.md                         # Detailed documentation
    ├── index.html                        # Production demo
    ├── package.json                      # Dependencies
    └── volttrading-provider.js           # Complete VoltTrading provider
```

## Data Providers

OakView uses a flexible data provider system based on the `OakViewDataProvider` interface.

### Using the Data Provider

All examples now use the built distribution for imports:

```javascript
import { OakViewDataProvider } from '../../dist/oakview.es.js';
```

### Base Provider Interface

**Base Provider** (`dist/oakview.es.js` exports `OakViewDataProvider`)
- Abstract base class that defines the provider interface
- Part of the core OakView library
- All custom providers must extend this class

### Example Provider Implementations

The examples folder contains reference implementations you can use as templates:

**CSV Provider** (`examples/csv-example/providers/csv-provider.js`)
- Loads static historical data from CSV files
- Simple file-based storage
- Good for demos and backtesting

**Custom WebSocket Provider** (`examples/websocket-example/providers/custom-websocket-provider.js`)
- Generic template for WebSocket integration
- Mock data for testing
- Customize for your backend

**VoltTrading Provider** (`examples/volttrading-integration/volttrading-provider.js`)
- Production-ready VoltTrading integration
- REST API for historical data
- WebSocket for real-time quotes
- Client-side bar aggregation for 33 timeframes
- Reference-counted subscription management

## Creating Your Own Provider

To create a custom provider, extend the base class:

```javascript
import { OakViewDataProvider } from 'oakview/dist/oakview.es.js';

class MyCustomProvider extends OakViewDataProvider {
  async initialize(config) {
    // Setup connection to your data source
  }

  async fetchHistorical(symbol, interval, from, to) {
    // Return array of { time, open, high, low, close, volume }
  }

  subscribe(symbol, interval, callback) {
    // Setup real-time subscription
    // Call callback(bar) when new data arrives
    // Return unsubscribe function
  }

  async searchSymbols(query) {
    // Return array of matching symbols
  }

  disconnect() {
    // Cleanup resources
  }
}
```

## Using OakView in Your App

### Installation

```bash
npm install oakview
```

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Trading App</title>
</head>
<body>
  <oak-view id="chart" theme="dark" symbol="AAPL"></oak-view>

  <script type="module">
    import 'oakview/dist/oakview.es.js';
    import { OakViewDataProvider } from 'oakview/dist/oakview.es.js';
    
    // Create your custom provider
    class MyProvider extends OakViewDataProvider {
      // ... implement required methods
    }
    
    // Initialize
    const chart = document.getElementById('chart');
    const provider = new MyProvider();
    await provider.initialize();
    chart.setDataProvider(provider);
  </script>
</body>
</html>
```

```html
<oakview-chart-layout
  id="chart"
  symbol="AAPL"
  interval="1D"
  theme="dark"
  layout="single">
</oakview-chart-layout>
```

```javascript
const chart = document.getElementById('chart');
chart.setDataProvider(provider);
```

## Common Configuration Options

### Chart Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | string | - | Stock/asset symbol |
| `interval` | string | `'1D'` | Timeframe (1, 5, 15, 60, 1D, 1W) |
| `theme` | string | `'dark'` | Color theme (dark/light) |
| `layout` | string | `'single'` | Chart layout (single/split/quad) |

### Data Provider Options

#### CSV Provider

```javascript
new CSVDataProvider({
  baseUrl: './data/',           // Base path for CSV files
  filename: 'data.csv',         // Fixed filename (optional)
  filePattern: (s, i) => `...`  // Custom naming function
})
```

#### Custom WebSocket Provider

```javascript
new CustomWebSocketProvider({
  wsUrl: 'wss://...',           // WebSocket endpoint
  apiUrl: 'https://...',        // REST API endpoint
  apiKey: 'your-key',           // Authentication (optional)
  options: { ... }              // Additional options
})
```

## Data Format Requirements

### OHLCV Data Structure

All providers must return data in this format:

```javascript
{
  time: 1704067200,        // Unix timestamp (seconds) or ISO date string
  open: 100.50,            // Opening price
  high: 102.75,            // Highest price
  low: 99.25,              // Lowest price
  close: 101.00,           // Closing price
  volume: 1000000          // Trading volume (optional)
}
```

### Supported Time Formats

- Unix timestamp (seconds): `1704067200`
- Unix timestamp (milliseconds): `1704067200000`
- ISO 8601: `"2024-01-01T00:00:00Z"`
- Date only: `"2024-01-01"`
- Human-readable: `"2024-01-01 12:00:00"`

## Troubleshooting

### Charts Not Displaying

**Check:**
1. Data provider is properly initialized
2. Data is in correct format (see above)
3. Time values are valid
4. Browser console for errors

### CSV Files Not Loading

**Check:**
1. File path is correct
2. CSV has header row
3. Required columns exist (time, open, high, low, close)
4. CORS settings allow file access

### WebSocket Not Connecting

**Check:**
1. WebSocket URL is correct and accessible
2. Authentication credentials are valid
3. CORS/security settings allow WebSocket
4. Network/firewall doesn't block WebSocket

### Performance Issues

**Solutions:**
- Implement update throttling (limit to 10-30 updates/sec)
- Reduce number of simultaneous subscriptions
- Use appropriate chart intervals (longer = better performance)
- Consider data downsampling for historical data

## Browser Compatibility

OakView works in all modern browsers that support:
- ES6 Modules
- Web Components (Custom Elements)
- WebSocket (for real-time providers)
- Fetch API

**Supported Browsers:**
- Chrome 63+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Development Tips

### Hot Module Replacement

Both examples use Vite with HMR enabled. Changes to your code will automatically refresh the page.

### Debugging

Enable verbose logging:

```javascript
// In browser console
localStorage.setItem('oakview:debug', 'true');
location.reload();
```

### Testing with Mock Data

Use the included mock provider for testing:

```javascript
import MockWebSocketProvider from './websocket-example/index.html';
// See WebSocket example for implementation
```

## Next Steps

- Customize chart appearance and styling
- Add technical indicators
- Implement drawing tools
- Build a complete trading interface
- Create your own data provider

## Resources

- [OakView Documentation](../docs/)
- [Lightweight Charts v5 Docs](https://tradingview.github.io/lightweight-charts/docs)
- [Data Provider API](../data-providers/README.md)

## Support

For questions or issues:
- GitHub Issues: [Create an Issue](https://github.com/yourrepo/oakview/issues)
- Documentation: [OakView Docs](../docs/)
- Examples: Check the example source code

## License

MIT License - See [LICENSE](../LICENSE) for details
