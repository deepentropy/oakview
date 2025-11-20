/**
 * BarResampler - Aggregates OHLCV bars from finer to coarser intervals
 * 
 * Example: 1-second bars → 10-second bars, ticks → 1-minute bars
 * 
 * @example
 * const resampler = new BarResampler('1S', '10S');
 * 
 * // Feed source bars
 * const bar1 = resampler.addBar({ time: 0, open: 100, high: 101, low: 99, close: 100.5, volume: 1000 });
 * // Returns null (bar not complete)
 * 
 * const bar10 = resampler.addBar({ time: 9, ... });
 * // Returns completed 10-second bar aggregated from 10 1-second bars
 */
class BarResampler {
  /**
   * @param {string} sourceInterval - Source interval (e.g., '1S', '1', '1D')
   * @param {string} targetInterval - Target interval (must be >= source)
   */
  constructor(sourceInterval, targetInterval) {
    this.sourceInterval = sourceInterval;
    this.targetInterval = targetInterval;
    this.targetMs = this.parseIntervalToMs(targetInterval);
    this.currentBar = null;
  }
  
  /**
   * Add a source bar and potentially get a completed target bar
   * 
   * @param {Object} sourceBar - OHLCV bar from data provider
   * @param {number} sourceBar.time - Unix timestamp in seconds
   * @param {number} sourceBar.open - Opening price
   * @param {number} sourceBar.high - High price
   * @param {number} sourceBar.low - Low price
   * @param {number} sourceBar.close - Closing price
   * @param {number} sourceBar.volume - Volume
   * @returns {Object|null} Completed target bar or null if not ready
   */
  addBar(sourceBar) {
    const targetTime = this.getTargetBarTime(sourceBar.time);
    
    // Starting a new target bar?
    if (!this.currentBar || this.currentBar.time !== targetTime) {
      const completedBar = this.currentBar;
      
      // Initialize new bar
      this.currentBar = {
        time: targetTime,
        open: sourceBar.open,
        high: sourceBar.high,
        low: sourceBar.low,
        close: sourceBar.close,
        volume: sourceBar.volume
      };
      
      return completedBar; // Return previous bar (may be null on first call)
    }
    
    // Update existing bar
    this.currentBar.high = Math.max(this.currentBar.high, sourceBar.high);
    this.currentBar.low = Math.min(this.currentBar.low, sourceBar.low);
    this.currentBar.close = sourceBar.close;
    this.currentBar.volume += sourceBar.volume;
    
    return null; // Bar not complete yet
  }
  
  /**
   * Calculate target bar time bucket
   * Aligns time to interval boundaries (e.g., 10:30:05 → 10:30:00 for 10S)
   * 
   * @param {number} sourceTime - Unix timestamp in seconds
   * @returns {number} Aligned timestamp in seconds
   */
  getTargetBarTime(sourceTime) {
    const timeMs = sourceTime * 1000;
    return Math.floor(timeMs / this.targetMs) * this.targetMs / 1000;
  }
  
  /**
   * Parse interval string to milliseconds
   * 
   * Supported formats:
   * - Ticks: 1T, 10T, 100T, 1000T (not time-based, treated as count)
   * - Seconds: 1S, 5S, 10S, 15S, 30S, 45S
   * - Minutes: 1, 5, 15, 30, 45 (plain numbers)
   * - Hours: 1H, 2H, 4H, 12H
   * - Days: 1D, 2D
   * - Weeks: 1W
   * - Months: 1M, 3M, 6M, 12M
   * 
   * @param {string} interval - Interval string
   * @returns {number} Milliseconds
   * @throws {Error} If interval format is invalid
   */
  parseIntervalToMs(interval) {
    // Handle tick intervals (special case - not time-based)
    if (interval.endsWith('T')) {
      const tickCount = parseInt(interval);
      if (isNaN(tickCount)) throw new Error(`Invalid tick interval: ${interval}`);
      // Treat ticks as milliseconds for bucketing purposes
      return tickCount;
    }
    
    // Handle second intervals explicitly
    if (interval.endsWith('S')) {
      const seconds = parseInt(interval);
      if (isNaN(seconds)) throw new Error(`Invalid second interval: ${interval}`);
      return seconds * 1000;
    }
    
    // Handle other intervals
    const match = interval.match(/^(\d+)([mHDWMY]?)$/);
    if (!match) throw new Error(`Invalid interval format: ${interval}`);
    
    const [, num, unit] = match;
    const value = parseInt(num);
    
    switch(unit) {
      case '': // Plain number = minutes
      case 'm':
        return value * 60 * 1000;
      case 'H':
        return value * 60 * 60 * 1000;
      case 'D':
        return value * 24 * 60 * 60 * 1000;
      case 'W':
        return value * 7 * 24 * 60 * 60 * 1000;
      case 'M':
        return value * 30 * 24 * 60 * 60 * 1000; // Approximate
      case 'Y':
        return value * 365 * 24 * 60 * 60 * 1000; // Approximate
      default:
        throw new Error(`Unknown interval unit: ${unit}`);
    }
  }
  
  /**
   * Get current incomplete bar (useful for displaying partial updates)
   * 
   * @returns {Object|null} Current bar being built, or null
   */
  getCurrentBar() {
    return this.currentBar;
  }
  
  /**
   * Force flush current bar (e.g., on unsubscribe or end of data)
   * Useful for getting the last incomplete bar
   * 
   * @returns {Object|null} Flushed bar, or null if no bar exists
   */
  flush() {
    const bar = this.currentBar;
    this.currentBar = null;
    return bar;
  }
  
  /**
   * Reset resampler state
   * Clears current bar without returning it
   */
  reset() {
    this.currentBar = null;
  }
}

export default BarResampler;
