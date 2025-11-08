# TradingView Interface - Complete Design Specification

## 1. Complete Component Inventory

### Top Navigation Bar
**Container:**
- Dimensions: 100% × 44px
- Background: #131722 (dark background)
- Border-bottom: 1px solid #2A2E39

**Menu Button (Hamburger):**
- Dimensions: 40px × 40px
- Icon: svg_icons/initial_0.svg (hamburger menu)
- Color: #D1D4DC
- Padding: 12px
- Hover background: #1E222D

**Search Bar:**
- Dimensions: 200px × 32px
- Background: #1E222D
- Border-radius: 4px
- Placeholder: "AAPL"
- Font: 13px, -apple-system, BlinkMacSystemFont
- Color: #D1D4DC
- Icon: svg_icons/initial_33.svg (search icon)
- Padding: 8px 12px

**Watchlist Button (+):**
- Dimensions: 32px × 32px
- Background: transparent
- Border: 1px solid #2A2E39
- Border-radius: 4px
- Icon: svg_icons/initial_34.svg (plus)
- Color: #787B86
- Hover background: #1E222D

**Drawing Tools Counter:**
- Dimensions: 40px × 32px
- Background: #1E222D
- Border-radius: 4px
- Text: "0"
- Font: 13px, medium weight
- Color: #D1D4DC
- Padding: 8px 12px

**Chart Functions Buttons:**
- **Intervals Button**
  - Dimensions: 90px × 32px
  - Icon: svg_icons/initial_35.svg (bars chart)
  - Background: #1E222D
  - Border-radius: 4px
  - Padding: 8px 10px
  
- **Indicators Button**
  - Dimensions: 100px × 32px
  - Icon: svg_icons/initial_36.svg (function icon)
  - Text: "Indicators"
  - Font: 13px, medium
  - Color: #D1D4DC
  - Background: #1E222D
  - Border-radius: 4px

- **Templates Button**
  - Dimensions: 32px × 32px
  - Icon: svg_icons/initial_37.svg (grid icon)
  - Background: #1E222D
  - Border-radius: 4px

- **Alert Button**
  - Dimensions: 80px × 32px
  - Icon: svg_icons/initial_38.svg (bell icon)
  - Text: "Alert"
  - Background: #1E222D
  - Border-radius: 4px

- **Replay Button**
  - Dimensions: 85px × 32px
  - Icon: svg_icons/initial_39.svg (replay icon)
  - Text: "Replay"
  - Background: #1E222D
  - Border-radius: 4px

**Undo/Redo Buttons:**
- Dimensions: 32px × 32px each
- Icons: svg_icons/initial_40.svg (undo), svg_icons/initial_41.svg (redo)
- Background: transparent
- Color: #787B86
- Margin: 0 4px

**Right Side Controls:**
- **Save Button**
  - Dimensions: 70px × 32px
  - Text: "Save"
  - Background: transparent
  - Color: #D1D4DC
  - Border-radius: 4px
  - Icon: svg_icons/initial_42.svg (chevron down)

- **Screenshot Button**
  - Dimensions: 32px × 32px
  - Icon: svg_icons/initial_43.svg (camera)
  - Background: transparent

- **Settings Button**
  - Dimensions: 32px × 32px
  - Icon: svg_icons/initial_44.svg (gear)
  - Background: transparent

- **Fullscreen Button**
  - Dimensions: 32px × 32px
  - Icon: svg_icons/initial_45.svg (expand)
  - Background: transparent

- **Publish Button**
  - Dimensions: 80px × 32px
  - Background: #2962FF (blue)
  - Color: #FFFFFF
  - Border-radius: 4px
  - Font: 13px, medium weight
  - Padding: 8px 16px
  - Hover background: #1E53E5

### Stock Info Header
**Container:**
- Dimensions: 100% × 70px
- Background: #131722
- Padding: 12px 16px
- Border-bottom: 1px solid #2A2E39

**Company Name:**
- Icon: svg_icons/initial_46.svg (company logo)
- Text: "Apple Inc · 1D · NASDAQ"
- Font: 13px, -apple-system
- Color: #D1D4DC
- Weight: 500

**Price Display:**
- **Current Price**
  - Text: "$269.80"
  - Font: 20px, medium weight
  - Color: #F23645 (red, indicating down)
  
- **Price Change**
  - Text: "$272.29 $266.47 $268.47 -1.30 (-0.48%)"
  - Font: 13px
  - Colors: #089981 (green), #F23645 (red)
  - Margin-left: 8px

**Bid/Ask Display:**
- Dimensions: 180px × 50px
- Background: #1E222D
- Border-radius: 4px
- Padding: 8px 12px

- **Sell Price**
  - Text: "268.47 SELL"
  - Font: 11px, label
  - Color: #F23645
  - Font-size: 16px (price)

- **Buy Price**
  - Text: "268.47 BUY"
  - Font: 11px, label
  - Color: #089981
  - Font-size: 16px (price)

**Volume:**
- Text: "Vol 48.23M"
- Font: 13px
- Color: #787B86
- Margin-top: 4px

### Left Toolbar
**Container:**
- Dimensions: 48px × 100%
- Background: #131722
- Border-right: 1px solid #2A2E39
- Position: fixed, left

**Tool Buttons (top to bottom):**

1. **Cursor Tool**
   - Dimensions: 48px × 40px
   - Icon: svg_icons/initial_50.svg (cursor)
   - Active background: #1E222D
   - Border-left: 2px solid #2962FF (when active)

2. **Cross Tool**
   - Icon: svg_icons/initial_51.svg (crosshair)
   - Dimensions: 48px × 40px

3. **Trend Line**
   - Icon: svg_icons/initial_52.svg (diagonal line)
   - Dimensions: 48px × 40px

4. **Fibonacci**
   - Icon: svg_icons/initial_53.svg (fibonacci)
   - Dimensions: 48px × 40px

5. **Patterns**
   - Icon: svg_icons/initial_54.svg (pattern icon)
   - Dimensions: 48px × 40px

6. **Text Tool**
   - Icon: svg_icons/initial_55.svg (T letter)
   - Dimensions: 48px × 40px

7. **Emoji/Sticker**
   - Icon: svg_icons/initial_56.svg (smiley)
   - Dimensions: 48px × 40px

