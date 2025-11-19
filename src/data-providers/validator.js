/**
 * OakView Data Provider Validation Utility
 * 
 * Validates that a data provider correctly implements the OakViewDataProvider interface.
 * Use this during development to catch integration issues before runtime.
 * 
 * @example
 * import { validateProvider } from 'oakview/dist/provider-validator.js';
 * 
 * const provider = new MyDataProvider();
 * const result = await validateProvider(provider, { debug: true });
 * 
 * if (!result.valid) {
 *   console.error('Provider validation failed:', result.errors);
 * }
 */

/**
 * Validate a data provider implementation
 * 
 * @param {Object} provider - The provider instance to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.debug - Enable debug logging
 * @param {boolean} options.testRealtime - Test subscribe/unsubscribe (default: false)
 * @param {string} options.testSymbol - Symbol to use for testing (default: 'TEST')
 * @param {string} options.testInterval - Interval to use for testing (default: '1D')
 * @returns {Promise<ValidationResult>} Validation result
 */
export async function validateProvider(provider, options = {}) {
  const {
    debug = false,
    testRealtime = false,
    testSymbol = 'TEST',
    testInterval = '1D'
  } = options;

  const errors = [];
  const warnings = [];
  const log = debug ? console.log : () => {};

  log('🔍 OakView Data Provider Validation');
  log('=====================================\n');

  // Check that provider is an object
  if (!provider || typeof provider !== 'object') {
    errors.push({
      method: 'provider',
      message: 'Provider must be an object',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  // 1. Check initialize() - REQUIRED
  log('Checking initialize()...');
  if (typeof provider.initialize !== 'function') {
    errors.push({
      method: 'initialize',
      message: 'REQUIRED method initialize() is not implemented',
      severity: 'error'
    });
  } else {
    try {
      const initPromise = provider.initialize({});
      if (!(initPromise instanceof Promise)) {
        errors.push({
          method: 'initialize',
          message: 'initialize() must return a Promise',
          severity: 'error'
        });
      } else {
        await initPromise;
        log('  ✓ initialize() implemented correctly');
      }
    } catch (error) {
      warnings.push({
        method: 'initialize',
        message: `initialize() threw error during test: ${error.message}`,
        severity: 'warning'
      });
    }
  }

  // 2. Check fetchHistorical() - REQUIRED
  log('\nChecking fetchHistorical()...');
  if (typeof provider.fetchHistorical !== 'function') {
    errors.push({
      method: 'fetchHistorical',
      message: 'REQUIRED method fetchHistorical() is not implemented',
      severity: 'error'
    });
  } else {
    try {
      const result = await provider.fetchHistorical(testSymbol, testInterval);
      
      if (!Array.isArray(result)) {
        errors.push({
          method: 'fetchHistorical',
          message: `fetchHistorical() must return an array, got ${typeof result}`,
          severity: 'error'
        });
      } else if (result.length > 0) {
        // Validate first bar
        const bar = result[0];
        
        // Check time
        if (bar.time === undefined) {
          errors.push({
            method: 'fetchHistorical',
            message: 'Bar missing required field: time',
            severity: 'error'
          });
        } else if (typeof bar.time === 'number') {
          // Check if milliseconds instead of seconds
          if (bar.time > 10000000000) {
            errors.push({
              method: 'fetchHistorical',
              message: `Time appears to be in milliseconds (${bar.time}). Must be Unix seconds. Convert with: Math.floor(timestamp / 1000)`,
              severity: 'error'
            });
          }
        } else if (typeof bar.time === 'object') {
          // BusinessDay format
          if (!bar.time.year || !bar.time.month || !bar.time.day) {
            errors.push({
              method: 'fetchHistorical',
              message: 'BusinessDay time object must have year, month, day properties',
              severity: 'error'
            });
          }
        } else {
          errors.push({
            method: 'fetchHistorical',
            message: `Time must be Unix timestamp (number) or BusinessDay object, got ${typeof bar.time}`,
            severity: 'error'
          });
        }
        
        // Check OHLC
        ['open', 'high', 'low', 'close'].forEach(field => {
          if (bar[field] === undefined) {
            errors.push({
              method: 'fetchHistorical',
              message: `Bar missing required field: ${field}`,
              severity: 'error'
            });
          } else if (typeof bar[field] !== 'number') {
            errors.push({
              method: 'fetchHistorical',
              message: `Bar.${field} must be a number, got ${typeof bar[field]} (value: "${bar[field]}")`,
              severity: 'error'
            });
          }
        });
        
        // Check sort order
        if (result.length > 1) {
          const firstTime = typeof result[0].time === 'number' ? result[0].time : 0;
          const secondTime = typeof result[1].time === 'number' ? result[1].time : 0;
          
          if (firstTime > secondTime) {
            errors.push({
              method: 'fetchHistorical',
              message: 'Data must be sorted in ASCENDING order (oldest first). Use .sort((a, b) => a.time - b.time)',
              severity: 'error'
            });
          }
        }
        
        // Check for duplicates
        const times = result.map(b => b.time);
        const uniqueTimes = new Set(times.map(t => typeof t === 'number' ? t : `${t.year}-${t.month}-${t.day}`));
        if (times.length !== uniqueTimes.size) {
          warnings.push({
            method: 'fetchHistorical',
            message: `Found ${times.length - uniqueTimes.size} duplicate timestamps. Deduplicate before returning.`,
            severity: 'warning'
          });
        }
        
        if (errors.filter(e => e.method === 'fetchHistorical').length === 0) {
          log(`  ✓ fetchHistorical() returned ${result.length} valid bars`);
        }
      } else {
        warnings.push({
          method: 'fetchHistorical',
          message: 'fetchHistorical() returned empty array (may be normal for test symbol)',
          severity: 'warning'
        });
      }
    } catch (error) {
      errors.push({
        method: 'fetchHistorical',
        message: `fetchHistorical() threw error: ${error.message}`,
        severity: 'error'
      });
    }
  }

  // 3. Check subscribe() - OPTIONAL
  log('\nChecking subscribe()...');
  if (typeof provider.subscribe === 'function') {
    if (testRealtime) {
      try {
        let callbackCalled = false;
        const unsubscribe = provider.subscribe(testSymbol, testInterval, (bar) => {
          callbackCalled = true;
          
          // Validate bar format
          if (typeof bar.time !== 'number' && typeof bar.time !== 'object') {
            warnings.push({
              method: 'subscribe',
              message: `Callback received invalid bar.time type: ${typeof bar.time}`,
              severity: 'warning'
            });
          }
        });
        
        if (typeof unsubscribe !== 'function') {
          warnings.push({
            method: 'subscribe',
            message: 'subscribe() should return an unsubscribe function',
            severity: 'warning'
          });
        } else {
          // Test unsubscribe
          unsubscribe();
          log('  ✓ subscribe() and unsubscribe work correctly');
        }
      } catch (error) {
        warnings.push({
          method: 'subscribe',
          message: `subscribe() threw error: ${error.message}`,
          severity: 'warning'
        });
      }
    } else {
      log('  ℹ subscribe() implemented (use testRealtime: true to test)');
    }
  } else {
    log('  ℹ subscribe() not implemented (optional - real-time updates disabled)');
  }

  // 4. Check searchSymbols() - OPTIONAL
  log('\nChecking searchSymbols()...');
  if (typeof provider.searchSymbols === 'function') {
    try {
      const results = await provider.searchSymbols('TEST');
      
      if (!Array.isArray(results)) {
        warnings.push({
          method: 'searchSymbols',
          message: `searchSymbols() must return an array, got ${typeof results}`,
          severity: 'warning'
        });
      } else if (results.length > 0) {
        const item = results[0];
        
        if (!item.symbol) {
          warnings.push({
            method: 'searchSymbols',
            message: 'SymbolInfo missing required field: symbol',
            severity: 'warning'
          });
        }
        
        if (!item.name) {
          warnings.push({
            method: 'searchSymbols',
            message: 'SymbolInfo missing required field: name',
            severity: 'warning'
          });
        }
        
        if (warnings.filter(w => w.method === 'searchSymbols').length === 0) {
          log(`  ✓ searchSymbols() returned ${results.length} valid results`);
        }
      } else {
        log('  ✓ searchSymbols() implemented (returned empty results for "TEST")');
      }
    } catch (error) {
      warnings.push({
        method: 'searchSymbols',
        message: `searchSymbols() threw error: ${error.message}`,
        severity: 'warning'
      });
    }
  } else {
    log('  ℹ searchSymbols() not implemented (optional - symbol search disabled)');
  }

  // 5. Check getAvailableIntervals() - OPTIONAL
  log('\nChecking getAvailableIntervals()...');
  if (typeof provider.getAvailableIntervals === 'function') {
    try {
      const intervals = provider.getAvailableIntervals(testSymbol);
      
      if (intervals !== null && !Array.isArray(intervals)) {
        warnings.push({
          method: 'getAvailableIntervals',
          message: `getAvailableIntervals() must return an array or null, got ${typeof intervals}`,
          severity: 'warning'
        });
      } else if (Array.isArray(intervals) && intervals.length > 0) {
        log(`  ✓ getAvailableIntervals() returned ${intervals.length} intervals: ${intervals.join(', ')}`);
      } else if (intervals === null) {
        log('  ✓ getAvailableIntervals() returned null (all intervals available)');
      } else {
        warnings.push({
          method: 'getAvailableIntervals',
          message: 'getAvailableIntervals() returned empty array (no intervals available?)',
          severity: 'warning'
        });
      }
    } catch (error) {
      warnings.push({
        method: 'getAvailableIntervals',
        message: `getAvailableIntervals() threw error: ${error.message}`,
        severity: 'warning'
      });
    }
  } else {
    log('  ℹ getAvailableIntervals() not implemented (optional - all intervals shown)');
  }

  // 6. Check getBaseInterval() - OPTIONAL
  log('\nChecking getBaseInterval()...');
  if (typeof provider.getBaseInterval === 'function') {
    try {
      const baseInterval = provider.getBaseInterval(testSymbol);
      
      if (baseInterval !== null && typeof baseInterval !== 'string') {
        warnings.push({
          method: 'getBaseInterval',
          message: `getBaseInterval() must return a string or null, got ${typeof baseInterval}`,
          severity: 'warning'
        });
      } else {
        log(`  ✓ getBaseInterval() returned: ${baseInterval || 'null'}`);
      }
    } catch (error) {
      warnings.push({
        method: 'getBaseInterval',
        message: `getBaseInterval() threw error: ${error.message}`,
        severity: 'warning'
      });
    }
  } else {
    log('  ℹ getBaseInterval() not implemented (optional)');
  }

  // 7. Check hasData() - OPTIONAL
  log('\nChecking hasData()...');
  if (typeof provider.hasData === 'function') {
    try {
      const result = provider.hasData(testSymbol, testInterval);
      
      if (typeof result !== 'boolean') {
        warnings.push({
          method: 'hasData',
          message: `hasData() must return a boolean, got ${typeof result}`,
          severity: 'warning'
        });
      } else {
        log(`  ✓ hasData() returned: ${result}`);
      }
    } catch (error) {
      warnings.push({
        method: 'hasData',
        message: `hasData() threw error: ${error.message}`,
        severity: 'warning'
      });
    }
  } else {
    log('  ℹ hasData() not implemented (optional - all intervals assumed available)');
  }

  // 8. Check disconnect() - OPTIONAL
  log('\nChecking disconnect()...');
  if (typeof provider.disconnect === 'function') {
    log('  ✓ disconnect() implemented');
  } else {
    log('  ℹ disconnect() not implemented (optional - no cleanup performed)');
  }

  // Summary
  log('\n=====================================');
  log('Validation Summary:');
  log(`  Errors: ${errors.length}`);
  log(`  Warnings: ${warnings.length}`);
  
  if (errors.length > 0) {
    log('\n❌ Validation FAILED\n');
    errors.forEach(e => {
      log(`  [ERROR] ${e.method}: ${e.message}`);
    });
  } else {
    log('\n✅ Validation PASSED\n');
  }
  
  if (warnings.length > 0) {
    log('Warnings:');
    warnings.forEach(w => {
      log(`  [WARN] ${w.method}: ${w.message}`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Quick validation helper that throws on error
 * 
 * @example
 * import { assertProviderValid } from 'oakview/dist/provider-validator.js';
 * 
 * const provider = new MyProvider();
 * await assertProviderValid(provider); // Throws if invalid
 */
export async function assertProviderValid(provider, options = {}) {
  const result = await validateProvider(provider, options);
  
  if (!result.valid) {
    const errorMessages = result.errors.map(e => `${e.method}: ${e.message}`).join('\n');
    throw new Error(`Provider validation failed:\n${errorMessages}`);
  }
  
  return result;
}

export default {
  validateProvider,
  assertProviderValid
};
