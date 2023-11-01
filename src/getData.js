import React, { useState, useEffect, useRef } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import { getTimestampInMilliseconds } from "./utils";

export default function TradingViewChart() {
  const [resdata, setData] = useState([]);
  const chartContainerRef = useRef();
  const chart = useRef();

  useEffect(() => {
    console.log("chartContainerRef.current ", chartContainerRef.current);
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        backgroundColor: "#253248",
        textColor: "rgba(255, 255, 255, 0.9)",
      },

      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: true,
      },
      timeScale: {
        borderColor: "#485c7b",
      },
    });

    const fetchData = async () => {
      const response = await fetch("https://streaming.bitquery.io/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
          {
            EVM(network: eth, dataset: combined) {
              DEXTradeByTokens(
                orderBy: {ascending: Block_Date}
                where: {Trade: {Currency: {SmartContract: {is: "0xdac17f958d2ee523a2206206994597c13d831ec7"}}, Side: {Currency: {SmartContract: {is: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}}}}}
                limit: {count: 200}
              ) {
                Block {
                  Date(interval: {in: days})
                }
                volume: sum(of: Trade_Amount)
                Trade {
                  high: Price(maximum: Trade_Price)
                  low: Price(minimum: Trade_Price)
                  open: Price(minimum: Block_Number)
                  close: Price(maximum: Block_Number)
                }
                count
              }
            }
          }
          
            `,
          variables: "{}",
        }),
      });

      if (response.status === 200) {
        const recddata = await response.json();
        console.log(recddata);
        const responseData = recddata.data.EVM.DEXTradeByTokens;
        setData(responseData);

        const extractedData = [];
        const extractedvol = [];

        responseData.forEach((record) => {
          const open = record.Trade.open;
          const high = record.Trade.high;
          const low = record.Trade.low;
          const close = record.Trade.close;
          const recvol = parseFloat(record.volume);

          const resdate = new Date(record.Block.Date);

          const extractedItem = {
            open: open,
            high: high,
            low: low,
            close: close,
            time: resdate.toISOString().split("T")[0],
          };
          // Push the extracted object to the extractedData array
          extractedData.push(extractedItem);

          const extractvol = {
            value: recvol,
            time: resdate.toISOString().split("T")[0],
          };
          extractedvol.push(extractvol);
        });
        console.log("extractedvol ", extractedvol);
        const candlestickSeries = chart.current.addCandlestickSeries({
          upColor: "#008000",
          downColor: "#FF0000",
          borderDownColor: "#FF0000",
          borderUpColor: "#008000",
          wickDownColor: "#FF0000",
          wickUpColor: "#f2e9e9",
        });
        candlestickSeries.setData(extractedData);
        const volumeSeries = chart.current.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
          overlay: true,
          priceScaleId: '',
          color:"#f4cccc"
        });

        volumeSeries.setData(extractedvol);
      } else {
        console.log("error");
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Trade Data</h1>
      {/* <div id="tradingview-chart" style={{ height: 800, width: 80 }}></div> */}
      <div
        ref={chartContainerRef}
        className="chart-container"
        style={{ height: 800, width: 800 }}
      />
    </div>
  );
}