8. **Brush Tool**
   - Icon: svg_icons/initial_57.svg (brush)
   - Dimensions: 48px × 40px

9. **Zoom In**
   - Icon: svg_icons/initial_58.svg (magnifier +)
   - Dimensions: 48px × 40px

10. **Measure Tool**
    - Icon: svg_icons/initial_59.svg (ruler)
    - Dimensions: 48px × 40px

11. **Zoom Out**
    - Icon: svg_icons/initial_60.svg (magnifier -)
    - Dimensions: 48px × 40px

12. **Magic Wand**
    - Icon: svg_icons/initial_61.svg (wand)
    - Dimensions: 48px × 40px

13. **Stats**
    - Icon: svg_icons/initial_62.svg (stats)
    - Dimensions: 48px × 40px

14. **Hand Tool**
    - Icon: svg_icons/initial_63.svg (hand)
    - Dimensions: 48px × 40px

**Bottom Tool:**
- **Trash/Delete**
  - Icon: svg_icons/initial_64.svg (trash)
  - Dimensions: 48px × 40px
  - Position: absolute, bottom: 16px

### Right Panel (Watchlist)
**Container:**
- Dimensions: 320px × 100%
- Background: #131722
- Border-left: 1px solid #2A2E39
- Position: fixed, right

**Panel Header:**
- Dimensions: 100% × 44px
- Background: #131722
- Border-bottom: 1px solid #2A2E39
- Padding: 12px 16px

**Watchlist Title:**
- Text: "Watchlist"
- Font: 14px, medium weight
- Color: #D1D4DC
- Icon: svg_icons/initial_65.svg (chevron down)

**Action Buttons:**
- **Add Symbol**
  - Icon: svg_icons/initial_66.svg (plus)
  - Dimensions: 28px × 28px
  
- **Layout**
  - Icon: svg_icons/initial_67.svg (grid)
  - Dimensions: 28px × 28px
  
- **Edit**
  - Icon: svg_icons/initial_68.svg (pencil)
  - Dimensions: 28px × 28px
  
- **More Options**
  - Icon: svg_icons/initial_69.svg (three dots)
  - Dimensions: 28px × 28px

**Column Headers:**
- Dimensions: 100% × 32px
- Background: #1E222D
- Font: 11px, uppercase
- Color: #787B86
- Padding: 8px 16px

- **Symbol** (120px)
- **Last** (60px, right-aligned)
- **Chg** (60px, right-aligned)
- **Chg%** (60px, right-aligned)

**List Items (Indices Section):**
Header:
- Text: "INDICES"
- Font: 11px, uppercase
- Color: #787B86
- Padding: 8px 16px

**SPX Item:**
- Dimensions: 100% × 44px
- Background: #1E222D (hover: #2A2E39)
- Padding: 8px 16px
- Icon: svg_icons/initial_70.svg (SPX logo)
- Symbol: "SPX" - Font: 13px, Color: #D1D4DC
- Last: "6,728.81" - Font: 13px, Color: #D1D4DC
- Change: "8.50" - Font: 13px, Color: #089981
- Change%: "0.13%" - Font: 13px, Color: #089981

**NDQ Item:**
- Icon: svg_icons/initial_71.svg (NDQ logo)
- Last: "25,059.81"
- Change: "-70.23" - Color: #F23645
- Change%: "-0.28%" - Color: #F23645

**DJI Item:**
- Icon: svg_icons/initial_72.svg (DJI logo)
- Last: "46,987.10"
- Change: "74.80" - Color: #089981
- Change%: "0.16%" - Color: #089981

**VIX Item:**
- Icon: svg_icons/initial_73.svg (VIX logo)
- Last: "19.08"
- Change: "-0.42" - Color: #F23645
- Change%: "-2.15%" - Color: #F23645

**DXY Item:**
- Icon: svg_icons/initial_74.svg (DXY logo)
- Last: "99.556"
- Change: "-0.141" - Color: #F23645
- Change%: "-0.14%" - Color: #F23645

**Stocks Section:**
Header: "STOCKS"

**AAPL Item (Active):**
- Background: #1E222D
- Border-left: 2px solid #2962FF
- Icon: svg_icons/initial_75.svg (AAPL logo)
- Last: "268.47"
- Change: "-1.30" - Color: #F23645
- Change%: "-0.48%" - Color: #F23645

**TSLA Item:**
- Icon: svg_icons/initial_76.svg (TSLA logo)
- Last: "429.52"
- Change: "-16.39" - Color: #F23645
- Change%: "-3.68%" - Color: #F23645

**NFLX Item:**
- Icon: svg_icons/initial_79.svg (NFLX logo)
- Last: "1,103.66"
- Change: "6.64" - Color: #089981
- Change%: "0.61%" - Color: #089981

**Futures Section:**
Header: "FUTURES"

**USOIL Item:**
- Icon: svg_icons/initial_80.svg (USOIL logo)
- Last: "59.83"
- Change: "0.31" - Color: #089981
- Change%: "0.52%" - Color: #089981

**GOLD Item:**
- Icon: svg_icons/initial_81.svg (GOLD logo)
- Last: "4,000.289"
- Change: "23.764" - Color: #089981
- Change%: "0.60%" - Color: #089981

**SILVER Item:**
- Icon: svg_icons/initial_82.svg (SILVER logo)
- Last: "48.326"
- Change: "0.3200" - Color: #089981
- Change%: "0.67%" - Color: #089981

**Symbol Detail Panel:**
- Dimensions: 100% × auto
- Background: #131722
- Padding: 16px
- Border-top: 1px solid #2A2E39

**Symbol Header:**
- Icon: svg_icons/initial_84.svg (AAPL logo, large)
- Dimensions: 24px × 24px
- Text: "AAPL"
- Font: 16px, medium weight
- Color: #D1D4DC

**Company Info:**
- Text: "Apple Inc · NASDAQ"
- Font: 13px
- Color: #787B86
- Margin-top: 4px

**Description:**
- Text: "Electronic Technology · Telecommunications Equipment"
- Font: 12px
- Color: #787B86
- Margin-top: 8px

**Action Buttons:**
- Dimensions: 28px × 28px each
- Gap: 8px
- Icons:
  - svg_icons/initial_86.svg (grid)
  - svg_icons/initial_88.svg (pencil)
  - svg_icons/initial_89.svg (three dots)

