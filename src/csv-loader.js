/**
 * Parse CSV data into chart-compatible format
 * @param {string} csvText - Raw CSV text
 * @returns {Array} Array of {time, open, high, low, close, volume}
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');

    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index].trim();
    });

    // Convert to chart format
    const item = {
      time: row.time || row.date,
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close)
    };

    // Optional volume
    if (row.volume !== undefined && row.volume !== 'NaN' && row.volume !== '') {
      item.volume = parseFloat(row.volume);
    }

    // Skip invalid data
    if (isNaN(item.open) || isNaN(item.high) || isNaN(item.low) || isNaN(item.close)) {
      continue;
    }

    data.push(item);
  }

  return data;
}

/**
 * Load CSV from a URL
 * @param {string} url - URL to CSV file
 * @returns {Promise<Array>} Promise resolving to parsed data
 */
export async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  return parseCSV(text);
}

/**
 * Convert candlestick data to volume histogram data
 * @param {Array} candlestickData - Array with volume field
 * @returns {Array} Array of {time, value, color}
 */
export function extractVolumeData(candlestickData) {
  return candlestickData
    .filter(item => item.volume !== undefined)
    .map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close >= item.open
        ? 'rgba(38, 166, 154, 0.5)'
        : 'rgba(239, 83, 80, 0.5)'
    }));
}
