# OakView CSV Example - Enhanced

A comprehensive example demonstrating how to use OakView with CSV data files, featuring advanced capabilities like symbol search, interval detection, and data resampling.

## Features

✅ **Header-less Interface** - Clean, minimal UI without top navigation
✅ **Symbol Search** - Search symbols from available CSV files
✅ **Automatic Interval Detection** - Detects available timeframes for each symbol
✅ **Smart Data Resampling** - Automatically resamples to higher timeframes
✅ **File Caching** - Caches loaded CSV files for better performance
✅ **Info Panel** - Shows data details and available intervals (press 'I' to toggle)

## Quick Start

```bash
cd examples/csv-example
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## File Structure

```
csv-example/
├── index.html              # Demo page (no header)
├── providers/
│   └── csv-provider.js     # Enhanced CSV data provider
├── data/
│   └── SPX_1D.csv         # Sample S&P 500 daily data
├── package.json
└── README.md
```

## Adding CSV Files

### File Naming Convention

Files must follow this pattern: `{SYMBOL}_{INTERVAL}.csv`

**Examples:**
- `SPX_1D.csv` - S&P 500 daily data
- `AAPL_1H.csv` - Apple hourly data
- `GOOGL_15.csv` - Google 15-minute data

### Supported Intervals

| Interval | Description | Minutes |
|----------|-------------|---------|
| `1` | 1 minute | 1 |
| `5` | 5 minutes | 5 |
| `15` | 15 minutes | 15 |
| `30` | 30 minutes | 30 |
| `1H` | 1 hour | 60 |
| `4H` | 4 hours | 240 |
| `1D` | 1 day | 1440 |
| `1W` | 1 week | 10080 |
| `1M` | 1 month | ~43800 |

### CSV Format

All CSV files must have a header row:

```csv
time,open,high,low,close,volume
2024-01-01,100.5,101.2,99.8,100.0,1000000
2024-01-02,100.0,102.5,99.5,101.8,1200000
```

**Required columns:**
- `time` (or `date`, `timestamp`, `datetime`)
- `open` (or `o`)
- `high` (or `h`)
- `low` (or `l`)
- `close` (or `c`)

**Optional columns:**
- `volume` (or `vol`, `v`)

### Step-by-Step: Adding a New CSV File

1. **Create your CSV file** following the format above
2. **Name it correctly**: `{SYMBOL}_{INTERVAL}.csv`
3. **Place it in the `data/` folder**
4. **Register it in `index.html`**:

```javascript
const AVAILABLE_CSV_FILES = [
  'SPX_1D.csv',
  'AAPL_1H.csv',    // ← Add your file here
  'GOOGL_1D.csv',   // ← Add your file here
];
```

That's it! The provider will automatically detect the symbol and interval.

## Features Explained

### 1. Symbol Search

The provider can search through available CSV files:

```javascript
// Search all symbols
const allSymbols = await provider.searchSymbols('');

// Search for specific symbol
const results = await provider.searchSymbols('AAPL');
```

**Returns:**
```javascript
[
  {
    symbol: 'AAPL',
    description: 'AAPL (1H, 1D)',
    intervals: ['1H', '1D'],
    primaryExchange: 'CSV',
    secType: 'historical'
  }
]
```

**To test in browser:** Press 'T' to run symbol search test

### 2. Interval Detection

The provider automatically detects which intervals are available for each symbol:

```javascript
// Get available intervals for a symbol
const intervals = provider.getAvailableIntervals('SPX');
// Returns: ['1D']

// Check if specific interval exists
const hasData = provider.hasData('AAPL', '1H');
// Returns: true or false

// Get base (smallest) interval
const baseInterval = provider.getBaseInterval('AAPL');
// Returns: '1H' (if that's the smallest available)
```

**UI Indication:**
- Available intervals shown with normal style
- Unavailable intervals shown grayed out and crossed
- Base interval marked with ⭐

### 3. Data Resampling

If you request a higher timeframe than available, the provider automatically resamples:

**Example:**
- You have `AAPL_1H.csv` (hourly data)
- You request `1D` (daily) interval
- Provider automatically resamples hourly → daily

**Resampling Algorithm:**
```javascript
// For each target bar:
- open: first bar's open
- high: maximum of all bar highs
- low: minimum of all bar lows
- close: last bar's close
- volume: sum of all bar volumes
```

**Limitations:**
- Can only resample to HIGHER timeframes (e.g., 1H → 1D ✅)
- Cannot resample to LOWER timeframes (e.g., 1D → 1H ❌)

**Console Output:**
```
Resampling AAPL from 1H to 1D
Resampled 168 bars to 7 bars
```

### 4. File Caching

Loaded CSV files are cached in memory to avoid redundant fetches:

```javascript
// First load: fetches from server
await provider.fetchHistorical('SPX', '1D');

