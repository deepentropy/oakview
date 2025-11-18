// examples/indicators/average-day-range-calculation.js
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

// examples/indicators/average-day-range.ts
import { LineSeries } from "lightweight-charts";
function createAverageDayRangeIndicator(chart, mainSeries, options = {}, bars) {
  const indicator = createIndicator(options);
  const metadata = indicator.metadata;
  let _attached = false;
  let _indicatorSeries = [];
  let _dataSubscription = null;
  let _bars = bars || [];
  const calculateAndUpdate = () => {
    if (!_attached) return;
    if (_bars.length === 0) return;
    try {
      const result = indicator.calculate(_bars);
      if (Array.isArray(result) && result.length > 0 && result[0].data) {
        result.forEach((plotData, index) => {
          if (_indicatorSeries[index]) {
            _indicatorSeries[index].setData(plotData.data);
          }
        });
      } else {
        if (_indicatorSeries[0]) {
          _indicatorSeries[0].setData(result);
        }
      }
    } catch (error) {
      console.error("Error calculating indicator:", error);
    }
  };
  const attach = () => {
    if (_attached) return;
    const numPlots = metadata.plots?.length || 1;
    for (let i = 0; i < numPlots; i++) {
      const plotMeta = metadata.plots?.[i];
      const seriesOptions = {
        color: plotMeta?.color || "#2962FF",
        lineWidth: plotMeta?.linewidth || 1,
        title: plotMeta?.title || metadata.title,
        priceScaleId: metadata.overlay ? "right" : "right"  // Use "right" for all scales
      };
      const paneIndex = metadata.overlay ? 0 : 1;
      const series = chart.addSeries(LineSeries, seriesOptions, paneIndex);
      _indicatorSeries.push(series);
    }
    _dataSubscription = mainSeries.subscribeDataChanged?.(calculateAndUpdate);
    _attached = true;
    calculateAndUpdate();
  };
  const detach = () => {
    if (!_attached) return;
    if (_dataSubscription) {
      mainSeries.unsubscribeDataChanged?.(_dataSubscription);
      _dataSubscription = null;
    }
    _indicatorSeries.forEach((series) => {
      chart.removeSeries(series);
    });
    _indicatorSeries = [];
    _attached = false;
  };
  const update = () => {
    calculateAndUpdate();
  };
  const setOptions = (newOptions) => {
    const newIndicator = createIndicator(newOptions);
    Object.assign(indicator, newIndicator);
    calculateAndUpdate();
  };
  return {
    attach,
    detach,
    update,
    setOptions,
    metadata
  };
}
export {
  createAverageDayRangeIndicator
};
