# Browser Test Instructions

## ⚠️ Issue Identified

The browser console shows CSV example errors, which means you're viewing the **wrong page**.
The root `index.html` (CSV example) is loading instead of the VoltTrading test pages.

## 🔧 Solution: Clear Navigation Steps

### Step 1: Clear Browser Cache
1. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) to hard refresh
2. Or close ALL tabs for `localhost:5173`
3. Clear browser cache if needed

### Step 2: Navigate to Test Index
Open a **NEW** browser tab and type this EXACT URL:

```
http://localhost:5173/examples/volttrading-integration/test-index.html
```

**Expected Result:** You should see a dark-themed page with:
- Title: "🔌 VoltTrading Integration Test Suite"
- Green checkmark: "✅ You are on the TEST INDEX page"
- Blue buttons for test pages

**Console should show:**
```
✅ VoltTrading Integration Test Index - Page loaded correctly
```

### Step 3: Navigate to Real Backend Test
From the test index page, click the blue button:
**"📊 Real Backend Integration Test"**

OR directly navigate to:
```
http://localhost:5173/examples/volttrading-integration/real-backend.html
```

**Expected Result:**
- Dark-themed trading interface
- Title: "🔌 OakView + Real VoltTrading Backend Test"
- Subtitle: "Testing with live VoltTrading backend at localhost:8000"
- Controls: Symbol input, Interval dropdown, buttons

**Console should show:**
```
[WebSocket] Connecting to ws://localhost:8000/ws...
Ready! Make sure VoltTrading backend is running, then click "Connect WebSocket"
```

**Console should NOT show:**
- ❌ "Initializing CSV example..."
- ❌ "CSV provider initialized"
- ❌ "Loading QQQ @ 60..."

### Step 4: Run Test
1. Click **"Connect WebSocket"** button
2. Wait for status to turn **green** "Connected to VoltTrading"
3. Click **"Load Chart"** button
4. Chart should display with AAPL candlesticks

## 🐛 If You Still See CSV Errors

The browser is still on the wrong page. Try:

1. **Check the browser address bar** - Confirm the URL is exactly:
   ```
   http://localhost:5173/examples/volttrading-integration/real-backend.html
   ```

2. **Don't use autocomplete** - Type the full URL manually

3. **Check browser tabs** - Make sure you don't have multiple localhost:5173 tabs open

4. **Restart browser** - Close browser completely and reopen

5. **Check page title** - Browser tab should say:
   - ✅ "OakView + Real VoltTrading Backend Test" (correct page)
   - ❌ "OakView Chart Demo" (wrong page - CSV example)

## 📊 Alternative: Automated Test Page

For a simpler test without UI, navigate to:
```
http://localhost:5173/.tmp/test_provider_integration.html
```

**Expected Result:**
- Simple monospace text output
- Title: "VoltTradingProvider Automated Test"
- Console shows provider tests running

## ✅ Correct Console Output Reference

When on **real-backend.html**, console should show:

```
[vite] connected.
[WebSocket] Connecting to ws://localhost:8000/ws...
Ready! Make sure VoltTrading backend is running, then click "Connect WebSocket"
```

After clicking "Connect WebSocket":
```
[WebSocket] Connected
[VoltTradingProvider] Initializing...
[VoltTradingProvider] Initialized successfully
Provider initialized successfully ✓
```

After clicking "Load Chart":
```
Loading chart: AAPL @ 1m
Fetching historical data...
[API] GET /api/market-data/AAPL/history?timeframe=1&duration=1%20D
Received 241 historical bars ✓
Chart updated ✓
Subscribing to real-time updates...
Subscribed ✓
```

## 🎯 URLs Summary

| Page | URL | Purpose |
|------|-----|---------|
| Test Index | `http://localhost:5173/examples/volttrading-integration/test-index.html` | Navigation hub |
| Real Backend | `http://localhost:5173/examples/volttrading-integration/real-backend.html` | Main test page |
| Mock Backend | `http://localhost:5173/examples/volttrading-integration/index.html` | Standalone test |
| Automated Test | `http://localhost:5173/.tmp/test_provider_integration.html` | Automated checks |

## ❌ DO NOT Navigate To

- `http://localhost:5173/` - This loads CSV example (wrong)
- `http://localhost:5173/index.html` - This loads CSV example (wrong)

---

**Status:** Ready for browser testing
**Backend:** Running on localhost:8000 ✅
**Dev Server:** Running on localhost:5173 ✅