// Second load: uses cache
await provider.fetchHistorical('SPX', '1D');
// Console: "Using cached data for: SPX_1D"
```

Cache is cleared on disconnect:
```javascript
provider.disconnect(); // Clears all cached data
```

### 5. Info Panel

Press **'I'** to toggle the info panel which shows:

- **Symbol**: Current symbol
- **Base Interval**: Smallest available interval for this symbol
- **Current Interval**: Currently displayed interval
- **Bars Loaded**: Number of bars/candles
- **Resampled**: Whether data was resampled
- **Available Intervals**: Visual indicator of all intervals (⭐ = base)

## API Reference

### CSVDataProvider

#### Constructor

```javascript
const provider = new CSVDataProvider({
  baseUrl: './data/',                    // Base path for CSV files
  availableFiles: ['SPX_1D.csv', ...]   // List of available files
});
```

#### Methods

##### initialize(config)
Initialize the provider and build file inventory.

```javascript
await provider.initialize();
```

##### setAvailableFiles(files)
Update the list of available CSV files.

```javascript
provider.setAvailableFiles(['SPX_1D.csv', 'AAPL_1H.csv']);
```

##### searchSymbols(query)
Search for symbols from available files.

```javascript
const results = await provider.searchSymbols('AAPL');
```

##### getAvailableIntervals(symbol)
Get available intervals for a symbol.

```javascript
const intervals = provider.getAvailableIntervals('SPX');
// Returns: ['1D']
```

##### hasData(symbol, interval)
Check if symbol/interval combination exists.

```javascript
const exists = provider.hasData('AAPL', '1H');
// Returns: true/false
```

##### getBaseInterval(symbol)
Get the smallest available interval for a symbol.

```javascript
const base = provider.getBaseInterval('AAPL');
// Returns: '1H'
```

##### fetchHistorical(symbol, interval, from, to)
Fetch historical data with auto-resampling.

```javascript
const data = await provider.fetchHistorical('SPX', '1W');
// Automatically resamples from 1D to 1W
```

##### disconnect()
Clear cache and cleanup.

```javascript
provider.disconnect();
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **I** | Toggle info panel |
| **T** | Test symbol search (console) |

## Example: Complete Integration

```javascript
import CSVDataProvider from './providers/csv-provider.js';

// 1. Create provider
const provider = new CSVDataProvider({
  baseUrl: './data/',
  availableFiles: [
    'SPX_1D.csv',
    'AAPL_1H.csv',
    'GOOGL_1D.csv'
  ]
});

// 2. Initialize
await provider.initialize();

// 3. Search symbols
const symbols = await provider.searchSymbols('');
console.log('Available symbols:', symbols);

// 4. Check available intervals
const spxIntervals = provider.getAvailableIntervals('SPX');
console.log('SPX intervals:', spxIntervals); // ['1D']

// 5. Load data (with auto-resampling)
const weeklyData = await provider.fetchHistorical('SPX', '1W');
// Automatically resamples 1D → 1W

// 6. Set provider on chart
chart.setDataProvider(provider);

// 7. Listen for symbol changes
chart.addEventListener('symbol-change', async (e) => {
  const { symbol } = e.detail;
  const data = await provider.fetchHistorical(symbol, '1D');
  chart.setData(data);
});
```

## Common Use Cases

### Use Case 1: Display Only Available Intervals

```javascript
function updateIntervalSelector(symbol) {
  const available = provider.getAvailableIntervals(symbol);
  const baseInterval = provider.getBaseInterval(symbol);

  // Show which intervals can be displayed
  const canDisplay = [...available];

  // Add higher timeframes (resampling possible)
  if (baseInterval === '1H') {
    canDisplay.push('4H', '1D', '1W');
  } else if (baseInterval === '1D') {
    canDisplay.push('1W', '1M');
  }

  // Update UI to show only these intervals
  updateUIIntervals(canDisplay);
}
```

### Use Case 2: Prevent Invalid Requests

```javascript
async function loadData(symbol, interval) {
  const baseInterval = provider.getBaseInterval(symbol);

  if (!baseInterval) {
    alert(`No data available for ${symbol}`);
    return;
  }

  // Check if we can resample to this interval
  const baseMinutes = parseIntervalToMinutes(baseInterval);
  const requestMinutes = parseIntervalToMinutes(interval);

  if (requestMinutes < baseMinutes) {
    alert(`Cannot display ${interval} - only ${baseInterval} and higher available`);
    return;
  }

  // Proceed with load
  const data = await provider.fetchHistorical(symbol, interval);
  chart.setData(data);
}
```

### Use Case 3: Show Resampling Status

```javascript
async function loadWithStatus(symbol, interval) {
  const isResampled = !provider.hasData(symbol, interval);
  const baseInterval = provider.getBaseInterval(symbol);

  if (isResampled) {
    showNotification(`Resampling from ${baseInterval} to ${interval}`);
  }

  const data = await provider.fetchHistorical(symbol, interval);
  chart.setData(data);

  if (isResampled) {
    showNotification(`Displayed ${data.length} resampled bars`);
  }
}
```

## Troubleshooting

### Issue: "No data available for symbol"

**Cause:** Symbol not in available files list

**Solution:**
1. Check file exists in `data/` folder
2. Verify filename format: `{SYMBOL}_{INTERVAL}.csv`
3. Add to `AVAILABLE_CSV_FILES` array in `index.html`

### Issue: Resampling produces wrong data

**Cause:** Incorrect interval format or parsing

**Solution:**
- Use standard interval formats: `1`, `5`, `15`, `30`, `1H`, `4H`, `1D`, `1W`, `1M`
- Check console for resampling logs
- Verify base interval is correct

### Issue: Chart shows no data

**Cause:** CSV parsing error or invalid format

**Solution:**
1. Check browser console for errors
2. Verify CSV has header row
3. Ensure required columns exist (time, open, high, low, close)
4. Check time format is valid

## Performance Tips

1. **Use appropriate base intervals**: Smaller intervals = more data = slower
2. **Leverage caching**: Don't call `disconnect()` unless necessary
3. **Limit file count**: Too many files = slower initialization
4. **Use resampling**: Better than storing multiple files for same symbol

## What's Next?

- Add more CSV files to explore different symbols
- Integrate with the symbol search UI in OakView
- Build a file upload feature for custom CSV files
- Create a manifest.json for automatic file discovery
- Add data export functionality

## Related Examples

- [WebSocket Example](../websocket-example/) - Real-time data streaming
- [VoltTrading Integration](../websocket-example/) - Live market data

## License

MIT License - See [LICENSE](../../LICENSE) for details