**Price Display:**
- Text: "268.47 USD"
- Font: 32px, medium weight
- Color: #D1D4DC
- Margin-top: 16px

**Change Display:**
- Text: "-1.30 -0.48%"
- Font: 16px
- Color: #F23645
- Margin-top: 4px

**Market Status:**
- Text: "Market closed"
- Font: 11px
- Color: #787B86
- Icon: svg_icons/initial_109.svg (dash)

**Last Update:**
- Text: "Last update at 01:59 GMT-1"
- Font: 11px
- Color: #787B86
- Margin-top: 4px

**News Item:**
- Background: #1E222D
- Border-radius: 4px
- Padding: 12px
- Margin-top: 12px

**News Icon:**
- Icon: svg_icons/initial_110.svg (info icon)
- Color: #2962FF
- Dimensions: 16px × 16px

**News Text:**
- Font: 12px
- Color: #D1D4DC
- Line-height: 1.5
- Text: "Samsung Electronics is in advanced talks with Barclays to launch a consumer credit card in the U.S., aiming to compete with Apple's financial products."

**News Arrow:**
- Icon: svg_icons/initial_111.svg (chevron right)
- Dimensions: 16px × 16px
- Color: #787B86

**Key Stats Section:**
- Header: "Key stats"
- Font: 14px, medium weight
- Color: #D1D4DC
- Margin-top: 24px

**Stats List:**
- **Next earnings report**
  - Label: Font 12px, Color: #787B86
  - Value: "In 82 days", Font 13px, Color: #D1D4DC
  
- **Volume**
  - Value: "48.23 M"
  
- **Average Volume (30D)**
  - Value: "47.25 M (30D)"
  
- **Market capitalization**
  - Value: "3.97 T"

**Earnings Section:**
- Header: "Earnings"
- Button: "82" with icon svg_icons/initial_112.svg
- Value: "2.80"

### Bottom Panel (Cookie Notice)
**Container:**
- Dimensions: 400px × 80px
- Background: #FFFFFF
- Border-radius: 8px
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)
- Position: fixed, bottom: 16px, left: 16px
- Padding: 16px

**TradingView Logo:**
- Icon: svg_icons/initial_113.svg
- Dimensions: 24px × 24px

**Cookie Icon:**
- Icon: svg_icons/initial_114.svg
- Dimensions: 40px × 40px
- Position: absolute, left: 16px

**Text:**
- Text: "This website uses cookies."
- Font: 13px
- Color: #131722
- Weight: 500

**Link:**
- Text: "Our policy"
- Font: 13px
- Color: #2962FF
- Text-decoration: underline

**Buttons:**
- **Don't allow**
  - Dimensions: 100px × 32px
  - Background: transparent
  - Border: 1px solid #E0E3EB
  - Border-radius: 4px
  - Color: #131722
  - Font: 13px, medium
  
- **Accept all**
  - Dimensions: 100px × 32px
  - Background: #131722
  - Border-radius: 4px
  - Color: #FFFFFF
  - Font: 13px, medium

### Chart Area
**Container:**
- Dimensions: calc(100% - 368px) × calc(100% - 114px)
- Background: #131722
- Position: relative
- Margin-left: 48px
- Margin-right: 320px

**Timeline:**
- Dimensions: 100% × 32px
- Background: #131722
- Border-top: 1px solid #2A2E39
- Font: 11px
- Color: #787B86
- Months: "2024 Feb Mar Apr May Jun Jul Aug Sep Oct Nov"

**Time Display:**
- Position: bottom right
- Text: "20:30:42 UTC"
- Font: 11px
- Color: #787B86
- Background: #1E222D
- Padding: 4px 8px
- Border-radius: 4px

**Timezone:**
- Text: "ADJ"
- Font: 11px
- Color: #787B86
- Margin-left: 8px

**Volume Chart Icons:**
- Expand: svg_icons/initial_115.svg
- Collapse: svg_icons/initial_116.svg
- Settings: svg_icons/initial_117.svg
- More: svg_icons/initial_118.svg
- Dimensions: 20px × 20px each
- Color: #787B86
- Background: #1E222D (on hover)
- Border-radius: 4px

**Chart Controls (Bottom Right):**
- **Collapse/Expand**
  - Icons: svg_icons/initial_119.svg, svg_icons/initial_120.svg
  - Dimensions: 32px × 32px
  
- **Comments**
  - Icon: svg_icons/initial_121.svg
  - Dimensions: 32px × 32px

**Price Scale (Right):**
- Width: 60px
- Background: #131722
- Font: 11px
- Color: #787B86
- Values: 290.00, 285.00, 280.00, 275.00... (decreasing)
- Line color: #2A2E39

**Volume Scale (Bottom):**
- Height: 120px
- Background: transparent
- Bar colors:
  - Bullish: #089981 (opacity: 0.5)
  - Bearish: #F23645 (opacity: 0.5)

### Right Panel Additional Icons
**Help/Support Icons:**
- svg_icons/initial_122.svg (question mark)
- svg_icons/initial_123.svg (calendar)
- svg_icons/initial_128.svg (RSS feed)
- svg_icons/initial_140.svg (bell notification)
- svg_icons/initial_148.svg (idea/lightbulb)
- svg_icons/initial_156.svg (people/community)
- Dimensions: 24px × 24px
- Color: #787B86
- Position: bottom right corner
- Vertical stack with 8px gap

## 2. Dropdown Menus - COMPLETE DOCUMENTATION

### Chart Types Dropdown

**Trigger Button:**
- Dimensions: 90px × 32px
- Background: #1E222D
- Border-radius: 4px
- Border: 1px solid transparent
- Padding: 8px 10px
- Icon: svg_icons/chart_types_1.svg (candles icon)
- Icon size: 16px × 16px
- Icon color: #D1D4DC
- Gap: 6px
- Hover background: #2A2E39
- Active background: #2A2E39
- Active border: 1px solid #2962FF

**Menu Container:**
- Dimensions: 232px × 880px
- Background: #FFFFFF
- Border-radius: 8px
- Box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2)
- Position: absolute
- Top: 40px
- Left: 0
- Padding: 4px 0
- Z-index: 1000
- Overflow-y: auto

**Menu Items (Complete List):**

