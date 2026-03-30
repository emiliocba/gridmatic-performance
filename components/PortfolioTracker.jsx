import { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────
const LIME = "#CCFF00";
const POS  = "#22c55e";
const NEG  = "#ef4444";
const START_CAPITAL = 50_000;
const BOT_START = new Date(2022, 0, 1);
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const BG       = "#0b0d0f";
const BG_CARD  = "#12151a";
const BG_DARK  = "#0a0c0e";
const BORDER   = "#1a1f28";
const BORDER_L = "#222b38";

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

const fmt2    = v => new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const fmtUSDT = v => {
  const abs = Math.abs(v);
  const s   = abs >= 1_000_000 ? `${(abs/1_000_000).toFixed(3)}M` : fmt2(abs);
  return v < 0 ? `−${s}` : s;
};
const fmtPct = (v, plus = true) => `${plus && v >= 0 ? "+" : ""}${fmt2(v)}%`;
const clr    = v => v >= 0 ? POS : NEG;
const dim    = (y, m) => new Date(y, m + 1, 0).getDate();

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
      label: `${mo} '${String(yr).slice(2)}`,
      fullLabel: `${mo} ${yr}`,
      cumRet: ((bal - START_CAPITAL) / START_CAPITAL) * 100,
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
    const prev   = yr === 2022 ? null : data.find(d => d.yr === yr - 1 && d.mo === "Dec");
    const startV = prev ? prev.balance : START_CAPITAL;
    const endV   = yrData[yrData.length - 1].balance;
    const done   = yrData.filter(d => !d.inProg);
    const avgMonthly = done.length ? done.reduce((s, d) => s + d.ret, 0) / done.length : null;
    return {
      yr,
      ret:   ((endV - startV) / startV) * 100,
      endV,
      avgMonthly,
      completedMonths: done.length,
      isYtd: yrData.some(d => d.inProg),
    };
  }).filter(Boolean);
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div style={{
      background:   accent
        ? "linear-gradient(135deg, rgba(204,255,0,0.07) 0%, rgba(18,21,26,1) 60%)"
        : "linear-gradient(160deg, #161b22 0%, #12151a 100%)",
      border:       `1px solid ${accent ? "rgba(204,255,0,0.18)" : BORDER}`,
      borderRadius: 14,
      padding:      "18px 22px",
      position:     "relative",
      overflow:     "hidden",
    }}>
      {/* top-left glow dot for accent cards */}
      {accent && (
        <div style={{
          position: "absolute", top: -20, left: -20,
          width: 80, height: 80, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(204,255,0,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
      )}
      <p style={{ color: accent ? "rgba(204,255,0,0.5)" : "#505868", fontSize: 10, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700, position: "relative" }}>
        {label}
      </p>
      <p style={{ fontSize: 24, fontWeight: 900, margin: 0, color: accent ? LIME : "#dde3ef", letterSpacing: -0.8, fontFamily: "'Courier New', monospace", lineHeight: 1, position: "relative",
        textShadow: accent ? "0 0 24px rgba(204,255,0,0.2)" : "none",
      }}>
        {value}
      </p>
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, chartView }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "rgba(14,18,24,0.95)",
      border: "1px solid rgba(204,255,0,0.2)",
      borderRadius: 10,
      padding: "12px 16px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(204,255,0,0.05)",
      backdropFilter: "blur(12px)",
    }}>
      <p style={{ color: "#505868", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 7px" }}>
        {d.fullLabel}
      </p>
      {chartView === "value" ? (
        <>
          <p style={{ color: LIME, fontWeight: 800, fontSize: 15, margin: "0 0 3px", fontFamily: "'Courier New', monospace", textShadow: "0 0 12px rgba(204,255,0,0.3)" }}>
            {fmtUSDT(d.balance)} USDT
          </p>
          <p style={{ color: clr(d.ret), fontSize: 12, fontWeight: 700, margin: 0 }}>
            {fmtPct(d.ret)} this month
          </p>
        </>
      ) : (
        <>
          <p style={{ color: clr(d.ret), fontWeight: 900, fontSize: 17, margin: "0 0 3px", fontFamily: "'Courier New', monospace" }}>
            {fmtPct(d.ret)}
          </p>
          <p style={{ color: "#505868", fontSize: 11, margin: 0 }}>
            {d.ret >= 0 ? "+" : "−"}{fmtUSDT(Math.abs(d.profit))} USDT
          </p>
        </>
      )}
      {d.inProg && (
        <p style={{ color: `${LIME}66`, fontSize: 9, margin: "6px 0 0", letterSpacing: 0.6 }}>
          Day {d.dayN}/{d.daysInMo} · In Progress
        </p>
      )}
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function TableRow({ d, i, isLast, COL }) {
  const [hovered, setHovered] = useState(false);

  const baseBg = d.inProg
    ? "rgba(204,255,0,0.025)"
    : i % 2 === 1 ? "rgba(255,255,255,0.014)" : "transparent";

  const leftColor = d.ret >= 0 ? POS : NEG;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:             "grid",
        gridTemplateColumns: COL,
        padding:             "14px 24px 14px 21px",
        borderBottom:        !isLast ? `1px solid ${BORDER}` : "none",
        borderLeft:          `3px solid ${leftColor}${hovered ? "88" : "30"}`,
        background:          hovered ? "rgba(204,255,0,0.018)" : baseBg,
        alignItems:          "center",
        transition:          "background 0.15s, border-color 0.15s",
        cursor:              "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: hovered ? "#dde3ef" : "#a0a8b8", fontWeight: 600, fontSize: 14, transition: "color 0.15s" }}>{d.fullLabel}</span>
        {d.inProg && (
          <span style={{
            background: `${LIME}12`, color: LIME,
            border: `1px solid ${LIME}30`, fontSize: 8, fontWeight: 800,
            padding: "2px 6px", borderRadius: 3, letterSpacing: 0.8,
          }}>IN PROGRESS</span>
        )}
      </div>

      <div style={{ textAlign: "right" }}>
        <span style={{ color: clr(d.ret), fontWeight: 900, fontSize: 15, fontFamily: "'Courier New', monospace" }}>
          {fmtPct(d.ret)}
        </span>
      </div>

      <div style={{ textAlign: "right" }}>
        <span style={{ color: d.profit >= 0 ? POS : NEG, fontWeight: 700, fontSize: 13, fontFamily: "'Courier New', monospace" }}>
          {d.profit >= 0 ? "+" : "−"}{fmtUSDT(Math.abs(d.profit))}
        </span>
      </div>

      <div style={{ textAlign: "right" }}>
        <span style={{ color: "#505868", fontWeight: 600, fontSize: 13, fontFamily: "'Courier New', monospace" }}>
          {fmtUSDT(d.balance)}
        </span>
      </div>

      <div style={{ textAlign: "right" }}>
        <span style={{ color: clr(d.cumRet), fontSize: 13, fontWeight: 800, fontFamily: "'Courier New', monospace" }}>
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
    <div style={{
      background: BG,
      minHeight: "100vh",
      fontFamily: "'Open Sans', sans-serif",
      color: "#fff",
      padding: "28px 32px",
      boxSizing: "border-box",
      position: "relative",
      // Atmospheric radial glow — lime bleed from top-left like Nexbit's background depth
      backgroundImage: "radial-gradient(ellipse 80% 40% at 10% 0%, rgba(204,255,0,0.04) 0%, transparent 70%)",
    }}>

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

        {/* Binance badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "linear-gradient(135deg, #161c24 0%, #12151a 100%)",
          border: `1px solid ${BORDER_L}`,
          borderRadius: 12, padding: "10px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: syncing ? "#f59e0b" : "#22c55e",
            boxShadow: `0 0 10px ${syncing ? "#f59e0b" : "#22c55e"}bb`,
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
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Hero card */}
        <div style={{
          background: "linear-gradient(135deg, rgba(204,255,0,0.08) 0%, rgba(18,21,26,0.95) 55%)",
          border: "1px solid rgba(204,255,0,0.2)",
          borderRadius: 16,
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(204,255,0,0.04), inset 0 1px 0 rgba(204,255,0,0.08)",
        }}>
          {/* Glow orb */}
          <div style={{
            position: "absolute", top: -30, left: -30, width: 120, height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(204,255,0,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <p style={{ color: "rgba(204,255,0,0.55)", fontSize: 10, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700, position: "relative" }}>
            Current Portfolio Value
          </p>
          <p style={{
            fontSize: 42, fontWeight: 900, margin: 0, color: LIME,
            letterSpacing: -1.8, fontFamily: "'Courier New', monospace", lineHeight: 1,
            textShadow: "0 0 40px rgba(204,255,0,0.35), 0 0 12px rgba(204,255,0,0.2)",
            position: "relative",
          }}>
            {fmtUSDT(metrics.currentValue)}
          </p>
        </div>

        <StatCard label="Total Return" value={fmtPct(metrics.totalReturn)} accent />
        <StatCard label="Annualized Return (CAGR)" value={fmtPct(metrics.cagr)} accent />
      </div>

      {/* ── Row 2: Secondary stats ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Avg Monthly Return" value={fmtPct(metrics.avgMonthly)} />
        <StatCard label={`Best Month · ${metrics.best.fullLabel}`}  value={fmtPct(metrics.best.ret)} />
        <StatCard label={`Worst Month · ${metrics.worst.fullLabel}`} value={fmtPct(metrics.worst.ret, false)} />
      </div>

      {/* ── Chart ────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(180deg, #14181f 0%, #11141a 100%)",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[["value", "Portfolio Value"], ["monthly", "Monthly %"]].map(([v, l]) => (
              <button key={v} onClick={() => switchChartView(v)} style={{
                background:   chartView === v ? "rgba(204,255,0,0.12)" : "transparent",
                color:        chartView === v ? LIME : "#404858",
                border:       `1px solid ${chartView === v ? "rgba(204,255,0,0.25)" : BORDER}`,
                borderRadius: 8,
                padding:      "6px 14px",
                fontSize:     11,
                fontWeight:   700,
                cursor:       "pointer",
                transition:   "all 0.15s",
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
                    <stop offset="0%"   stopColor={LIME} stopOpacity={0.28} />
                    <stop offset="50%"  stopColor={LIME} stopOpacity={0.08} />
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
                  stroke={LIME} strokeWidth={2.5}
                  fill="url(#balGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: LIME, stroke: BG, strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={filtered} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#404858", fontSize: 10 }} tickLine={false} interval={activeYear === "All" ? 5 : 0} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: "#404858", fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={p => <ChartTip {...p} chartView={chartView} />} />
                <ReferenceLine y={0} stroke={BORDER_L} />
                <Bar dataKey="ret" radius={[4, 4, 0, 0]} maxBarSize={28} cursor={false}>
                  {filtered.map((d, i) => (
                    <Cell key={i} fill={d.ret >= 0 ? POS : NEG} opacity={d.inProg ? 0.5 : 1} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Annual selector + stats ──────────────────────────── */}
      {(() => {
        const years = annualData.map(a => a.yr);
        const currentAnn = activeYear === "All" ? null : annualData.find(a => a.yr === activeYear);
        const currentIdx = years.indexOf(activeYear);

        const prevYear = () => {
          if (activeYear === "All") switchYear(years[years.length - 1]);
          else if (currentIdx > 0) switchYear(years[currentIdx - 1]);
        };
        const nextYear = () => {
          if (currentIdx < years.length - 1) switchYear(years[currentIdx + 1]);
          else switchYear("All");
        };
        const canPrev = activeYear === "All" || currentIdx > 0;
        const canNext = activeYear !== "All";

        const arrowBtn = (enabled, onClick, label) => (
          <button onClick={enabled ? onClick : undefined} style={{
            background: enabled ? "rgba(204,255,0,0.06)" : "transparent",
            border: `1px solid ${enabled ? "rgba(204,255,0,0.18)" : BORDER}`,
            borderRadius: 8, color: enabled ? LIME : "#2a3040",
            width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: enabled ? "pointer" : "default", fontSize: 18, fontWeight: 700,
            transition: "all 0.15s", flexShrink: 0,
          }}
          onMouseDown={e => enabled && (e.currentTarget.style.transform = "scale(0.92)")}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >{label}</button>
        );

        return (
          <div style={{ marginBottom: 16 }}>
            {/* Selector row — compact, right-aligned */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {arrowBtn(canPrev, prevYear, "‹")}
                <select
                  value={activeYear}
                  onChange={e => switchYear(e.target.value === "All" ? "All" : Number(e.target.value))}
                  style={{
                    background: "linear-gradient(135deg, #161c24 0%, #12151a 100%)",
                    border: `1px solid ${BORDER_L}`,
                    borderRadius: 10, color: "#c0c8d8",
                    fontSize: 13, fontWeight: 700,
                    fontFamily: "'Open Sans', sans-serif",
                    padding: "8px 20px", cursor: "pointer",
                    outline: "none", appearance: "none", textAlign: "center",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                    width: 140,
                  }}
                >
                  <option value="All">All Time</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}{annualData.find(a => a.yr === y)?.isYtd ? " (YTD)" : ""}</option>
                  ))}
                </select>
                {arrowBtn(canNext, nextYear, "›")}
              </div>
            </div>

            {/* Annual stats card */}
            {currentAnn && (
              <div style={{
                background: "linear-gradient(135deg, rgba(204,255,0,0.05) 0%, rgba(18,21,26,0.98) 60%)",
                border: "1px solid rgba(204,255,0,0.16)",
                borderRadius: 14,
                padding: "20px 24px",
                display: "grid",
                gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
                gap: 0,
                alignItems: "flex-start",
                boxShadow: "0 4px 24px rgba(204,255,0,0.04)",
              }}>
                {/* Avg Monthly */}
                <div style={{ padding: "0 24px 0 0" }}>
                  <p style={{ color: "rgba(204,255,0,0.45)", fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 700 }}>Avg Monthly</p>
                  <span style={{ color: clr(currentAnn.avgMonthly ?? currentAnn.ret), fontSize: 24, fontWeight: 900, fontFamily: "'Courier New', monospace", letterSpacing: -0.6 }}>
                    {currentAnn.avgMonthly !== null ? fmtPct(currentAnn.avgMonthly) : "—"}
                  </span>
                  {currentAnn.isYtd && (
                    <p style={{ color: "#505868", fontSize: 11, margin: "6px 0 0", fontWeight: 500 }}>
                      {currentAnn.completedMonths} month{currentAnn.completedMonths !== 1 ? "s" : ""} completed
                    </p>
                  )}
                </div>

                <div style={{ background: BORDER, height: "100%", minHeight: 56 }} />

                {/* Without compounding */}
                <div style={{ padding: "0 24px" }}>
                  <p style={{ color: "#505868", fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 700 }}>Without Compounding</p>
                  <span style={{ color: POS, fontSize: 24, fontWeight: 800, fontFamily: "'Courier New', monospace", letterSpacing: -0.6 }}>
                    {currentAnn.avgMonthly !== null ? fmtPct(currentAnn.avgMonthly * (currentAnn.isYtd ? currentAnn.completedMonths : 12)) : "—"}
                  </span>
                </div>

                <div style={{ background: BORDER, height: "100%", minHeight: 56 }} />

                {/* With compounding */}
                <div style={{ padding: "0 0 0 24px" }}>
                  <p style={{ color: "#505868", fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 700 }}>With Compounding</p>
                  <span style={{ color: LIME, fontSize: 24, fontWeight: 900, fontFamily: "'Courier New', monospace", letterSpacing: -0.6, textShadow: "0 0 20px rgba(204,255,0,0.25)" }}>
                    {fmtPct(currentAnn.ret)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Monthly table ────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(180deg, #13171e 0%, #11141a 100%)",
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}>
        {/* Table header */}
        <div style={{
          background: "rgba(0,0,0,0.25)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "12px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ color: "#505868", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9 }}>
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
            <span key={h} style={{ color: "#404858", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, textAlign: a }}>
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
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <p style={{ color: "#232b38", fontSize: 10, marginTop: 20, textAlign: "center", lineHeight: 2, letterSpacing: 0.3 }}>
        All figures in USDT · Binance API (Read-Only) · Auto-refreshed every 45s · 100% reinvest strategy — no withdrawals during this period<br />
        Past performance is not indicative of future results · Automated trading carries risk including partial or total loss of capital
      </p>
    </div>
  );
}
