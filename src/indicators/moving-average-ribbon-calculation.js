// examples/indicators/moving-average-ribbon-calculation.ts
import { Series, ta } from "@deepentropy/oakscriptjs";
function createIndicator(options = {}) {
  const {
    show_ma1 = true,
    ma1_type = "SMA",
    ma1_length = 20,
    ma1_color = "#f6c309",
    show_ma2 = true,
    ma2_type = "SMA",
    ma2_length = 50,
    ma2_color = "#fb9800",
    show_ma3 = true,
    ma3_type = "SMA",
    ma3_length = 100,
    ma3_color = "#fb6500",
    show_ma4 = true,
    ma4_type = "SMA",
    ma4_length = 200,
    ma4_color = "#f60c0c"
  } = options;
  function ma(source, length, maType) {
    switch (maType) {
      case "SMA":
        return ta.sma(source, length);
      case "EMA":
        return ta.ema(source, length);
      case "SMMA (RMA)":
        return ta.rma(source, length);
      case "WMA":
        return ta.wma(source, length);
      default:
        return source;
    }
  }
  return {
    metadata: {
      title: "Moving Average Ribbon",
      shorttitle: "MA Ribbon",
      overlay: true,
      inputs: [
        { name: "show_ma1", type: "bool", defval: true, title: "Show MA #1" },
        { name: "ma1_type", type: "string", defval: "SMA", title: "MA #1 Type", options: ["SMA", "EMA", "SMMA (RMA)", "WMA"] },
        { name: "ma1_length", type: "int", defval: 20, title: "MA #1 Length", minval: 1 },
        { name: "show_ma2", type: "bool", defval: true, title: "Show MA #2" },
        { name: "ma2_type", type: "string", defval: "SMA", title: "MA #2 Type", options: ["SMA", "EMA", "SMMA (RMA)", "WMA"] },
        { name: "ma2_length", type: "int", defval: 50, title: "MA #2 Length", minval: 1 },
        { name: "show_ma3", type: "bool", defval: true, title: "Show MA #3" },
        { name: "ma3_type", type: "string", defval: "SMA", title: "MA #3 Type", options: ["SMA", "EMA", "SMMA (RMA)", "WMA"] },
        { name: "ma3_length", type: "int", defval: 100, title: "MA #3 Length", minval: 1 },
        { name: "show_ma4", type: "bool", defval: true, title: "Show MA #4" },
        { name: "ma4_type", type: "string", defval: "SMA", title: "MA #4 Type", options: ["SMA", "EMA", "SMMA (RMA)", "WMA"] },
        { name: "ma4_length", type: "int", defval: 200, title: "MA #4 Length", minval: 1 }
      ],
      plots: [
        { title: "MA #1", color: ma1_color, linewidth: 1 },
        { title: "MA #2", color: ma2_color, linewidth: 1 },
        { title: "MA #3", color: ma3_color, linewidth: 1 },
        { title: "MA #4", color: ma4_color, linewidth: 1 }
      ]
    },
    calculate(bars) {
      console.log(`\u{1F504} MA Ribbon calculate() called with ${bars.length} bars`);
      console.time("MA Ribbon - Total");
      console.time("MA Ribbon - Extract close");
      const close = Series.fromBars(bars, "close");
      console.timeEnd("MA Ribbon - Extract close");
      console.time("MA Ribbon - Calculate MAs");
      const ma1_values = show_ma1 ? ma(close, ma1_length, ma1_type) : null;
      const ma2_values = show_ma2 ? ma(close, ma2_length, ma2_type) : null;
      const ma3_values = show_ma3 ? ma(close, ma3_length, ma3_type) : null;
      const ma4_values = show_ma4 ? ma(close, ma4_length, ma4_type) : null;
      console.timeEnd("MA Ribbon - Calculate MAs");
      console.time("MA Ribbon - toTimeValuePairs");
      const result = [
        {
          title: "MA #1",
          data: ma1_values ? ma1_values.toTimeValuePairs() : []
        },
        {
          title: "MA #2",
          data: ma2_values ? ma2_values.toTimeValuePairs() : []
        },
        {
          title: "MA #3",
          data: ma3_values ? ma3_values.toTimeValuePairs() : []
        },
        {
          title: "MA #4",
          data: ma4_values ? ma4_values.toTimeValuePairs() : []
        }
      ];
      console.timeEnd("MA Ribbon - toTimeValuePairs");
      console.timeEnd("MA Ribbon - Total");
      return result;
    }
  };
}
export {
  createIndicator as default
};