**Item 1: Bars**
- Dimensions: 232px × 36px
- Padding: 8px 12px
- Icon: svg_icons/chart_types_0.svg
- Icon size: 20px × 20px
- Icon color: #131722
- Text: "Bars"
- Font: 13px, -apple-system
- Color: #131722
- Weight: 400
- Background (normal): transparent
- Background (hover): #F0F3FA
- Gap between icon and text: 12px

**Item 2: Candles** (Currently Active)
- Dimensions: 232px × 36px
- Padding: 8px 12px
- Icon: svg_icons/chart_types_1.svg
- Background: #2A2E39 (dark theme indicator)
- Color: #FFFFFF
- Border-left: 2px solid #2962FF

**Item 3: Hollow candles**
- Icon: svg_icons/chart_types_2.svg
- Text: "Hollow candles"

**Item 4: Volume candles**
- Icon: svg_icons/chart_types_3.svg
- Text: "Volume candles"

---

**Separator Line:**
- Height: 1px
- Background: #E0E3EB
- Margin: 4px 0

---

**Item 5: Line**
- Icon: svg_icons/chart_types_4.svg
- Text: "Line"

**Item 6: Line with markers**
- Icon: svg_icons/chart_types_5.svg
- Text: "Line with markers"

**Item 7: Step line**
- Icon: svg_icons/chart_types_6.svg
- Text: "Step line"

---

**Separator Line**

---

**Item 8: Area**
- Icon: svg_icons/chart_types_7.svg
- Text: "Area"

**Item 9: HLC area**
- Icon: svg_icons/chart_types_8.svg
- Text: "HLC area"

**Item 10: Baseline**
- Icon: svg_icons/chart_types_9.svg
- Text: "Baseline"

---

**Separator Line**

---

**Item 11: Columns**
- Icon: svg_icons/chart_types_10.svg
- Text: "Columns"

**Item 12: High-low**
- Icon: svg_icons/chart_types_11.svg
- Text: "High-low"

---

**Separator Line**

---

**Item 13: Volume footprint**
- Icon: svg_icons/chart_types_12.svg
- Text: "Volume footprint"

**Item 14: Time Price Opportunity**
- Icon: svg_icons/chart_types_13.svg
- Text: "Time Price Opportunity"

**Item 15: Session volume profile**
- Icon: svg_icons/chart_types_14.svg
- Text: "Session volume profile"

---

**Separator Line**

---

**Item 16: Heikin Ashi**
- Icon: svg_icons/chart_types_15.svg
- Text: "Heikin Ashi"

**Item 17: Renko**
- Icon: svg_icons/chart_types_16.svg
- Text: "Renko"

**Item 18: Line break**
- Icon: svg_icons/chart_types_17.svg
- Text: "Line break"

**Item 19: Kagi**
- Icon: svg_icons/chart_types_18.svg
- Text: "Kagi"

**Item 20: Point & figure**
- Icon: svg_icons/chart_types_19.svg
- Text: "Point & figure"

**Item 21: Range**
- Icon: svg_icons/chart_types_20.svg
- Text: "Range"

---

**Menu Item States:**
- **Normal:**
  - Background: transparent
  - Color: #131722
  - Cursor: pointer
  
- **Hover:**
  - Background: #F0F3FA
  - Color: #131722
  - Transition: background 0.2s ease
  
- **Active:**
  - Background: #2A2E39
  - Color: #FFFFFF
  - Border-left: 2px solid #2962FF

## 3. SVG Icon Catalog

### Main Interface Icons

**svg_icons/initial_0.svg** - Hamburger Menu
- Size: 16×16px
- Usage: Top left menu button
- Description: Three horizontal lines (hamburger menu icon)

**svg_icons/initial_33.svg** - Search Icon
- Size: 16×16px
- Usage: Search bar
- Description: Magnifying glass

**svg_icons/initial_34.svg** - Plus Icon
- Size: 16×16px
- Usage: Add to watchlist button
- Description: Plus symbol (+)

**svg_icons/initial_35.svg** - Chart Type Icon
- Size: 16×16px
- Usage: Chart type selector button
- Description: Bars/candles representation

**svg_icons/initial_36.svg** - Indicators Icon
- Size: 16×16px
- Usage: Indicators button
- Description: Function/formula symbol (ƒx)

**svg_icons/initial_37.svg** - Templates Icon
- Size: 16×16px
- Usage: Chart templates button
- Description: 2×2 grid

**svg_icons/initial_38.svg** - Alert Icon
- Size: 16×16px
- Usage: Alert button
- Description: Bell notification

**svg_icons/initial_39.svg** - Replay Icon
- Size: 16×16px
- Usage: Bar replay button
- Description: Circular arrow/replay symbol

**svg_icons/initial_40.svg** - Undo Icon
- Size: 16×16px
- Usage: Undo button
- Description: Curved arrow pointing left

**svg_icons/initial_41.svg** - Redo Icon
- Size: 16×16px
- Usage: Redo button
- Description: Curved arrow pointing right

**svg_icons/initial_42.svg** - Chevron Down
- Size: 12×12px
- Usage: Dropdown indicators
- Description: Downward pointing chevron

**svg_icons/initial_43.svg** - Camera Icon
- Size: 16×16px
- Usage: Screenshot button
- Description: Camera symbol

**svg_icons/initial_44.svg** - Settings Icon
- Size: 16×16px
- Usage: Settings button
- Description: Gear/cog symbol

**svg_icons/initial_45.svg** - Fullscreen Icon
- Size: 16×16px
- Usage: Fullscreen toggle
- Description: Expand arrows (four corners)

**svg_icons/initial_46.svg** - Company Logo (Apple)
- Size: 20×20px
- Usage: Stock symbol identifier
- Description: Apple Inc. logo

**svg_icons/initial_47.svg** - Info Icon
- Size: 16×16px
- Usage: Information tooltip
- Description: Circle with 'i'

### Left Toolbar Icons

**svg_icons/initial_50.svg** - Cursor Tool
- Size: 20×20px
- Usage: Selection tool
- Description: Arrow cursor

**svg_icons/initial_51.svg** - Crosshair Tool
- Size: 20×20px
- Usage: Crosshair cursor
- Description: Plus sign/crosshair

