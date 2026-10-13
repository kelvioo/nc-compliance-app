import { useState } from "react";
import { Gauge_, StatCard, inputStyle } from "../components/ui";
import { CATS, fmtNaira, calcTotals, calcForecast } from "../lib/compliance";

export function Dashboard({ data, setData }) {
  const { totals, local, foreign, total, pct } = calcTotals(data.entries);
  const forecast = calcForecast(data.entries);
  const [target, setTarget] = useState(data.target || 70);
  const [rate, setRate] = useState(data.exchangeRate || 1600);

  const saveTarget = async () => {
    await setData({ ...data, target: Number(target) });
  };
  const saveRate = async () => {
    await setData({ ...data, exchangeRate: Number(rate) || 1600 });
  };

  return (
    <div style={{ padding: 28, fontFamily: "IBM Plex Sans, sans-serif" }} className="nc-main-content">
      <h1 style={{ fontFamily: "Oswald, sans-serif", textTransform: "uppercase", letterSpacing: 1,
        fontSize: 20, color: "#EDEFF2", margin: "0 0 4px" }}>Compliance dashboard</h1>
      <p style={{ color: "#8D97A3", fontSize: 13, margin: "0 0 24px" }}>
        Live Nigerian Content position across {data.entries.length} logged entries.
      </p>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 28 }}>
        <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10,
          padding: 20, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 260 }}>
          <Gauge_ pct={pct} target={target} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "#8D97A3" }}>Target</span>
            <input type="number" value={target} min={0} max={100}
              onChange={(e) => setTarget(e.target.value)} onBlur={saveTarget}
              style={{ ...inputStyle, width: 56, padding: "5px 8px", textAlign: "center" }} />
            <span style={{ fontSize: 12, color: "#8D97A3" }}>%</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#5B6470" }}>₦/$1</span>
            <input type="number" value={rate} min={1}
              onChange={(e) => setRate(e.target.value)} onBlur={saveRate}
              style={{ ...inputStyle, width: 80, padding: "5px 8px", textAlign: "center", fontSize: 12 }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="Local spend" value={fmtNaira(local)} accent="#4FAE7E" />
            <StatCard label="Foreign spend" value={fmtNaira(foreign)} accent="#D9534F" />
            <StatCard label="Total tracked" value={fmtNaira(total)} accent="#7FC4D6" />
          </div>
          {forecast && (
            <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: "#8D97A3", marginBottom: 6, letterSpacing: 0.5 }}>
                PROJECTED NC% (NEXT QUARTER)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 22, fontWeight: 700,
                  color: forecast.projectedPct >= target ? "#4FAE7E" : "#D9534F" }}>
                  {forecast.projectedPct.toFixed(1)}%
                </span>
                <span style={{ fontSize: 11, color: "#5B6470" }}>
                  based on {forecast.monthsTracked} months of data · trend {forecast.trendPerMonth >= 0 ? "+" : ""}
                  {forecast.trendPerMonth.toFixed(1)}pt/month
                </span>
              </div>
            </div>
          )}
          <div style={{ background: "#1A2028", border: "1px solid #2E3742", borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 12, color: "#8D97A3", marginBottom: 12, letterSpacing: 0.5 }}>
              SPEND BY CATEGORY
            </div>
            {CATS.map((c) => {
              const val = totals[c.id];
              const w = total > 0 ? (val / total) * 100 : 0;
              return (
                <div key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                    color: "#EDEFF2", marginBottom: 4 }}>
                    <span>{c.label}</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#8D97A3" }}>
                      {fmtNaira(val)}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#0F1216", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${w}%`, height: "100%",
                      background: c.group === "local" ? "#4FAE7E" : "#D9534F" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
