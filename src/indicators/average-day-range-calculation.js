// examples/indicators/average-day-range-calculation.ts
import { Series, ta } from "@deepentropy/oakscriptjs";
function createIndicator(options = {}) {
  const { lengthInput = 14 } = options;
  return {
    metadata: {
      title: "Average Day Range",
      overlay: false,
      inputs: [
        { name: "lengthInput", type: "int", defval: 14, title: "Length" }
      ],
      plots: [
        {
          title: "ADR",
          color: "#2196F3",
          // default blue
          linewidth: 1
        }
      ]
    },
    calculate(bars) {
      const high = Series.fromBars(bars, "high");
      const low = Series.fromBars(bars, "low");
      const range = high.sub(low);
      const adr = ta.sma(range, lengthInput);
      return adr.toTimeValuePairs();
    }
  };
}
export {
  createIndicator as default
};
