# OakView CSV Example

This example demonstrates how to integrate OakView with CSV data files in your project.

## Features

- Load historical OHLCV data from CSV files
- Simple static data visualization
- Perfect for demos, backtesting, and prototyping
- No server or API required

## Prerequisites

- Node.js and npm installed
- Basic knowledge of HTML and JavaScript

## Project Structure

```
csv-example/
├── index.html          # Main HTML file
├── data/
│   └── AAPL_1D.csv    # Sample CSV data file
├── package.json        # Project dependencies
└── README.md          # This file
```

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser to the URL shown (typically http://localhost:5173)

## CSV Data Format

Your CSV files should follow this format:

```csv
time,open,high,low,close,volume
2024-01-01,150.00,152.50,149.50,151.00,1000000
2024-01-02,151.00,153.00,150.50,152.50,1200000
2024-01-03,152.50,154.00,151.00,153.50,1100000
```

### Supported Column Names

The CSV provider supports various column name variations:

- **Time**: `time`, `date`, `timestamp`, `datetime`
- **Open**: `open`, `o`
- **High**: `high`, `h`
- **Low**: `low`, `l`
- **Close**: `close`, `c`
- **Volume**: `volume`, `vol`, `v` (optional)

### File Naming Conventions

The provider supports flexible file naming:

1. **Fixed filename**: `data.csv` (specify in config)
2. **Symbol-based**: `{SYMBOL}.csv` (e.g., `AAPL.csv`)
3. **Symbol + Interval**: `{SYMBOL}_{INTERVAL}.csv` (e.g., `AAPL_1D.csv`)

## Integration Guide

### Step 1: Import OakView and CSV Provider

```javascript
import '../../src/oakview-chart-layout.js';
import CSVDataProvider from './providers/csv-provider.js';
```

Note: The CSV provider in this example is a reference implementation. You can copy it to your own project and customize it as needed.

### Step 2: Create the Provider Instance

```javascript
const provider = new CSVDataProvider({
  baseUrl: './data/',
  // Optional: specify a fixed filename
  // filename: 'my-data.csv'
  // Optional: custom file pattern
  // filePattern: (symbol, interval) => `${symbol}_${interval}.csv`
});
```

### Step 3: Add the Chart Component

```html
<oakview-chart-layout
  id="chart"
  symbol="AAPL"
  interval="1D"
  theme="dark">
</oakview-chart-layout>
```

### Step 4: Connect the Provider

```javascript
const chart = document.getElementById('chart');
chart.setDataProvider(provider);
```

## Configuration Options

### CSVDataProvider Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | `''` | Base URL or path for CSV files |
| `filename` | string | `undefined` | Static filename (overrides pattern) |
| `filePattern` | function | `(symbol, interval) => ...` | Custom naming function |

## Time Format Support

The CSV provider accepts various time formats:

- **ISO 8601**: `2024-01-01T00:00:00Z`
- **Date only**: `2024-01-01`
- **Unix timestamp**: `1704067200` (seconds)
- **Date with time**: `2024-01-01 00:00:00`

## Error Handling

```javascript
try {
  await provider.initialize();
  const data = await provider.fetchHistorical('AAPL', '1D');
  console.log('Loaded', data.length, 'bars');
} catch (error) {
  console.error('Failed to load data:', error);
  // Handle error (show message to user, etc.)
}
```

## Advanced Usage

### Custom File Pattern

```javascript
const provider = new CSVDataProvider({
  baseUrl: './data/',
  filePattern: (symbol, interval) => {
    // Custom logic for file naming
    const exchange = 'NYSE';
    return `${exchange}_${symbol}_${interval}.csv`;
  }
});
```

### Time Range Filtering

```javascript
// Fetch data for specific time range
const fromDate = new Date('2024-01-01').getTime() / 1000;
const toDate = new Date('2024-12-31').getTime() / 1000;

const data = await provider.fetchHistorical('AAPL', '1D', fromDate, toDate);
```

### Multiple Symbols

```javascript
// Switch between different symbols dynamically
const symbols = ['AAPL', 'GOOGL', 'MSFT'];

for (const symbol of symbols) {
  const data = await provider.fetchHistorical(symbol, '1D');
  console.log(`${symbol}: ${data.length} bars`);
}
```

## Limitations

- **Static Data Only**: CSV provider does not support real-time updates
- **Client-Side Loading**: All data is loaded in the browser (consider file size)
- **No Server Required**: Works with any static file server or local file system

## Generating CSV Data

You can generate CSV data from various sources:

### From Python (pandas)

```python
import pandas as pd

# Create sample data
df = pd.DataFrame({
    'time': pd.date_range('2024-01-01', periods=100, freq='D'),
    'open': [100 + i * 0.5 for i in range(100)],
    'high': [102 + i * 0.5 for i in range(100)],
    'low': [98 + i * 0.5 for i in range(100)],
    'close': [101 + i * 0.5 for i in range(100)],
    'volume': [1000000 + i * 10000 for i in range(100)]
})

# Save to CSV
df.to_csv('AAPL_1D.csv', index=False)
```

### From JavaScript

```javascript
const data = [];
const startDate = new Date('2024-01-01');

for (let i = 0; i < 100; i++) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + i);

  data.push({
    time: date.toISOString().split('T')[0],
    open: 100 + i * 0.5,
    high: 102 + i * 0.5,
    low: 98 + i * 0.5,
    close: 101 + i * 0.5,
    volume: 1000000 + i * 10000
  });
}

// Convert to CSV
const csv = [
  'time,open,high,low,close,volume',
  ...data.map(d => `${d.time},${d.open},${d.high},${d.low},${d.close},${d.volume}`)
].join('\n');

console.log(csv);
```

## Troubleshooting

### File Not Found

**Error**: `Failed to load CSV: Not Found`

**Solution**: Check that:
- The file path is correct relative to your HTML file
- The file naming matches the pattern (symbol + interval)
- The web server can access the data directory

### Invalid CSV Format

**Error**: `CSV must have a time/date column`

**Solution**: Ensure your CSV has:
- A header row with column names
- A time/date column (any supported name)
- OHLC columns (open, high, low, close)

### Data Not Displaying

**Solution**: Check browser console for errors and verify:
- CSV data is valid (no NaN values)
- Time values are properly formatted
- Data is sorted by time (ascending)

## Next Steps

- Explore the [WebSocket Example](../websocket-example/) for real-time data
- Check the [API Documentation](../../docs/) for advanced features
- Customize the chart appearance and layout

## Support

For issues or questions:
- GitHub Issues: [OakView Issues](https://github.com/yourrepo/oakview/issues)
- Documentation: [OakView Docs](../../docs/)