**svg_icons/initial_52.svg** - Trend Line
- Size: 20×20px
- Usage: Drawing trend lines
- Description: Diagonal line with endpoints

**svg_icons/initial_53.svg** - Fibonacci Tool
- Size: 20×20px
- Usage: Fibonacci retracement
- Description: Multiple horizontal lines

**svg_icons/initial_54.svg** - Pattern Tool
- Size: 20×20px
- Usage: Chart patterns
- Description: Geometric shape pattern

**svg_icons/initial_55.svg** - Text Tool
- Size: 20×20px
- Usage: Add text to chart
- Description: Letter 'T'

**svg_icons/initial_56.svg** - Emoji Tool
- Size: 20×20px
- Usage: Add emojis/stickers
- Description: Smiley face

**svg_icons/initial_57.svg** - Brush Tool
- Size: 20×20px
- Usage: Free drawing
- Description: Paintbrush

**svg_icons/initial_58.svg** - Zoom In
- Size: 20×20px
- Usage: Zoom in chart
- Description: Magnifying glass with plus

**svg_icons/initial_59.svg** - Measure Tool
- Size: 20×20px
- Usage: Measure distances
- Description: Ruler or measure lines

**svg_icons/initial_60.svg** - Zoom Out
- Size: 20×20px
- Usage: Zoom out chart
- Description: Magnifying glass with minus

**svg_icons/initial_61.svg** - Magic Wand
- Size: 20×20px
- Usage: Auto-detect patterns
- Description: Magic wand with sparkles

**svg_icons/initial_62.svg** - Stats Icon
- Size: 20×20px
- Usage: Statistics display
- Description: Bar chart or stats symbol

**svg_icons/initial_63.svg** - Hand Tool
- Size: 20×20px
- Usage: Pan/move chart
- Description: Open hand

**svg_icons/initial_64.svg** - Trash Icon
- Size: 20×20px
- Usage: Delete drawings
- Description: Trash bin

### Watchlist Icons

**svg_icons/initial_65.svg** - Chevron Down
- Size: 12×12px
- Usage: Collapse/expand watchlist
- Description: Downward chevron

**svg_icons/initial_66.svg** - Add Symbol
- Size: 16×16px
- Usage: Add symbol to watchlist
- Description: Plus symbol

**svg_icons/initial_67.svg** - Layout Icon
- Size: 16×16px
- Usage: Change layout view
- Description: Grid layout (squares)

**svg_icons/initial_68.svg** - Edit Icon
- Size: 16×16px
- Usage: Edit watchlist
- Description: Pencil

**svg_icons/initial_69.svg** - More Options
- Size: 16×16px
- Usage: Additional options menu
- Description: Three vertical dots

**svg_icons/initial_70.svg** - SPX Logo
- Size: 24×24px
- Usage: S&P 500 Index identifier
- Description: SPX circular badge (red background)

**svg_icons/initial_71.svg** - NDQ Logo
- Size: 24×24px
- Usage: NASDAQ Index identifier
- Description: NDQ circular badge (blue background)

**svg_icons/initial_72.svg** - DJI Logo
- Size: 24×24px
- Usage: Dow Jones Index identifier
- Description: DJI circular badge (blue background)

**svg_icons/initial_73.svg** - VIX Logo
- Size: 24×24px
- Usage: VIX Index identifier
- Description: VIX circular badge (green background)

**svg_icons/initial_74.svg** - DXY Logo
- Size: 24×24px
- Usage: Dollar Index identifier
- Description: DXY circular badge (green background)

**svg_icons/initial_75.svg** - AAPL Logo
- Size: 24×24px
- Usage: Apple Inc. stock identifier
- Description: Apple logo (black circular badge)

**svg_icons/initial_76.svg** - TSLA Logo
- Size: 24×24px
- Usage: Tesla Inc. stock identifier
- Description: Tesla 'T' logo (red circular badge)

**svg_icons/initial_79.svg** - NFLX Logo
- Size: 24×24px
- Usage: Netflix stock identifier
- Description: Netflix 'N' logo (brown circular badge)

**svg_icons/initial_80.svg** - USOIL Logo
- Size: 24×24px
- Usage: Crude Oil futures identifier
- Description: Oil barrel icon (blue circular badge)

**svg_icons/initial_81.svg** - GOLD Logo
- Size: 24×24px
- Usage: Gold futures identifier
- Description: Gold bars icon (yellow circular badge)

**svg_icons/initial_82.svg** - SILVER Logo
- Size: 24×24px
- Usage: Silver futures identifier
- Description: Silver bar icon (blue circular badge)

**svg_icons/initial_84.svg** - AAPL Large Logo
- Size: 32×32px
- Usage: Symbol detail panel header
- Description: Larger Apple logo

**svg_icons/initial_86.svg** - Grid View Icon
- Size: 16×16px
- Usage: Change to grid view
- Description: 2×2 grid

**svg_icons/initial_88.svg** - Edit Icon
- Size: 16×16px
- Usage: Edit symbol details
- Description: Pencil icon

**svg_icons/initial_89.svg** - More Options
- Size: 16×16px
- Usage: Additional options
- Description: Three horizontal dots

### Symbol Detail Panel Icons

**svg_icons/initial_109.svg** - Status Dash
- Size: 12×12px
- Usage: Market status indicator
- Description: Small horizontal dash

**svg_icons/initial_110.svg** - Info/News Icon
- Size: 16×16px
- Usage: News item indicator
- Description: Circle with 'i' (blue)

**svg_icons/initial_111.svg** - Chevron Right
- Size: 16×16px
- Usage: Navigation arrow
- Description: Right-pointing chevron

**svg_icons/initial_112.svg** - Calendar Icon
- Size: 16×16px
- Usage: Earnings date
- Description: Calendar page

**svg_icons/initial_113.svg** - TradingView Logo
- Size: 120×24px
- Usage: Cookie notice branding
- Description: TradingView text logo

**svg_icons/initial_114.svg** - Cookie Icon
- Size: 40×40px
- Usage: Cookie notice
- Description: Cookie symbol

**svg_icons/initial_115.svg** - Expand Icon
- Size: 20×20px
- Usage: Expand volume chart
- Description: Expand arrows

**svg_icons/initial_116.svg** - Collapse Icon
- Size: 20×20px
- Usage: Collapse volume chart
- Description: Collapse arrows

