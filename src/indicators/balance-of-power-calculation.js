// examples/indicators/balance-of-power-calculation.ts
import { Series } from "@deepentropy/oakscriptjs";
function createIndicator(options = {}) {
  return {
    metadata: {
      title: "Balance of Power",
      overlay: false,
      plots: [
        {
          title: "BOP",
          color: "#ef5350",
          // color.red
          linewidth: 1
        }
      ]
    },
    calculate(bars) {
      const close = Series.fromBars(bars, "close");
      const high = Series.fromBars(bars, "high");
      const low = Series.fromBars(bars, "low");
      const open = Series.fromBars(bars, "open");
      const numerator = close.sub(open);
      const denominator = high.sub(low);
      const bop = numerator.div(denominator);
      return bop.toTimeValuePairs();
    }
  };
}
export {
  createIndicator as default
};
