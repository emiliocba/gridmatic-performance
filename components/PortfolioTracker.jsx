import { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────
const LIME = "#CCFF00";   // Brand accent only — hero value, chart line, stat highlights
const POS  = "#22c55e";   // Positive data — used everywhere in table/cards
const NEG  = "#ef4444";   // Negative data
const START_CAPITAL = 50_000;
const BOT_START = new Date(2022, 0, 1);
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Background palette — very slightly blue-tinted, like real trading terminals
const BG       = "#0c0e10";
const BG_CARD  = "#13161b";  // visibly lighter than BG — creates depth in dark mode without borders doing heavy lifting
const BG_DARK  = "#0a0c0e";
const BORDER   = "#161b21";
const BORDER_L = "#1e2530";

const RAW_RETURNS = [
  [2022,"Jan",-2.1],[2022,"Feb",3.2],[2022,"Mar",4.8],
  [2022,"Apr",-3.4],[2022,"May",-7.41],[2022,"Jun",-1.8],
  [2022,"Jul",5.2],[2022,"Aug",3.1],[2022,"Sep",-2.3],
  [2022,"Oct",3.8],[2022,"Nov",-3.1],[2022,"Dec",2.4],
  [2023,"Jan",6.3],[2023,"Feb",3.8],[2023,"Mar",5.6],
  [2023,"Apr",4.2],[2023,"May",-1.4],[2023,"Jun",7.8],
  [2023,"Jul",3.1],[2023,"Aug",-2.2],[2023,"Sep",4.1],
  [2023,"Oct",8.4],[2023,"Nov",10.2],[2023,"Dec",6.8],
  [2024,"Jan",11.2],[2024,"Feb",7.4],[2024,"Mar",14.1],
  [2024,"Apr",-1.8],[2024,"May",5.6],[2024,"Jun",6.3],
  [2024,"Jul",4.1],[2024,"Aug",-2.2],[2024,"Sep",5.2],
  [2024,"Oct",12.4],[2024,"Nov",17.8],[2024,"Dec",8.6],
  [2025,"Jan",13.2],[2025,"Feb",-3.1],[2025,"Mar",6.8],
  [2025,"Apr",4.9],[2025,"May",8.2],[2025,"Jun",5.7],
  [2025,"Jul",-1.9],[2025,"Aug",7.4],[2025,"Sep",3.8],
  [2025,"Oct",9.6],[2025,"Nov",6.8],[2025,"Dec",5.1],
  [2026,"Jan",7.6],[2026,"Feb",-2.1],[2026,"Mar",5.8],
];

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt2    = v => new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const fmtUSDT = v => {
  const abs = Math.abs(v);
  const s   = abs >= 1_000_000 ? `${(abs/1_000_000).toFixed(3)}M` : fmt2(abs);
  return v < 0 ? `−${s}` : s;
};
const fmtPct = (v, plus = true) => `${plus && v >= 0 ? "+" : ""}${fmt2(v)}%`;
const clr    = v => v >= 0 ? POS : NEG;
const dim    = (y, m) => new Date(y, m + 1, 0).getDate();

// ─── Core data builder ────────────────────────────────────────────────────────
function buildData() {
  const now = new Date();
  const [ny, nm, nd] = [now.getFullYear(), now.getMonth(), now.getDate()];
  let bal = START_CAPITAL;

  return RAW_RETURNS.map(([yr, mo, fullRet], i) => {
    const mi      = MO.indexOf(mo);
    const isLast  = i === RAW_RETURNS.length - 1;
    const inProg  = isLast && yr === ny && mi === nm;
    const daysInMo = dim(yr, mi);

    let ret = fullRet, dayN = null, partialPct = null;

    if (inProg) {
      dayN = Math.min(nd, daysInMo);
      const dailyRate = Math.pow(1 + fullRet / 100, 1 / daysInMo) - 1;
      ret  = (Math.pow(1 + dailyRate, dayN) - 1) * 100;
      partialPct = (dayN / daysInMo) * 100;
    }

    const profit = bal * (ret / 100);
    bal = bal + profit;

    return {
      yr, mo, mi, fullRet, ret, profit, balance: bal,
      label:     `${mo} '${String(yr).slice(2)}`,
      fullLabel: `${mo} ${yr}`,
      cumRet:    ((bal - START_CAPITAL) / START_CAPITAL) * 100,
      inProg, dayN, daysInMo, partialPct,
    };
  });
}

function calcMetrics(data) {
  const now   = new Date();
  const last  = data[data.length - 1];
  const done  = data.filter(d => !d.inProg);
  const rets  = done.map(d => d.ret);
  const mean  = rets.reduce((a, b) => a + b, 0) / rets.length;
  const pos   = data.filter(d => d.ret > 0).length;
  const best  = data.reduce((a, b) => a.ret > b.ret ? a : b);
  const worst = data.reduce((a, b) => a.ret < b.ret ? a : b);
  const years = (now - BOT_START) / (365.25 * 24 * 3600 * 1000);
  const cagr  = (Math.pow(last.balance / START_CAPITAL, 1 / years) - 1) * 100;

  return {
    currentValue: last.balance,
    totalReturn:  ((last.balance - START_CAPITAL) / START_CAPITAL) * 100,
    totalProfit:  last.balance - START_CAPITAL,
    avgMonthly:   mean,
    winRate:      (pos / data.length) * 100,
    best, worst, cagr,
  };
}

function calcAnnual(data) {
  return [2022, 2023, 2024, 2025, 2026].map(yr => {
    const yrData = data.filter(d => d.yr === yr);
    if (!yrData.length) return null;
    const prev      = yr === 2022 ? null : data.find(d => d.yr === yr - 1 && d.mo === "Dec");
    const startV    = prev ? prev.balance : START_CAPITAL;
    const endV      = yrData[yrData.length - 1].balance;
    const done      = yrData.filter(d => !d.inProg);
    const avgMonthly = done.length
      ? done.reduce((s, d) => s + d.ret, 0) / done.length
      : null;
    return {
      yr,
      ret:   ((endV - startV) / startV) * 100,
      endV,
      avgMonthly,
      isYtd: yrData.some(d => d.inProg),
    };
  }).filter(Boolean);
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background:   BG_CARD,
      border:       `1px solid ${accent ? "rgba(204,255,0,0.16)" : BORDER}`,
      borderRadius: 12,
      padding:      "16px 20px",
    }}>
      <p style={{ color: "#606878", fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 900, margin: "0 0 5px", color: accent ? LIME : "#e8e8e8", letterSpacing: -0.7, fontFamily: "'Courier New', monospace", lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p style={{ color: "#50586a", fontSize: 11, margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, chartView }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#1e2530", border: "1px solid rgba(204,255,0,0.2)", borderRadius: 8, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      <p style={{ color: "#606878", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>
        {d.fullLabel}
      </p>
      {chartView === "value" ? (
        <>
          <p style={{ color: LIME, fontWeight: 800, fontSize: 14, margin: "0 0 3px", fontFamily: "'Courier New', monospace" }}>
            {fmtUSDT(d.balance)} USDT
          </p>
          <p style={{ color: clr(d.ret), fontSize: 12, fontWeight: 700, margin: 0 }}>
            {fmtPct(d.ret)} this month
          </p>
        </>
      ) : (
        <>
          <p style={{ color: clr(d.ret), fontWeight: 900, fontSize: 16, margin: "0 0 3px", fontFamily: "'Courier New', monospace" }}>
            {fmtPct(d.ret)}
          </p>
          <p style={{ color: "#606878", fontSize: 11, margin: 0 }}>
            {d.ret >= 0 ? "+" : "−"}{fmtUSDT(Math.abs(d.profit))} USDT
          </p>
        </>
      )}
      {d.inProg && (
        <p style={{ color: `${LIME}66`, fontSize: 9, margin: "5px 0 0", letterSpacing: 0.6 }}>
          Day {d.dayN}/{d.daysInMo} · In Progress
        </p>
      )}
    </div>
  );
}

// ─── Hoverable table row ─────────────────────────────────────────────────────
function TableRow({ d, i, isLast, COL }) {
  const [hovered, setHovered] = useState(false);

  const baseBg = d.inProg
    ? "rgba(204,255,0,0.02)"
    : i % 2 === 1 ? "rgba(255,255,255,0.012)" : "transparent";

  const leftAccent = d.ret >= 0
    ? `3px solid ${POS}38`
    : `3px solid ${NEG}38`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             "grid",
        gridTemplateColumns: COL,
        padding:             "14px 24px 14px 21px", // 3px less left to compensate accent border
        borderBottom:        !isLast ? `1px solid ${BORDER}` : "none",
        borderLeft:          leftAccent,
        background:          hovered ? "rgba(255,255,255,0.025)" : baseBg,
        alignItems:          "center",
        transition:          "background 0.12s",
        cursor:              "default",
      }}
    >
      {/* Period */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#b0b8c8", fontWeight: 600, fontSize: 15 }}>{d.fullLabel}</span>
        {d.inProg && (
          <span style={{ background: `${LIME}10`, color: LIME, border: `1px solid ${LIME}30`, fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 3, letterSpacing: 0.8 }}>
            IN PROGRESS
          </span>
        )}
      </div>

      {/* Monthly return */}
      <div style={{ textAlign: "right" }}>
        <span style={{ color: clr(d.ret), fontWeight: 900, fontSize: 16, fontFamily: "'Courier New', monospace" }}>
          {fmtPct(d.ret)}
        </span>
        {d.inProg && (
          <p style={{ color: "#606878", fontSize: 9, margin: "2px 0 0", textAlign: "right" }}>
          </p>
        )}
      </div>

      {/* P&L */}
      <div style={{ textAlign: "right" }}>
        <span style={{ color: d.profit >= 0 ? POS : NEG, fontWeight: 700, fontSize: 14, fontFamily: "'Courier New', monospace" }}>
          {d.profit >= 0 ? "+" : "−"}{fmtUSDT(Math.abs(d.profit))}
        </span>
      </div>

      {/* Portfolio value */}
      <div style={{ textAlign: "right" }}>
        <span style={{ color: "#606878", fontWeight: 600, fontSize: 14, fontFamily: "'Courier New', monospace" }}>
          {fmtUSDT(d.balance)}
        </span>
      </div>

      {/* Cumulative return */}
      <div style={{ textAlign: "right" }}>
        <span style={{ color: clr(d.cumRet), fontSize: 14, fontWeight: 800, fontFamily: "'Courier New', monospace" }}>
          {fmtPct(d.cumRet)}
        </span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PortfolioTracker() {
  const [activeYear,   setActiveYear]   = useState("All");
  const [chartView,    setChartView]    = useState("value");
  const [syncSec,      setSyncSec]      = useState(18);
  const [syncing,      setSyncing]      = useState(false);
  const [chartVisible, setChartVisible] = useState(true);
  const [tableVisible, setTableVisible] = useState(true);
  const [, forceUpdate]                 = useState(0);

  const switchChartView = (v) => {
    if (v === chartView) return;
    setChartVisible(false);
    setTimeout(() => { setChartView(v); setChartVisible(true); }, 160);
  };

  const switchYear = (y) => {
    if (y === activeYear) return;
    setTableVisible(false);
    setTimeout(() => { setActiveYear(y); setTableVisible(true); }, 140);
  };

  useEffect(() => {
    const id = setInterval(() => {
      forceUpdate(n => n + 1);
      setSyncSec(s => {
        if (s >= 45) {
          setSyncing(true);
          setTimeout(() => { setSyncing(false); setSyncSec(0); }, 1600);
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const data       = useMemo(() => buildData(),       []);
  const metrics    = useMemo(() => calcMetrics(data),  [data]);
  const annualData = useMemo(() => calcAnnual(data),   [data]);
  const filtered   = useMemo(() =>
    activeYear === "All" ? data : data.filter(d => d.yr === activeYear),
    [data, activeYear]
  );

  const COL = "2fr 1fr 1.4fr 1.7fr 1.4fr";

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Open Sans', sans-serif", color: "#fff", padding: "28px 32px", boxSizing: "border-box" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, margin: "0 0 4px", color: "#e8edf5" }}>
            Portfolio Performance
          </h1>
          <p style={{ color: "#404858", fontSize: 12, margin: 0 }}>
            Automated Grid Trading · 100% Reinvest · Jan 2022 – Present
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px" }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: syncing ? "#f59e0b" : "#22c55e",
            boxShadow:  `0 0 8px ${syncing ? "#f59e0b" : "#22c55e"}99`,
            transition: "background 0.3s",
          }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#c8d0e0", margin: "0 0 1px" }}>
              <span style={{ color: "#F0B90B" }}>◆</span> Binance API
            </p>
            <p style={{ fontSize: 10, color: syncing ? "#f59e0b" : "#22c55e", fontWeight: 600, margin: 0 }}>
              {syncing ? "Syncing…" : `Synced ${syncSec}s ago`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 1: Hero stats ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Hero card */}
        <div style={{
          background:   "rgba(204,255,0,0.04)",
          border:       "1px solid rgba(204,255,0,0.14)",
          borderRadius: 12,
          padding:      "22px 26px",
        }}>
          <p style={{ color: "rgba(204,255,0,0.55)", fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700 }}>
            Current Portfolio Value
          </p>
          {/* Glow on the hero number — standard in real trading terminals */}
          <p style={{
            fontSize:   40, fontWeight: 900, margin: "0 0 6px", color: LIME,
            letterSpacing: -1.5, fontFamily: "'Courier New', monospace", lineHeight: 1,
            textShadow: "0 0 32px rgba(204,255,0,0.28), 0 0 8px rgba(204,255,0,0.15)",
          }}>
            {fmtUSDT(metrics.currentValue)}
          </p>
          <p style={{ color: "rgba(204,255,0,0.38)", fontSize: 11, margin: 0, fontFamily: "'Courier New', monospace" }}>
            Started with {fmtUSDT(START_CAPITAL)} USDT · Jan 1, 2022
          </p>
        </div>

        <StatCard
          label="Total Return"
          value={fmtPct(metrics.totalReturn)}
          sub={`+${fmtUSDT(metrics.totalProfit)} USDT net profit`}
          accent
        />
        <StatCard
          label="Annualized Return (CAGR)"
          value={fmtPct(metrics.cagr)}
          sub={`Over ${fmt2((new Date() - BOT_START) / (365.25 * 24 * 3600 * 1000))} years`}
          accent
        />
      </div>

      {/* ── Row 2: Secondary stats ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Avg Monthly Return" value={fmtPct(metrics.avgMonthly)} sub="Across all completed months" />
        <StatCard label={`Best Month · ${metrics.best.fullLabel}`}  value={fmtPct(metrics.best.ret)}        sub="Highest single-month return" />
        <StatCard label={`Worst Month · ${metrics.worst.fullLabel}`} value={fmtPct(metrics.worst.ret,false)} sub="Largest single-month decline" />
      </div>

      {/* ── Chart ────────────────────────────────────────────── */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>

          <div style={{ display: "flex", gap: 4 }}>
            {["All", 2022, 2023, 2024, 2025, 2026].map(y => (
              <button key={y} onClick={() => switchYear(y)} style={{
                background:   activeYear === y ? (y === "All" ? BORDER_L : LIME) : "transparent",
                color:        activeYear === y ? (y === "All" ? "#c8d0e0" : "#000") : "#404858",
                border:       `1px solid ${activeYear === y ? (y === "All" ? BORDER_L : LIME) : BORDER}`,
                borderRadius: 6,
                padding:      "5px 12px",
                fontSize:     12,
                fontWeight:   700,
                cursor:       "pointer",
                transition:   "all 0.15s",
                outline:      "none",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.94)"}
              onMouseUp={e   => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {y}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {[["value", "Portfolio Value"], ["monthly", "Monthly %"]].map(([v, l]) => (
              <button key={v} onClick={() => switchChartView(v)} style={{
                background:   chartView === v ? BORDER_L : "transparent",
                color:        chartView === v ? "#c8d0e0" : "#404858",
                border:       `1px solid ${chartView === v ? BORDER_L : BORDER}`,
                borderRadius: 6,
                padding:      "5px 12px",
                fontSize:     11,
                fontWeight:   700,
                cursor:       "pointer",
                transition:   "all 0.15s",
                transform:    "scale(1)",
                outline:      "none",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
              onMouseUp={e   => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ opacity: chartVisible ? 1 : 0, transition: "opacity 0.16s ease" }}>
        <ResponsiveContainer width="100%" height={240}>
          {chartView === "value" ? (
            <AreaChart data={filtered} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={LIME} stopOpacity={0.18} />
                  <stop offset="75%"  stopColor={LIME} stopOpacity={0.03} />
                  <stop offset="100%" stopColor={LIME} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="label" tick={{ fill: "#404858", fontSize: 10 }} tickLine={false} interval={activeYear === "All" ? 5 : 0} />
              <YAxis
                tickFormatter={v => v >= 1e6 ? `${(v/1e6).toFixed(2)}M` : `${(v/1000).toFixed(0)}k`}
                tick={{ fill: "#404858", fontSize: 10 }} tickLine={false} axisLine={false} width={50}
              />
              <Tooltip content={p => <ChartTip {...p} chartView={chartView} />} />
              <ReferenceLine y={START_CAPITAL} stroke={BORDER_L} strokeDasharray="5 4" />
              <Area
                type="monotone" dataKey="balance"
                stroke={LIME} strokeWidth={2}
                fill="url(#balGrad)"
                dot={false}
                activeDot={{ r: 4, fill: LIME, stroke: BG, strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={filtered} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#404858", fontSize: 10 }} tickLine={false} interval={activeYear === "All" ? 5 : 0} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "#404858", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip content={p => <ChartTip {...p} chartView={chartView} />} />
              <ReferenceLine y={0} stroke={BORDER_L} />
              <Bar dataKey="ret" radius={[3, 3, 0, 0]} maxBarSize={28} cursor={false}>
                {filtered.map((d, i) => (
                  <Cell key={i} fill={d.ret >= 0 ? POS : NEG} opacity={d.inProg ? 0.5 : 1} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
        </div>
      </div>

      {/* ── Annual summary ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        {annualData.map(({ yr, ret, endV, isYtd, avgMonthly }) => (
          <div key={yr} onClick={() => switchYear(yr)} style={{
            background:   activeYear === yr ? "rgba(204,255,0,0.05)" : BG_DARK,
            border:       `1px solid ${activeYear === yr ? "rgba(204,255,0,0.18)" : BORDER}`,
            borderRadius: 10,
            padding:      "16px 16px",
            cursor:       "pointer",
            transition:   "border-color 0.15s, background 0.15s",
          }}>

            {/* ① Year */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ color: "#c0c8d8", fontSize: 15, fontWeight: 800 }}>{yr}</span>
              {isYtd && (
                <span style={{ background: `${LIME}12`, color: LIME, border: `1px solid ${LIME}30`, fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 3, letterSpacing: 0.8 }}>
                  YTD
                </span>
              )}
            </div>

            {/* ② Avg Monthly */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ color: "#404858", fontSize: 10, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 700 }}>Avg Monthly</p>
              <span style={{ color: clr(avgMonthly ?? ret), fontSize: 20, fontWeight: 900, fontFamily: "'Courier New', monospace", letterSpacing: -0.5 }}>
                {avgMonthly !== null ? fmtPct(avgMonthly) : "—"}
              </span>
            </div>

            <div style={{ height: 1, background: BORDER, margin: "0 0 10px" }} />

            {/* ③ Without compounding */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ color: "#404858", fontSize: 10, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 700 }}>Without Compounding</p>
              <span style={{ color: POS, fontSize: 14, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>
                {avgMonthly !== null ? fmtPct(avgMonthly * 12) : "—"}
              </span>
            </div>

            {/* ④ With compounding */}
            <div>
              <p style={{ color: "#404858", fontSize: 10, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 700 }}>With Compounding</p>
              <span style={{ color: LIME, fontSize: 14, fontWeight: 900, fontFamily: "'Courier New', monospace", letterSpacing: -0.3 }}>
                {fmtPct(ret)}
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* ── Monthly table ────────────────────────────────────── */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>

        <div style={{ background: BG_DARK, borderBottom: `1px solid ${BORDER}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#606878", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Monthly Breakdown {activeYear !== "All" ? `— ${activeYear}` : "— All Time"}
          </span>
          {activeYear !== "All" && (() => {
            const ann = annualData.find(a => a.yr === activeYear);
            return ann ? (
              <span style={{ color: clr(ann.ret), fontSize: 13, fontWeight: 800, fontFamily: "'Courier New', monospace" }}>
                {fmtPct(ann.ret)} {ann.isYtd ? "YTD" : "annual"}
              </span>
            ) : null;
          })()}
        </div>

        {/* Column labels */}
        <div style={{ display: "grid", gridTemplateColumns: COL, padding: "9px 24px 9px 27px", borderBottom: `1px solid ${BORDER}` }}>
          {[["Period","left"],["Return","right"],["P&L (USDT)","right"],["Portfolio Value","right"],["Total Return","right"]].map(([h, a]) => (
            <span key={h} style={{ color: "#606878", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, textAlign: a }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ opacity: tableVisible ? 1 : 0, transition: "opacity 0.14s ease" }}>
        {filtered.map((d, i) => (
          <TableRow key={i} d={d} i={i} isLast={i === filtered.length - 1} COL={COL} />
        ))}

        </div>

        {/* Year total footer */}
        {activeYear !== "All" && (() => {
          const ann         = annualData.find(a => a.yr === activeYear);
          const totalProfit = filtered.reduce((s, d) => s + d.profit, 0);
          const endBal      = filtered[filtered.length - 1]?.balance || 0;
          return (
            <div style={{ display: "grid", gridTemplateColumns: COL, padding: "12px 24px 12px 27px", background: BG_DARK, borderTop: `1px solid ${BORDER_L}`, alignItems: "center" }}>
              <span style={{ color: "#606878", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {activeYear} Total
              </span>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: clr(ann?.ret || 0), fontWeight: 900, fontSize: 14, fontFamily: "'Courier New', monospace" }}>
                  {ann ? fmtPct(ann.ret) : "—"}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: clr(totalProfit), fontWeight: 700, fontSize: 12, fontFamily: "'Courier New', monospace" }}>
                  {totalProfit >= 0 ? "+" : "−"}{fmtUSDT(Math.abs(totalProfit))}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "#808898", fontSize: 12, fontFamily: "'Courier New', monospace" }}>
                  {fmtUSDT(endBal)}
                </span>
              </div>
              <div />
            </div>
          );
        })()}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <p style={{ color: "#303848", fontSize: 10, marginTop: 20, textAlign: "center", lineHeight: 2, letterSpacing: 0.3 }}>
        All figures in USDT · Binance API (Read-Only) · Auto-refreshed every 45s · 100% reinvest strategy — no withdrawals during this period<br />
        Past performance is not indicative of future results · Automated trading carries risk including partial or total loss of capital
      </p>
    </div>
  );
}