**svg_icons/initial_117.svg** - Settings Icon
- Size: 20×20px
- Usage: Volume chart settings
- Description: Gear icon

**svg_icons/initial_118.svg** - More Options
- Size: 20×20px
- Usage: Volume chart options
- Description: Three dots

**svg_icons/initial_119.svg** - Collapse Chart
- Size: 20×20px
- Usage: Collapse chart panel
- Description: Downward chevron

**svg_icons/initial_120.svg** - Expand Chart
- Size: 20×20px
- Usage: Expand chart panel
- Description: Upward chevron

**svg_icons/initial_121.svg** - Comments Icon
- Size: 20×20px
- Usage: View chart comments
- Description: Speech bubble

**svg_icons/initial_122.svg** - Help Icon
- Size: 24×24px
- Usage: Help/support
- Description: Question mark in circle

**svg_icons/initial_123.svg** - Calendar Icon
- Size: 24×24px
- Usage: Events calendar
- Description: Calendar page

**svg_icons/initial_128.svg** - RSS Feed Icon
- Size: 24×24px
- Usage: RSS feed
- Description: RSS symbol

**svg_icons/initial_140.svg** - Notification Bell
- Size: 24×24px
- Usage: Notifications
- Description: Bell icon

**svg_icons/initial_148.svg** - Ideas Icon
- Size: 24×24px
- Usage: Trading ideas
- Description: Lightbulb

**svg_icons/initial_156.svg** - Community Icon
- Size: 24×24px
- Usage: Community features
- Description: Multiple people/users

**svg_icons/initial_162.svg** - Close Icon
- Size: 16×16px
- Usage: Close dialog/modal
- Description: X symbol

**svg_icons/initial_163.svg** - Pin Icon
- Size: 16×16px
- Usage: Pin item
- Description: Pin/thumbtack

**svg_icons/initial_166.svg** - Link Icon
- Size: 16×16px
- Usage: Copy link
- Description: Chain link

### Chart Type Dropdown Icons

**svg_icons/chart_types_0.svg** - Bars Chart
- Size: 20×20px
- Usage: Chart type: Bars
- Description: OHLC bars representation

**svg_icons/chart_types_1.svg** - Candles Chart
- Size: 20×20px
- Usage: Chart type: Candles
- Description: Candlestick representation

**svg_icons/chart_types_2.svg** - Hollow Candles
- Size: 20×20px
- Usage: Chart type: Hollow candles
- Description: Hollow candlestick outline

**svg_icons/chart_types_3.svg** - Volume Candles
- Size: 20×20px
- Usage: Chart type: Volume candles
- Description: Candles with volume shading

**svg_icons/chart_types_4.svg** - Line Chart
- Size: 20×20px
- Usage: Chart type: Line
- Description: Simple line graph

**svg_icons/chart_types_5.svg** - Line with Markers
- Size: 20×20px
- Usage: Chart type: Line with markers
- Description: Line with data points marked

**svg_icons/chart_types_6.svg** - Step Line
- Size: 20×20px
- Usage: Chart type: Step line
- Description: Stepped line chart

**svg_icons/chart_types_7.svg** - Area Chart
- Size: 20×20px
- Usage: Chart type: Area
- Description: Filled area under line

**svg_icons/chart_types_8.svg** - HLC Area
- Size: 20×20px
- Usage: Chart type: HLC area
- Description: High-Low-Close area chart

**svg_icons/chart_types_9.svg** - Baseline Chart
- Size: 20×20px
- Usage: Chart type: Baseline
- Description: Area chart with baseline

**svg_icons/chart_types_10.svg** - Columns Chart
- Size: 20×20px
- Usage: Chart type: Columns
- Description: Vertical columns/bars

**svg_icons/chart_types_11.svg** - High-Low Chart
- Size: 20×20px
- Usage: Chart type: High-low
- Description: High-low bars

**svg_icons/chart_types_12.svg** - Volume Footprint
- Size: 20×20px
- Usage: Chart type: Volume footprint
- Description: Volume distribution grid

**svg_icons/chart_types_13.svg** - Time Price Opportunity
- Size: 20×20px
- Usage: Chart type: TPO
- Description: Market profile representation

**svg_icons/chart_types_14.svg** - Session Volume Profile
- Size: 20×20px
- Usage: Chart type: Session volume profile
- Description: Volume histogram overlay

**svg_icons/chart_types_15.svg** - Heikin Ashi
- Size: 20×20px
- Usage: Chart type: Heikin Ashi
- Description: Modified candlesticks

**svg_icons/chart_types_16.svg** - Renko
- Size: 20×20px
- Usage: Chart type: Renko
- Description: Renko bricks

**svg_icons/chart_types_17.svg** - Line Break
- Size: 20×20px
- Usage: Chart type: Line break
- Description: Three line break pattern

**svg_icons/chart_types_18.svg** - Kagi Chart
- Size: 20×20px
- Usage: Chart type: Kagi
- Description: Kagi chart pattern

**svg_icons/chart_types_19.svg** - Point & Figure
- Size: 20×20px
- Usage: Chart type: Point & figure
- Description: X's and O's pattern

**svg_icons/chart_types_20.svg** - Range Chart
- Size: 20×20px
- Usage: Chart type: Range
- Description: Range bars

**svg_icons/chart_types_21.svg** - Separator Line
- Size: 232×1px
- Usage: Menu divider
- Description: Horizontal line

### Additional Chart Type Icons

**svg_icons/chart_types_22.svg** - Chart Style 1
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_23.svg** - Chart Style 2
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_24.svg** - Chart Style 3
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_25.svg** - Chart Style 4
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_26.svg** - Chart Style 5
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_27.svg** - Chart Style 6
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_28.svg** - Chart Style 7
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_29.svg** - Chart Style 8
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_30.svg** - Chart Style 9
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_31.svg** - Chart Style 10
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_32.svg** - Chart Style 11
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_33.svg** - Chart Style 12
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_34.svg** - Chart Style 13
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_35.svg** - Chart Style 14
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_36.svg** - Chart Style 15
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_37.svg** - Chart Style 16
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_38.svg** - Chart Style 17
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_39.svg** - Chart Style 18
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_40.svg** - Chart Style 19
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

