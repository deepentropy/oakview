# VoltTrading Integration Example

This example demonstrates how to integrate OakView with a real-time trading backend using a custom data provider.

## Files

### `volttrading-provider.js`
Custom data provider implementation that connects OakView to the VoltTrading backend API.

**Key features:**
- Fetches historical OHLCV data via REST API
- Streams real-time quotes via WebSocket
- Client-side bar aggregation for multiple timeframes
- Reference-counted subscription management

### `index.html`
Complete example showing how to use OakView with VoltTrading.

**What it demonstrates:**
- Auto-connecting to backend on page load
- Using the layout component with toolbar
- Multiple chart layouts (single, double, triple, quad)
- Proper subscription cleanup when switching symbols/intervals
- Handling all toolbar events (symbol, interval, layout changes)
- Preventing duplicate API calls and subscriptions
- Subscribing to real-time updates
- Production-ready code structure

## Running the Examples

### Prerequisites
1. VoltTrading backend must be running on `http://localhost:8000`
2. The backend should expose:
   - `GET /api/market-data/{symbol}/history` - Historical data
   - `POST /api/market-data/subscribe` - Subscribe to quotes
   - `POST /api/market-data/unsubscribe` - Unsubscribe from quotes
   - `GET /api/symbols/search` - Symbol search
   - `ws://localhost:8000/ws` - WebSocket for real-time quotes

### Start Development Server
```bash
# From the oakview project root
npm run dev
```

Then open:
- http://localhost:5173/examples/volttrading-integration/

## Provider Architecture

### Service Wrappers

The VoltTrading provider requires two service objects:

```javascript
// WebSocket service - handles real-time data
class WebSocketService {
  connect() { }
  on(event, callback) { }
  emit(event, data) { }
  isConnected() { }
  disconnect() { }
}

// API service - handles REST requests
class APIService {
  async getHistoricalData(symbol, duration, timeframe) { }
  async subscribeMarketData(symbols) { }
  async unsubscribeMarketData(symbols) { }
  async searchSymbols(query) { }
}
```

### Provider Interface

The VoltTrading provider extends `OakViewDataProvider`:

```javascript
class VoltTradingProvider extends OakViewDataProvider {
  async initialize(config) { }
  async fetchHistorical(symbol, interval, from, to) { }
  subscribe(symbol, interval, callback) { }
  async searchSymbols(query) { }
  disconnect() { }
}
```

## Customization

### Adapting to Your Backend

To use this provider with your own backend:

1. **Copy the provider**: `volttrading-provider.js` → `your-provider.js`

2. **Update interval conversion** (`_convertInterval` method):
   ```javascript
   _convertInterval(interval) {
     // Map OakView format to your backend's format
     // OakView uses: '1m', '5m', '1h', '1D'
     // Change to match your API
   }
   ```

3. **Update API endpoints** in your service wrappers:
   ```javascript
   async getHistoricalData(symbol, duration, timeframe) {
     const url = `${this.baseUrl}/your/api/${symbol}`;
     // ...
   }
   ```

4. **Update timestamp handling** if your backend uses different formats:
   ```javascript
   // In fetchHistorical, adjust timestamp parsing
   const unixTime = Math.floor(new Date(bar.timestamp).getTime() / 1000);
   ```

5. **Update bar aggregation logic** (`_getCurrentBarTime` method) if needed

### Using in Production

In a production app, install OakView as a package:

```bash
npm install oakview
```

Then import:

```javascript
import { OakViewChartLayout, OakViewDataProvider } from 'oakview';
import VoltTradingProvider from './providers/volttrading-provider.js';
```

## Common Issues

### "Cannot update oldest data" errors
- **Cause**: Old subscriptions still active when switching timeframes
- **Fix**: Properly unsubscribe before creating new subscriptions
- **See**: The provider's `subscribe()` method returns an unsubscribe function

### Negative subscription counts
- **Cause**: Unsubscribe called more times than subscribe
- **Fix**: Let `loadChart` handle all unsubscribes, don't manually unsubscribe
- **See**: Check for proper cleanup in event handlers

### Duplicate API calls
- **Cause**: Multiple event handlers firing for same event
- **Fix**: Use an `isLoading` flag to prevent duplicate calls
- **Pattern**: Guard your async functions with a loading flag

### WebSocket disconnecting
- **Cause**: Too many rapid subscribe/unsubscribe calls
- **Fix**: Add delay between unsubscribe and subscribe operations
- **Pattern**: `await new Promise(resolve => setTimeout(resolve, 50))`

## Learn More

- [OakView Usage Guide](../../.tmp/USAGE_GUIDE.md)
- [OakView Data Provider Base Class](../../src/data-providers/base.js)
- [CSV Provider Example](../csv-example/) - Simpler example without real-time data