**svg_icons/chart_types_41.svg** - Chart Style 20
- Size: 20×20px
- Usage: Alternative chart style
- Description: Chart style variant

### Utility Icons

**svg_icons/initial_174.svg** - Sort Icon
- Size: 16×16px
- Usage: Sort list items
- Description: Up/down arrows

**svg_icons/initial_175.svg** - Filter Icon
- Size: 16×16px
- Usage: Filter options
- Description: Funnel shape

**svg_icons/initial_176.svg** - Refresh Icon
- Size: 16×16px
- Usage: Refresh data
- Description: Circular arrow

**svg_icons/initial_177.svg** - Download Icon
- Size: 16×16px
- Usage: Download data
- Description: Downward arrow to line

**svg_icons/initial_178.svg** - Upload Icon
- Size: 16×16px
- Usage: Upload file
- Description: Upward arrow from line

**svg_icons/initial_179.svg** - Share Icon
- Size: 16×16px
- Usage: Share chart
- Description: Connected nodes

**svg_icons/initial_180.svg** - Copy Icon
- Size: 16×16px
- Usage: Copy to clipboard
- Description: Two overlapping squares

**svg_icons/initial_181.svg** - Lock Icon
- Size: 16×16px
- Usage: Lock/unlock feature
- Description: Padlock

**svg_icons/initial_182.svg** - Star Icon
- Size: 16×16px
- Usage: Favorite/bookmark
- Description: Five-pointed star

**svg_icons/initial_183.svg** - Star Filled
- Size: 16×16px
- Usage: Favorited item
- Description: Filled star

**svg_icons/initial_184.svg** - Play Icon
- Size: 16×16px
- Usage: Play animation
- Description: Right-pointing triangle

**svg_icons/initial_185.svg** - Pause Icon
- Size: 16×16px
- Usage: Pause animation
- Description: Two vertical bars

**svg_icons/initial_186.svg** - Stop Icon
- Size: 16×16px
- Usage: Stop action
- Description: Square

**svg_icons/initial_187.svg** - Forward Icon
- Size: 16×16px
- Usage: Skip forward
- Description: Two right-pointing triangles

**svg_icons/initial_188.svg** - Backward Icon
- Size: 16×16px
- Usage: Skip backward
- Description: Two left-pointing triangles

**svg_icons/initial_189.svg** - Eye Icon
- Size: 16×16px
- Usage: Show/hide
- Description: Eye symbol

**svg_icons/initial_190.svg** - Eye Closed
- Size: 16×16px
- Usage: Hidden item
- Description: Eye with slash

**svg_icons/initial_191.svg** - Drag Handle
- Size: 16×16px
- Usage: Drag to reorder
- Description: Six dots (two columns)

**svg_icons/initial_193.svg** - Checkmark
- Size: 16×16px
- Usage: Confirmation/selected
- Description: Checkmark symbol

**svg_icons/initial_194.svg** - Warning Icon
- Size: 16×16px
- Usage: Warning message
- Description: Triangle with exclamation

**svg_icons/initial_213.svg** - Error Icon
- Size: 16×16px
- Usage: Error message
- Description: Circle with X

## 4. Color Palette

### Primary Colors

**Background Colors:**
- `--bg-primary: #131722` - Main dark background
- `--bg-secondary: #1E222D` - Secondary panels, buttons
- `--bg-tertiary: #2A2E39` - Hover states, active items
- `--bg-white: #FFFFFF` - Light backgrounds (dropdowns)
- `--bg-overlay: rgba(0, 0, 0, 0.5)` - Modal overlays

**Brand Colors:**
- `--blue-primary: #2962FF` - Primary brand color (buttons, accents)
- `--blue-hover: #1E53E5` - Primary button hover
- `--blue-light: #3179F5` - Links, interactive elements

**Text Colors:**
- `--text-primary: #D1D4DC` - Main text on dark
- `--text-secondary: #787B86` - Secondary text, labels
- `--text-tertiary: #5E616E` - Disabled text
- `--text-dark: #131722` - Text on light backgrounds
- `--text-white: #FFFFFF` - White text

**Market Data Colors:**
- `--green-bullish: #089981` - Positive change, up
- `--red-bearish: #F23645` - Negative change, down
- `--green-candle: #26A69A` - Bullish candle body
- `--red-candle: #EF5350` - Bearish candle body

**Border Colors:**
- `--border-primary: #2A2E39` - Main borders
- `--border-secondary: #363A45` - Secondary borders
- `--border-light: #E0E3EB` - Light theme borders
- `--border-focus: #2962FF` - Focus/active borders

**Volume Bar Colors:**
- `--volume-bullish: rgba(8, 153, 129, 0.5)` - Green volume bars
- `--volume-bearish: rgba(242, 54, 69, 0.5)` - Red volume bars

**Chart Colors:**
- `--grid-line: #2A2E39` - Chart grid lines
- `--axis-text: #787B86` - Axis labels
- `--crosshair: #787B86` - Crosshair lines

**Badge Colors:**
- `--badge-red: #F23645` - SPX badge
- `--badge-blue: #2962FF` - NDQ, DJI badges
- `--badge-green: #089981` - VIX, DXY badges
- `--badge-yellow: #FFA726` - GOLD badge
- `--badge-black: #131722` - AAPL badge
- `--badge-brown: #8B4513` - NFLX badge

**Shadow Colors:**
- `--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1)` - Small shadows
- `--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15)` - Medium shadows
- `--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.2)` - Large shadows (dropdowns)
- `--shadow-xl: 0 8px 24px rgba(0, 0, 0, 0.25)` - Extra large shadows

**Hover/Focus Colors:**
- `--hover-bg-dark: #2A2E39` - Hover on dark backgrounds
- `--hover-bg-light: #F0F3FA` - Hover on light backgrounds
- `--focus-ring: rgba(41, 98, 255, 0.3)` - Focus ring

## 5. Typography System

### Font Families
```css
--font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace;
```

### Font Sizes
```css
--font-size-10: 10px;   /* Tiny labels */
--font-size-11: 11px;   /* Chart axis, timestamps */
--font-size-12: 12px;   /* Secondary text, descriptions */
--font-size-13: 13px;   /* Primary UI text */
--font-size-14: 14px;   /* Section headers */
--font-size-16: 16px;   /* Large labels, price changes */
--font-size-20: 20px;   /* Stock price header */
--font-size-32: 32px;   /* Large price display */
```

### Font Weights
```css
--font-weight-regular: 400;   /* Body text */
--font-weight-medium: 500;    /* Buttons, labels */
--font-weight-semibold: 600;  /* Headers */
--font-weight-bold: 700;      /* Emphasis */
```

### Line Heights
```css
--line-height-tight: 1.2;     /* Compact text */
--line-height-normal: 1.5;    /* Body text */
--line-height-relaxed: 1.75;  /* Spacious text */
```

### Text Styles

**Display (Large Price):**
- Font: 32px / medium (500)
- Color: #D1D4DC
- Line-height: 1.2

**Heading 1 (Section Titles):**
- Font: 16px / semibold (600)
- Color: #D1D4DC
- Line-height: 1.5

**Heading 2 (Subsections):**
- Font: 14px / medium (500)
- Color: #D1D4DC
- Line-height: 1.5

**Body (Primary UI Text):**
- Font: 13px / regular (400)
- Color: #D1D4DC
- Line-height: 1.5

**Body Small (Descriptions):**
- Font: 12px / regular (400)
- Color: #787B86
- Line-height: 1.5

**Label (Form Labels, Headers):**
- Font: 11px / medium (500)
- Color: #787B86
- Text-transform: uppercase
- Letter-spacing: 0.5px

**Caption (Timestamps, Notes):**
- Font: 11px / regular (400)
- Color: #787B86
- Line-height: 1.2

**Button Text:**
- Font: 13px / medium (500)
- Color: varies by button type
- Line-height: 1

**Price Text (Positive):**
- Font: 13px / regular (400)
- Color: #089981
- Tabular-nums: true

**Price Text (Negative):**
- Font: 13px / regular (400)
- Color: #F23645
- Tabular-nums: true

**Monospace (Prices, Numbers):**
- Font: SF Mono, 13px / regular (400)
- Font-variant-numeric: tabular-nums
- Color: #D1D4DC

## 6. Spacing System

### Base Spacing Unit
```css
--spacing-unit: 4px;
```

### Spacing Scale
```css
--space-0: 0px;
--space-1: 4px;     /* 1 unit */
--space-2: 8px;     /* 2 units */
--space-3: 12px;    /* 3 units */
--space-4: 16px;    /* 4 units */
--space-5: 20px;    /* 5 units */
--space-6: 24px;    /* 6 units */
--space-8: 32px;    /* 8 units */
--space-10: 40px;   /* 10 units */
--space-12: 48px;   /* 12 units */
--space-16: 64px;   /* 16 units */
```

### Component Spacing

**Button Padding:**
- Small: 6px 12px (vertical, horizontal)
- Medium: 8px 16px
- Large: 12px 24px

**Card/Panel Padding:**
- Compact: 12px
- Normal: 16px
- Spacious: 24px

**List Item Padding:**
- Vertical: 8px
- Horizontal: 12px

**Input Padding:**
- 8px 12px

**Modal/Dropdown Padding:**
- 4px 0 (vertical container padding)
- 8px 12px (individual items)

**Icon Spacing:**
- Icon-text gap: 8px (small), 12px (medium)
- Icon margin: 4px

**Section Spacing:**
- Between sections: 24px
- Between subsections: 16px
- Between list items: 0px (continuous)

**Grid Gaps:**
- Tight: 4px
- Normal: 8px
- Relaxed: 12px
- Loose: 16px

### Margins

**Component Margins:**
- Top margin (sections): 16px
- Bottom margin (sections): 16px
- Side margins (panels): 16px

**Text Margins:**
- Paragraph spacing: 12px
- Label spacing: 4px
- Header spacing: 16px (top), 8px (bottom)

### Border Radius

```css
--radius-sm: 4px;    /* Buttons, inputs */
--radius-md: 6px;    /* Cards, small panels */
--radius-lg: 8px;    /* Dropdowns, modals */
--radius-xl: 12px;   /* Large panels */
--radius-full: 50%;  /* Circular badges */
```

### Layout Dimensions

**Fixed Widths:**
- Left toolbar: 48px
- Right panel: 320px
- Dropdown menu: 232px
- Search bar: 200px

**Fixed Heights:**
- Top navbar: 44px
- Stock info header: 70px
- List item: 44px
- Button (medium): 32px
- Timeline: 32px

**Chart Area:**
- Width: calc(100vw - 368px) /* viewport - (toolbar + panel) */
- Height: calc(100vh - 114px) /* viewport - (navbar + header) */

## 7. Implementation Guide

### CSS Custom Properties

```css
:root {
  /* Colors */
  --bg-primary: #131722;
  --bg-secondary: #1E222D;
  --bg-tertiary: #2A2E39;
  --bg-white: #FFFFFF;
  
  --text-primary: #D1D4DC;
  --text-secondary: #787B86;
  --text-tertiary: #5E616E;
  
  --blue-primary: #2962FF;
  --blue-hover: #1E53E5;
  
  --green-bullish: #089981;
  --red-bearish: #F23645;
  
  --border-primary: #2A2E39;
  --border-light: #E0E3EB;
  
  /* Typography */
  --font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "SF Mono", Monaco, Consolas, monospace;
  
  --font-size-11: 11px;
  --font-size-12: 12px;
  --font-size-13: 13px;
  --font-size-14: 14px;
  --font-size-16: 16px;
  --font-size-20: 20px;
  --font-size-32: 32px;
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  --radius-sm: 4px;
  --radius-lg: 8px;
  
  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.2);
  
  /* Layout */
  --toolbar-width: 48px;
  --panel-width: 320px;
  --navbar-height: 44px;
  --header-height: 70px;
}
```

### React Component Structure

#### TopNavbar Component
```jsx
const TopNavbar = () => {
  return (
    <nav className="top-navbar">
      <div className="navbar-left">
        <IconButton icon="menu" />
        <SearchBar placeholder="AAPL" />
        <IconButton icon="plus" />
        <Counter value={0} />
      </div>
      
      <div className="navbar-center">
        <ChartTypeButton />
        <Button icon="indicators" text="Indicators" />
        <IconButton icon="templates" />
        <Button icon="alert" text="Alert" />
        <Button icon="replay" text="