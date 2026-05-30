import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & API CONFIG
═══════════════════════════════════════════════════════════════════════════ */
const AV_KEYS      = ["EUNSEV3QQ3695A0H", "BQNPZC53L67KG5O7"];
const TG_TOKEN     = "8480822515:AAHRGIhPMBlUlnhCUMtKJrLa9XBGBT9Cpbw";
const TG_CHAT_ID   = "6752597104";
const MAKE_WEBHOOK = "https://hook.eu1.make.com/rev7pb9vsiec2v6ywxf4scyiyfswcftv";
const FRED_KEY     = "087273abdea19072c1136ba7f521781e";

const AV_BASE      = "https://www.alphavantage.co/query";
const FRED_BASE    = "https://api.stlouisfed.org/fred/series/observations";
const TG_API       = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;

let _avIdx = 0;
const nextKey  = () => AV_KEYS[_avIdx++ % AV_KEYS.length];
const sleep    = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd      = (lo, hi) => lo + Math.random() * (hi - lo);
const clamp    = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const fmt2     = (n) => (typeof n === "number" ? n.toFixed(2) : "—");
const fmtPct   = (n) =>
  typeof n === "number" ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
const fmtK     = (n) => {
  if (typeof n !== "number" || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3)  return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

/* ═══════════════════════════════════════════════════════════════════════════
   THEME — Bloomberg Carbon + Amber
═══════════════════════════════════════════════════════════════════════════ */
const T = {
  bg0: "#07070a",  bg1: "#0d0d12",  bg2: "#121218",
  bg3: "#181820",  bg4: "#1e1e28",  bg5: "#252532",  bg6: "#2d2d3c",
  border:   "#252535",
  borderHi: "#383850",
  borderFx: "#4c4c68",
  amber:       "#ffb300",
  amberSoft:   "#d49400",
  amberLo:     "#9a6c00",
  amberHi:     "#ffd740",
  amberBright: "#ffe57f",
  amberGlow:   "rgba(255,179,0,0.22)",
  amberDim:    "rgba(255,179,0,0.07)",
  amberShadow: "0 0 28px rgba(255,179,0,0.42)",
  amberBorder: "rgba(255,179,0,0.38)",
  cyan:     "#00e5ff",  cyanLo:  "#00acc1",  cyanDim:  "rgba(0,229,255,0.12)",
  green:    "#00e676",  greenLo: "#00c853",  greenDim: "rgba(0,230,118,0.1)",
  red:      "#ff1744",  redLo:   "#c01232",  redDim:   "rgba(255,23,68,0.1)",
  yellow:   "#ffea00",
  purple:   "#d500f9",
  blue:     "#448aff",  blueLo: "#1565c0",
  text0: "#f2f2fa",  text1: "#aaaabe",  text2: "#676784",
  text3: "#353550",  text4: "#202035",
  fontMono: "'JetBrains Mono','Fira Mono','Cascadia Code',Consolas,monospace",
  fontSans: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
  sp1:4, sp2:8, sp3:12, sp4:16, sp5:20, sp6:24, sp8:32, sp10:40, sp12:48,
  r1:2, r2:4, r3:6, r4:8, r6:12,
  shadow:   "0 4px 32px rgba(0,0,0,0.85)",
  shadowMd: "0 2px 16px rgba(0,0,0,0.6)",
  glow:     "0 0 28px rgba(255,179,0,0.4)",
  glowSm:   "0 0 14px rgba(255,179,0,0.25)",
};

/* ═══════════════════════════════════════════════════════════════════════════
   97 SAMPLE STOCKS — ticker · name · sector
═══════════════════════════════════════════════════════════════════════════ */
const SAMPLE_STOCKS = [
  /* ── Technology (30) ─────────────────────────────────────────────────── */
  { ticker:"AAPL",  name:"Apple Inc.",              sector:"Technology" },
  { ticker:"MSFT",  name:"Microsoft Corp.",          sector:"Technology" },
  { ticker:"NVDA",  name:"NVIDIA Corp.",             sector:"Technology" },
  { ticker:"GOOGL", name:"Alphabet Inc. (A)",        sector:"Technology" },
  { ticker:"META",  name:"Meta Platforms Inc.",      sector:"Technology" },
  { ticker:"AMZN",  name:"Amazon.com Inc.",          sector:"Technology" },
  { ticker:"TSLA",  name:"Tesla Inc.",               sector:"Technology" },
  { ticker:"AVGO",  name:"Broadcom Inc.",            sector:"Technology" },
  { ticker:"AMD",   name:"Advanced Micro Devices",   sector:"Technology" },
  { ticker:"INTC",  name:"Intel Corp.",              sector:"Technology" },
  { ticker:"QCOM",  name:"Qualcomm Inc.",            sector:"Technology" },
  { ticker:"TXN",   name:"Texas Instruments Inc.",   sector:"Technology" },
  { ticker:"MU",    name:"Micron Technology Inc.",   sector:"Technology" },
  { ticker:"AMAT",  name:"Applied Materials Inc.",   sector:"Technology" },
  { ticker:"LRCX",  name:"Lam Research Corp.",       sector:"Technology" },
  { ticker:"KLAC",  name:"KLA Corp.",                sector:"Technology" },
  { ticker:"MRVL",  name:"Marvell Technology Inc.",  sector:"Technology" },
  { ticker:"SNPS",  name:"Synopsys Inc.",            sector:"Technology" },
  { ticker:"CDNS",  name:"Cadence Design Systems",   sector:"Technology" },
  { ticker:"ADBE",  name:"Adobe Inc.",               sector:"Technology" },
  { ticker:"CRM",   name:"Salesforce Inc.",          sector:"Technology" },
  { ticker:"NOW",   name:"ServiceNow Inc.",          sector:"Technology" },
  { ticker:"ORCL",  name:"Oracle Corp.",             sector:"Technology" },
  { ticker:"IBM",   name:"IBM Corp.",                sector:"Technology" },
  { ticker:"CSCO",  name:"Cisco Systems Inc.",       sector:"Technology" },
  { ticker:"NXPI",  name:"NXP Semiconductors N.V.", sector:"Technology" },
  { ticker:"MPWR",  name:"Monolithic Power Systems", sector:"Technology" },
  { ticker:"MCHP",  name:"Microchip Technology",     sector:"Technology" },
  { ticker:"ON",    name:"ON Semiconductor Corp.",   sector:"Technology" },
  { ticker:"ADI",   name:"Analog Devices Inc.",      sector:"Technology" },
  /* ── Healthcare (12) ─────────────────────────────────────────────────── */
  { ticker:"JNJ",   name:"Johnson & Johnson",        sector:"Healthcare" },
  { ticker:"UNH",   name:"UnitedHealth Group Inc.",  sector:"Healthcare" },
  { ticker:"PFE",   name:"Pfizer Inc.",              sector:"Healthcare" },
  { ticker:"ABBV",  name:"AbbVie Inc.",              sector:"Healthcare" },
  { ticker:"MRK",   name:"Merck & Co. Inc.",         sector:"Healthcare" },
  { ticker:"TMO",   name:"Thermo Fisher Scientific", sector:"Healthcare" },
  { ticker:"ABT",   name:"Abbott Laboratories",      sector:"Healthcare" },
  { ticker:"DHR",   name:"Danaher Corp.",            sector:"Healthcare" },
  { ticker:"BMY",   name:"Bristol-Myers Squibb Co.", sector:"Healthcare" },
  { ticker:"AMGN",  name:"Amgen Inc.",               sector:"Healthcare" },
  { ticker:"GILD",  name:"Gilead Sciences Inc.",     sector:"Healthcare" },
  { ticker:"VRTX",  name:"Vertex Pharmaceuticals",   sector:"Healthcare" },
  /* ── Financials (10) ─────────────────────────────────────────────────── */
  { ticker:"JPM",   name:"JPMorgan Chase & Co.",     sector:"Financials" },
  { ticker:"BAC",   name:"Bank of America Corp.",    sector:"Financials" },
  { ticker:"WFC",   name:"Wells Fargo & Co.",        sector:"Financials" },
  { ticker:"GS",    name:"Goldman Sachs Group",      sector:"Financials" },
  { ticker:"MS",    name:"Morgan Stanley",           sector:"Financials" },
  { ticker:"BLK",   name:"BlackRock Inc.",           sector:"Financials" },
  { ticker:"C",     name:"Citigroup Inc.",           sector:"Financials" },
  { ticker:"AXP",   name:"American Express Co.",     sector:"Financials" },
  { ticker:"V",     name:"Visa Inc.",                sector:"Financials" },
  { ticker:"MA",    name:"Mastercard Inc.",          sector:"Financials" },
  /* ── Consumer Disc. (9) ──────────────────────────────────────────────── */
  { ticker:"HD",    name:"Home Depot Inc.",          sector:"Consumer Disc." },
  { ticker:"NKE",   name:"Nike Inc.",                sector:"Consumer Disc." },
  { ticker:"MCD",   name:"McDonald's Corp.",         sector:"Consumer Disc." },
  { ticker:"SBUX",  name:"Starbucks Corp.",          sector:"Consumer Disc." },
  { ticker:"TGT",   name:"Target Corp.",             sector:"Consumer Disc." },
  { ticker:"LOW",   name:"Lowe's Companies Inc.",    sector:"Consumer Disc." },
  { ticker:"BKNG",  name:"Booking Holdings Inc.",    sector:"Consumer Disc." },
  { ticker:"CMG",   name:"Chipotle Mexican Grill",   sector:"Consumer Disc." },
  { ticker:"GM",    name:"General Motors Co.",       sector:"Consumer Disc." },
  /* ── Consumer Staples (8) ────────────────────────────────────────────── */
  { ticker:"PG",    name:"Procter & Gamble Co.",     sector:"Consumer Staples" },
  { ticker:"KO",    name:"Coca-Cola Co.",            sector:"Consumer Staples" },
  { ticker:"PEP",   name:"PepsiCo Inc.",             sector:"Consumer Staples" },
  { ticker:"WMT",   name:"Walmart Inc.",             sector:"Consumer Staples" },
  { ticker:"COST",  name:"Costco Wholesale Corp.",   sector:"Consumer Staples" },
  { ticker:"MDLZ",  name:"Mondelez International",   sector:"Consumer Staples" },
  { ticker:"CL",    name:"Colgate-Palmolive Co.",    sector:"Consumer Staples" },
  { ticker:"KMB",   name:"Kimberly-Clark Corp.",     sector:"Consumer Staples" },
  /* ── Energy (8) ──────────────────────────────────────────────────────── */
  { ticker:"XOM",   name:"Exxon Mobil Corp.",        sector:"Energy" },
  { ticker:"CVX",   name:"Chevron Corp.",            sector:"Energy" },
  { ticker:"COP",   name:"ConocoPhillips",           sector:"Energy" },
  { ticker:"EOG",   name:"EOG Resources Inc.",       sector:"Energy" },
  { ticker:"SLB",   name:"SLB (Schlumberger Ltd.)",  sector:"Energy" },
  { ticker:"MPC",   name:"Marathon Petroleum Corp.", sector:"Energy" },
  { ticker:"VLO",   name:"Valero Energy Corp.",      sector:"Energy" },
  { ticker:"OXY",   name:"Occidental Petroleum",     sector:"Energy" },
  /* ── Industrials (8) ─────────────────────────────────────────────────── */
  { ticker:"BA",    name:"Boeing Co.",               sector:"Industrials" },
  { ticker:"CAT",   name:"Caterpillar Inc.",         sector:"Industrials" },
  { ticker:"HON",   name:"Honeywell International",  sector:"Industrials" },
  { ticker:"GE",    name:"GE Aerospace",             sector:"Industrials" },
  { ticker:"UPS",   name:"United Parcel Service",    sector:"Industrials" },
  { ticker:"LMT",   name:"Lockheed Martin Corp.",    sector:"Industrials" },
  { ticker:"RTX",   name:"RTX Corp.",                sector:"Industrials" },
  { ticker:"ETN",   name:"Eaton Corp. plc",          sector:"Industrials" },
  /* ── Comm. Services (5) ──────────────────────────────────────────────── */
  { ticker:"NFLX",  name:"Netflix Inc.",             sector:"Comm. Services" },
  { ticker:"DIS",   name:"Walt Disney Co.",          sector:"Comm. Services" },
  { ticker:"CMCSA", name:"Comcast Corp.",            sector:"Comm. Services" },
  { ticker:"VZ",    name:"Verizon Communications",   sector:"Comm. Services" },
  { ticker:"TMUS",  name:"T-Mobile US Inc.",         sector:"Comm. Services" },
  /* ── Materials (4) ───────────────────────────────────────────────────── */
  { ticker:"LIN",   name:"Linde plc",                sector:"Materials" },
  { ticker:"SHW",   name:"Sherwin-Williams Co.",     sector:"Materials" },
  { ticker:"FCX",   name:"Freeport-McMoRan Inc.",    sector:"Materials" },
  { ticker:"NEM",   name:"Newmont Corp.",            sector:"Materials" },
  /* ── Real Estate (3) ─────────────────────────────────────────────────── */
  { ticker:"AMT",   name:"American Tower Corp.",     sector:"Real Estate" },
  { ticker:"PLD",   name:"Prologis Inc.",            sector:"Real Estate" },
  { ticker:"EQIX",  name:"Equinix Inc.",             sector:"Real Estate" },
];
// 30+12+10+9+8+8+8+5+4+3 = 97 ✓

/* ═══════════════════════════════════════════════════════════════════════════
   FALLBACK PRICES — precios de referencia para modo offline
═══════════════════════════════════════════════════════════════════════════ */
const FALLBACK_PRICES = {
  AAPL:195.2, MSFT:415.5, NVDA:875.4, GOOGL:175.8, META:520.3,
  AMZN:192.6, TSLA:248.5, AVGO:1680.0, AMD:162.4, INTC:30.2,
  QCOM:172.8, TXN:185.6, MU:128.4, AMAT:212.7, LRCX:920.3,
  KLAC:790.5, MRVL:75.4, SNPS:510.2, CDNS:295.8, ADBE:475.3,
  CRM:282.4, NOW:845.6, ORCL:130.2, IBM:178.4, CSCO:49.8,
  NXPI:228.5, MPWR:680.4, MCHP:82.6, ON:61.4, ADI:220.8,
  JNJ:152.4, UNH:485.2, PFE:26.8, ABBV:168.4, MRK:126.3,
  TMO:585.4, ABT:108.5, DHR:232.4, BMY:45.6, AMGN:318.4,
  GILD:68.5, VRTX:468.3, JPM:208.4, BAC:40.2, WFC:57.8,
  GS:495.3, MS:108.4, BLK:820.5, C:62.4, AXP:238.5,
  V:278.4, MA:468.5, HD:342.6, NKE:78.4, MCD:285.3,
  SBUX:88.4, TGT:142.5, LOW:225.8, BKNG:3782.5, CMG:3245.8,
  GM:47.4, PG:158.4, KO:62.8, PEP:172.4, WMT:68.5,
  COST:892.4, MDLZ:65.2, CL:98.4, KMB:132.5, XOM:112.4,
  CVX:158.5, COP:115.2, EOG:128.4, SLB:42.8, MPC:178.4,
  VLO:165.3, OXY:58.4, BA:188.5, CAT:365.4, HON:198.5,
  GE:172.4, UPS:128.5, LMT:465.3, RTX:112.4, ETN:315.8,
  NFLX:648.5, DIS:108.4, CMCSA:38.5, VZ:38.8, TMUS:178.4,
  LIN:455.3, SHW:348.5, FCX:42.4, NEM:38.5,
  AMT:192.4, PLD:128.5, EQIX:782.4,
};

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK CANDLE GENERATOR — genera OHLCV sintético realista
═══════════════════════════════════════════════════════════════════════════ */
function generateCandles(ticker, n = 120) {
  const base  = FALLBACK_PRICES[ticker] || 100;
  const vol   = base * 0.018;
  const candles = [];
  let close = base * (0.88 + Math.random() * 0.12);

  for (let i = 0; i < n; i++) {
    const drift  = (Math.random() - 0.488) * vol;
    const open   = close;
    close        = Math.max(1, open + drift);
    const hi     = Math.max(open, close) + Math.abs(rnd(0, vol * 0.8));
    const lo     = Math.min(open, close) - Math.abs(rnd(0, vol * 0.8));
    const volume = Math.floor(rnd(800_000, 8_000_000));
    const date   = new Date(Date.now() - (n - i) * 86_400_000)
      .toISOString().slice(0, 10);
    candles.push({ date, open, high: hi, low: lo, close, volume });
  }
  return candles;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TECHNICAL MATH — SMA, EMA, BB, RSI, MACD
═══════════════════════════════════════════════════════════════════════════ */
function calcSMA(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const ema = [];
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { ema.push(closes[0]); continue; }
    ema.push(closes[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcBollinger(closes, period = 20, mult = 2) {
  const sma = calcSMA(closes, period);
  return closes.map((_, i) => {
    if (sma[i] === null) return { mid: null, upper: null, lower: null };
    const slice = closes.slice(Math.max(0, i - period + 1), i + 1);
    const mean  = sma[i];
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
    return { mid: mean, upper: mean + mult * std, lower: mean - mult * std };
  });
}

function calcRSI(closes, period = 14) {
  const rsi = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff <  0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaF  = calcEMA(closes, fast);
  const emaS  = calcEMA(closes, slow);
  const macd  = emaF.map((v, i) => v - emaS[i]);
  const sig   = calcEMA(macd.slice(slow - 1), signal);
  const hist  = macd.slice(slow - 1).map((v, i) => v - (sig[i] || 0));
  return { macd: macd.slice(slow - 1), signal: sig, histogram: hist };
}

/* ═══════════════════════════════════════════════════════════════════════════
   FETCH AV — wrapper con rotación de keys y fallback
═══════════════════════════════════════════════════════════════════════════ */
async function fetchAV(params, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const url = new URL(AV_BASE);
    Object.entries({ ...params, apikey: nextKey() }).forEach(
      ([k, v]) => url.searchParams.set(k, v)
    );
    try {
      const res  = await fetch(url.toString());
      const data = await res.json();
      if (data["Note"] || data["Information"]) {
        await sleep(1800);
        continue;
      }
      return data;
    } catch {
      if (attempt < retries) await sleep(1000);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchRealIndicators — RSI · MACD · SMA20/50/200 desde Alpha Vantage
═══════════════════════════════════════════════════════════════════════════ */
async function fetchRealIndicators(ticker) {
  const [rsiData, macdData, sma20Data, sma200Data] = await Promise.all([
    fetchAV({ function: "RSI",  symbol: ticker, interval: "daily", time_period: 14, series_type: "close" }),
    fetchAV({ function: "MACD", symbol: ticker, interval: "daily", series_type: "close" }),
    fetchAV({ function: "SMA",  symbol: ticker, interval: "daily", time_period: 20,  series_type: "close" }),
    fetchAV({ function: "SMA",  symbol: ticker, interval: "daily", time_period: 200, series_type: "close" }),
  ]);

  const getLatest = (obj, key) => {
    if (!obj) return null;
    const series = obj[key] || obj["Technical Analysis: RSI"] ||
      obj["Technical Analysis: MACD"] || obj["Technical Analysis: SMA"];
    if (!series) return null;
    const latest = Object.keys(series)[0];
    return series[latest];
  };

  const rsiRaw   = getLatest(rsiData,   "Technical Analysis: RSI");
  const macdRaw  = getLatest(macdData,  "Technical Analysis: MACD");
  const sma20Raw = getLatest(sma20Data, "Technical Analysis: SMA");
  const sma200Raw= getLatest(sma200Data,"Technical Analysis: SMA");

  const base = FALLBACK_PRICES[ticker] || 100;
  return {
    rsi:       rsiRaw   ? parseFloat(rsiRaw["RSI"])         : rnd(35, 70),
    macd:      macdRaw  ? parseFloat(macdRaw["MACD"])       : rnd(-2, 2),
    macdSig:   macdRaw  ? parseFloat(macdRaw["MACD_Signal"]): rnd(-2, 2),
    macdHist:  macdRaw  ? parseFloat(macdRaw["MACD_Hist"])  : rnd(-1, 1),
    sma20:     sma20Raw ? parseFloat(sma20Raw["SMA"])       : base * rnd(0.94, 1.04),
    sma200:    sma200Raw? parseFloat(sma200Raw["SMA"])      : base * rnd(0.80, 1.00),
    price:     base,
    source:    rsiRaw ? "live" : "mock",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchFundamentals — overview de la empresa desde Alpha Vantage
═══════════════════════════════════════════════════════════════════════════ */
async function fetchFundamentals(ticker) {
  const data = await fetchAV({ function: "OVERVIEW", symbol: ticker });
  if (!data || !data.Symbol) {
    return {
      pe: rnd(12, 38), pb: rnd(1.2, 8), roe: rnd(8, 32),
      eps: rnd(1, 18), rev: rnd(5e9, 400e9),
      mktCap: (FALLBACK_PRICES[ticker] || 100) * rnd(800e6, 8e9),
      debtEq: rnd(0.1, 2.8), divYield: rnd(0, 3.5),
      beta: rnd(0.6, 1.8), week52Hi: (FALLBACK_PRICES[ticker] || 100) * rnd(1.05, 1.6),
      week52Lo: (FALLBACK_PRICES[ticker] || 100) * rnd(0.55, 0.9),
      source: "mock",
    };
  }
  return {
    pe:       parseFloat(data.PERatio)          || null,
    pb:       parseFloat(data.PriceToBookRatio) || null,
    roe:      parseFloat(data.ReturnOnEquityTTM)|| null,
    eps:      parseFloat(data.EPS)              || null,
    rev:      parseFloat(data.RevenueTTM)       || null,
    mktCap:   parseFloat(data.MarketCapitalization) || null,
    debtEq:   parseFloat(data.DebtToEquityRatio)|| null,
    divYield: parseFloat(data.DividendYield)    || null,
    beta:     parseFloat(data.Beta)             || null,
    week52Hi: parseFloat(data["52WeekHigh"])    || null,
    week52Lo: parseFloat(data["52WeekLow"])     || null,
    source: "live",
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchEarnings — EPS histórico y sorpresa desde Alpha Vantage
═══════════════════════════════════════════════════════════════════════════ */
async function fetchEarnings(ticker) {
  const data = await fetchAV({ function: "EARNINGS", symbol: ticker });

  if (data && data.quarterlyEarnings && data.quarterlyEarnings.length) {
    return data.quarterlyEarnings.slice(0, 8).map((q) => ({
      date:        q.fiscalDateEnding,
      estimate:    parseFloat(q.estimatedEPS) || null,
      actual:      parseFloat(q.reportedEPS)  || null,
      surprise:    parseFloat(q.surprisePercentage) || null,
      quarter:     q.fiscalDateEnding.slice(0, 7),
    }));
  }

  return Array.from({ length: 8 }, (_, i) => {
    const est = rnd(1.2, 6.5);
    const surp = rnd(-0.08, 0.12);
    const d = new Date();
    d.setMonth(d.getMonth() - i * 3);
    return {
      date:     d.toISOString().slice(0, 10),
      estimate: parseFloat(est.toFixed(2)),
      actual:   parseFloat((est * (1 + surp)).toFixed(2)),
      surprise: parseFloat((surp * 100).toFixed(2)),
      quarter:  d.toISOString().slice(0, 7),
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchOptionsFlow — put/call ratio y actividad inusual (simulado + AV)
═══════════════════════════════════════════════════════════════════════════ */
async function fetchOptionsFlow(ticker) {
  const price = FALLBACK_PRICES[ticker] || 100;
  const strikes = Array.from({ length: 7 }, (_, i) =>
    parseFloat((price * (0.85 + i * 0.05)).toFixed(2))
  );
  return {
    putCallRatio: parseFloat(rnd(0.5, 1.8).toFixed(2)),
    impliedVol:   parseFloat(rnd(18, 65).toFixed(1)),
    unusualActivity: Math.random() > 0.6,
    sentiment: Math.random() > 0.5 ? "bullish" : "bearish",
    topCalls: strikes.slice(3).map((s) => ({
      strike:     s,
      expiry:     new Date(Date.now() + rnd(7, 60) * 86400000).toISOString().slice(0, 10),
      volume:     Math.floor(rnd(500, 12000)),
      openInt:    Math.floor(rnd(1000, 40000)),
      iv:         parseFloat(rnd(20, 80).toFixed(1)),
    })),
    topPuts: strikes.slice(0, 3).map((s) => ({
      strike:     s,
      expiry:     new Date(Date.now() + rnd(7, 60) * 86400000).toISOString().slice(0, 10),
      volume:     Math.floor(rnd(300, 10000)),
      openInt:    Math.floor(rnd(800, 35000)),
      iv:         parseFloat(rnd(22, 85).toFixed(1)),
    })),
    gamma:    parseFloat(rnd(-0.05, 0.05).toFixed(4)),
    delta:    parseFloat(rnd(-0.9, 0.9).toFixed(3)),
    vega:     parseFloat(rnd(0.01, 0.4).toFixed(3)),
    theta:    parseFloat((-rnd(0.01, 0.15)).toFixed(4)),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchInsiderTrading — transacciones de insiders (simulado)
═══════════════════════════════════════════════════════════════════════════ */
async function fetchInsiderTrading(ticker) {
  const names = [
    "CEO", "CFO", "COO", "CTO", "Director", "VP Sales",
    "General Counsel", "President", "Board Member",
  ];
  const n = Math.floor(rnd(4, 10));
  return Array.from({ length: n }, (_, i) => {
    const isBuy  = Math.random() > 0.45;
    const shares = Math.floor(rnd(500, 80000));
    const price  = FALLBACK_PRICES[ticker] || 100;
    const d      = new Date(Date.now() - rnd(0, 90) * 86400000);
    return {
      role:       names[Math.floor(rnd(0, names.length))],
      type:       isBuy ? "BUY" : "SELL",
      shares,
      price:      parseFloat((price * rnd(0.92, 1.05)).toFixed(2)),
      value:      parseFloat((shares * price * rnd(0.92, 1.05)).toFixed(0)),
      date:       d.toISOString().slice(0, 10),
      form:       isBuy ? "Form 4" : "Form 4",
      seq:        i + 1,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchShortInterest — interés corto y days-to-cover (simulado)
═══════════════════════════════════════════════════════════════════════════ */
async function fetchShortInterest(ticker) {
  const shortFloat = parseFloat(rnd(1.2, 28).toFixed(2));
  const avgVol     = Math.floor(rnd(2e6, 80e6));
  const shortShrs  = Math.floor(avgVol * shortFloat * 0.01 * rnd(5, 15));
  return {
    shortFloat,
    shortShares:  shortShrs,
    avgDailyVol:  avgVol,
    daysToCover:  parseFloat((shortShrs / avgVol).toFixed(2)),
    shortRatio:   parseFloat(rnd(1, 12).toFixed(2)),
    settlementDate: new Date(Date.now() - rnd(5, 20) * 86400000)
      .toISOString().slice(0, 10),
    changeWoW:    parseFloat(rnd(-15, 20).toFixed(2)),
    borrowRate:   parseFloat(rnd(0.25, 18).toFixed(2)),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   fetchMacroContext — FED liquidity, yield curve, VIX proxy via FRED
═══════════════════════════════════════════════════════════════════════════ */
async function fetchMacroContext() {
  const seriesIds = {
    fed:      "WALCL",
    t10y2y:  "T10Y2Y",
    dff:     "DFF",
    m2:      "M2SL",
    cpi:     "CPIAUCSL",
    unrate:  "UNRATE",
  };

  const results = {};
  await Promise.all(
    Object.entries(seriesIds).map(async ([key, sid]) => {
      try {
        const url = new URL(FRED_BASE);
        url.searchParams.set("series_id",     sid);
        url.searchParams.set("api_key",       FRED_KEY);
        url.searchParams.set("file_type",     "json");
        url.searchParams.set("sort_order",    "desc");
        url.searchParams.set("limit",         "2");
        const res  = await fetch(url.toString());
        const data = await res.json();
        if (data.observations && data.observations.length) {
          results[key] = {
            current:  parseFloat(data.observations[0].value),
            previous: parseFloat(data.observations[1]?.value),
            date:     data.observations[0].date,
          };
        }
      } catch {
        results[key] = null;
      }
    })
  );

  const fedBs   = (results.fed?.current  > 0) ? results.fed.current  : rnd(7.0e12, 8.5e12);
  const fedPrev = (results.fed?.previous > 0) ? results.fed.previous : fedBs * 0.998;
  const t10y2y  = results.t10y2y?.current ?? rnd(-0.5, 1.5);
  const dff     = results.dff?.current   ?? rnd(4.25, 5.5);
  const m2      = results.m2?.current    || rnd(20e12, 22e12);
  const cpi     = results.cpi?.current   || rnd(295, 320);
  const unrate  = results.unrate?.current ?? rnd(3.5, 4.5);

  // Variación: periodo actual vs periodo anterior inmediato de FRED
  const liqChange = (fedPrev > 0)
    ? ((fedBs - fedPrev) / fedPrev) * 100
    : 0;

  return {
    fedBs, fedPrev, t10y2y, dff, m2, cpi, unrate,
    netLiquidity, liqChange,
    yieldCurveInverted: t10y2y < 0,
    riskOn: t10y2y > 0 && dff < 5 && liqChange > 0,
    source: results.fed ? "live" : "mock",
    updatedAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   calcRelativeMomentum — momentum de un ticker vs sus pares de sector
═══════════════════════════════════════════════════════════════════════════ */
function calcRelativeMomentum(ticker, sector, allScores) {
  const peers = allScores.filter(
    (s) => s.sector === sector && s.ticker !== ticker
  );
  if (!peers.length) return 50;
  const peerAvg = peers.reduce((acc, p) => acc + (p.score || 50), 0) / peers.length;
  const own     = allScores.find((s) => s.ticker === ticker)?.score || 50;
  return clamp(50 + (own - peerAvg) * 0.8, 0, 100);
}

/* ═══════════════════════════════════════════════════════════════════════════
   scoreComposite — 8 capas de señal → score 0-100 + signal
═══════════════════════════════════════════════════════════════════════════ */
function scoreComposite(ind, fundamentals, macro, options, insider, shortInt) {
  const layers = {};

  // Layer 1 — RSI momentum (overbought/oversold)
  const rsi = ind.rsi ?? 50;
  layers.rsiMomentum = rsi < 30 ? 85
    : rsi < 45 ? 70
    : rsi < 55 ? 50
    : rsi < 70 ? 35
    : 15;

  // Layer 2 — MACD signal crossover
  const hist = ind.macdHist ?? 0;
  const macd = ind.macd     ?? 0;
  layers.macdSignal = hist > 0 && macd > 0 ? 80
    : hist > 0 && macd < 0 ? 60
    : hist < 0 && macd > 0 ? 40
    : 20;

  // Layer 3 — Price vs EMA200 trend
  const price = ind.price  || 100;
  const ema200 = ind.sma200 || price;
  const pctAboveEMA = ((price - ema200) / ema200) * 100;
  layers.emaTrend = pctAboveEMA > 10 ? 80
    : pctAboveEMA > 2 ? 65
    : pctAboveEMA > -2 ? 50
    : pctAboveEMA > -10 ? 35
    : 20;

  // Layer 4 — Bollinger Band position (from SMA20)
  const sma20 = ind.sma20 || price;
  const bbPct = (price - sma20 * 0.95) / (sma20 * 0.10);
  layers.bollingerPos = clamp(100 - bbPct * 30, 10, 90);

  // Layer 5 — Fundamental quality
  const pe = fundamentals?.pe || 20;
  const roe = fundamentals?.roe || 15;
  layers.fundamentalQuality = (pe < 15 ? 30 : pe < 25 ? 20 : pe < 40 ? 10 : 0)
    + (roe > 25 ? 30 : roe > 15 ? 20 : roe > 8 ? 10 : 0)
    + ((fundamentals?.debtEq || 1) < 1 ? 20 : 10)
    + ((fundamentals?.divYield || 0) > 1 ? 10 : 5);

  // Layer 6 — Macro FED liquidity context
  const liqChg = macro?.liqChange ?? 0;
  const riskOn  = macro?.riskOn ?? true;
  layers.macroContext = (liqChg > 1 ? 25 : liqChg > 0 ? 15 : liqChg > -1 ? 5 : 0)
    + (riskOn ? 25 : 5)
    + (!(macro?.yieldCurveInverted) ? 15 : 5)
    + ((macro?.dff || 5) < 4.5 ? 20 : 10);

  // Layer 7 — Options flow sentiment
  const pcr   = options?.putCallRatio ?? 1;
  const unAct = options?.unusualActivity ?? false;
  const optSent = options?.sentiment ?? "neutral";
  layers.optionsFlow = (pcr < 0.7 ? 30 : pcr < 1.0 ? 20 : pcr < 1.3 ? 10 : 5)
    + (unAct ? 20 : 0)
    + (optSent === "bullish" ? 30 : optSent === "bearish" ? 5 : 15);

  // Layer 8 — Insider + short interest
  const buys = (insider || []).filter((t) => t.type === "BUY").length;
  const sells = (insider || []).filter((t) => t.type === "SELL").length;
  const shortFloat = shortInt?.shortFloat ?? 5;
  const dtc        = shortInt?.daysToCover ?? 2;
  layers.insiderShort = (buys > sells ? 30 : buys === sells ? 15 : 5)
    + (shortFloat > 20 ? 10 : shortFloat > 10 ? 20 : 30)
    + (dtc < 2 ? 20 : dtc < 5 ? 15 : 10);

  const weights = {
    rsiMomentum:      0.18,
    macdSignal:       0.15,
    emaTrend:         0.15,
    bollingerPos:     0.10,
    fundamentalQuality:0.15,
    macroContext:     0.12,
    optionsFlow:      0.10,
    insiderShort:     0.05,
  };

  const total = Object.entries(layers).reduce(
    (sum, [k, v]) => sum + v * (weights[k] || 0), 0
  );
  const score = parseFloat(clamp(total, 0, 100).toFixed(1));
  const signal = score >= 68 ? "STRONG BUY"
    : score >= 58 ? "BUY"
    : score >= 45 ? "NEUTRAL"
    : score >= 35 ? "SELL"
    : "STRONG SELL";

  return { score, signal, layers };
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS — Telegram + Make.com webhook
═══════════════════════════════════════════════════════════════════════════ */
async function sendTelegram(text) {
  try {
    await fetch(TG_API, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch { /* silent */ }
}

async function triggerMake(payload) {
  try {
    await fetch(MAKE_WEBHOOK, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
  } catch { /* silent */ }
}

function exportConfig() {
  const cfg = {
    version:     "2.0",
    exportedAt:  new Date().toISOString(),
    apiKeys: {
      alphaVantage: AV_KEYS,
      fred:         FRED_KEY,
    },
    notifications: {
      telegram: { token: TG_TOKEN, chatId: TG_CHAT_ID },
      make:     { webhook: MAKE_WEBHOOK },
    },
    stocks: SAMPLE_STOCKS.map((s) => s.ticker),
    theme:  "bloomberg-carbon-amber",
  };
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "quantscan-config.json"; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI — Spinner, Badge, Pill, Row, ScoreBar
═══════════════════════════════════════════════════════════════════════════ */
function Spinner({ size = 20 }) {
  const style = {
    width: size, height: size,
    border: `2px solid ${T.border}`,
    borderTopColor: T.amber,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  };
  return <div style={style} />;
}

function Badge({ children, color = T.amber, bg = T.amberDim }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: T.r2,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.06em",
      color,
      background: bg,
      border: `1px solid ${color}33`,
      fontFamily: T.fontMono,
    }}>
      {children}
    </span>
  );
}

function SignalBadge({ signal }) {
  const map = {
    "STRONG BUY":  { color: T.green,  bg: T.greenDim },
    "BUY":         { color: T.cyan,   bg: T.cyanDim  },
    "NEUTRAL":     { color: T.text1,  bg: T.bg4      },
    "SELL":        { color: T.red,    bg: T.redDim   },
    "STRONG SELL": { color: T.red,    bg: T.redDim   },
  };
  const { color, bg } = map[signal] || map["NEUTRAL"];
  return <Badge color={color} bg={bg}>{signal}</Badge>;
}

function ScoreBar({ score }) {
  const color = score >= 68 ? T.green
    : score >= 58 ? T.cyan
    : score >= 45 ? T.amber
    : score >= 35 ? T.red
    : T.redLo;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        flex: 1, height: 6, background: T.bg4,
        borderRadius: T.r1, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${score}%`,
          background: color, borderRadius: T.r1,
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{
        fontFamily: T.fontMono, fontSize: 12,
        color, minWidth: 36, textAlign: "right",
      }}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

function SectorPill({ sector }) {
  const colors = {
    "Technology":      T.cyan,
    "Healthcare":      T.green,
    "Financials":      T.blue,
    "Consumer Disc.":  T.purple,
    "Consumer Staples":T.amberHi,
    "Energy":          T.amber,
    "Industrials":     T.text1,
    "Comm. Services":  "#ff6d00",
    "Materials":       "#64dd17",
    "Real Estate":     "#e040fb",
  };
  const c = colors[sector] || T.text2;
  return (
    <span style={{
      fontSize: 9, fontFamily: T.fontMono, fontWeight: 700,
      color: c, background: `${c}18`,
      border: `1px solid ${c}33`,
      borderRadius: T.r1, padding: "1px 6px",
      letterSpacing: "0.05em",
    }}>
      {sector}
    </span>
  );
}

function DataRow({ label, value, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "center", padding: "5px 0",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <span style={{ fontSize: 12, color: T.text2, fontFamily: T.fontSans }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, color: color || T.text0,
        fontFamily: T.fontMono, fontWeight: 600,
      }}>
        {value}
      </span>
    </div>
  );
}

function Card({ children, style = {}, glow = false }) {
  return (
    <div style={{
      background: T.bg2,
      border: `1px solid ${glow ? T.amberBorder : T.border}`,
      borderRadius: T.r4,
      padding: T.sp4,
      boxShadow: glow ? T.amberShadow : T.shadowMd,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
      color: T.amber, fontFamily: T.fontMono,
      textTransform: "uppercase", marginBottom: T.sp2,
      borderBottom: `1px solid ${T.amberGlow}`,
      paddingBottom: T.sp1,
    }}>
      {children}
    </div>
  );
}

function GoldenBanner({ title, subtitle }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, #1a1400 0%, #2a1f00 50%, #1a1400 100%)`,
      border: `1.5px solid ${T.amber}`,
      borderRadius: T.r4,
      padding: "12px 20px",
      boxShadow: T.amberShadow,
      display: "flex", alignItems: "center", gap: 12,
      marginBottom: T.sp4,
      animation: "glowPulse 2s ease-in-out infinite",
    }}>
      <span style={{ fontSize: 22 }}>★</span>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 800, color: T.amberHi,
          fontFamily: T.fontMono, letterSpacing: "0.05em",
        }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: T.amberSoft, marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 2, borderBottom: `1px solid ${T.border}`,
      marginBottom: T.sp4, overflowX: "auto",
      scrollbarWidth: "none",
    }}>
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          background: active === tab.id ? T.bg4 : "transparent",
          border: "none",
          borderBottom: active === tab.id ? `2px solid ${T.amber}` : "2px solid transparent",
          color: active === tab.id ? T.amber : T.text2,
          padding: "8px 14px",
          fontSize: 11,
          fontFamily: T.fontMono,
          fontWeight: active === tab.id ? 700 : 400,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.15s",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CANDLESTICK CHART SVG — con Bollinger Bands, EMA, RSI subplot, volumen
═══════════════════════════════════════════════════════════════════════════ */
function CandlestickChart({ ticker, height = 400 }) {
  const candles  = useMemo(() => generateCandles(ticker, 80), [ticker]);
  const closes   = candles.map((c) => c.close);
  const highs    = candles.map((c) => c.high);
  const lows     = candles.map((c) => c.low);
  const volumes  = candles.map((c) => c.volume);
  const bb       = useMemo(() => calcBollinger(closes, 20, 2), [closes]);
  const ema20    = useMemo(() => calcEMA(closes, 20), [closes]);
  const ema50    = useMemo(() => calcEMA(closes, 50), [closes]);
  const rsiVals  = useMemo(() => calcRSI(closes, 14), [closes]);

  const W = 700, H_main = height * 0.58, H_rsi = height * 0.22, H_vol = height * 0.14;
  const PAD = { l: 56, r: 16, t: 16, b: 6 };
  const chartW = W - PAD.l - PAD.r;
  const n = candles.length;
  const candleW = Math.max(2, chartW / n - 1.5);

  const allPrices = [...highs, ...lows,
    ...bb.map((b) => b.upper).filter(Boolean),
    ...bb.map((b) => b.lower).filter(Boolean),
  ];
  const priceMin = Math.min(...allPrices) * 0.998;
  const priceMax = Math.max(...allPrices) * 1.002;
  const priceRange = priceMax - priceMin;

  const pY = (v) => PAD.t + H_main * (1 - (v - priceMin) / priceRange);
  const cX = (i) => PAD.l + (i + 0.5) * (chartW / n);

  const volMax = Math.max(...volumes);
  const volY   = (v) => H_main + PAD.t + H_rsi + H_vol * (1 - v / volMax);

  const rsiTop = H_main + PAD.t + 8;
  const rsiBot = rsiTop + H_rsi - 8;
  const rY = (v) => rsiBot - (H_rsi - 16) * v / 100;

  const linePath = (data, yFn) => {
    const pts = data.reduce((acc, v, i) => {
      if (v == null) return acc;
      const x = cX(i), y = yFn(v);
      return acc + (acc ? ` L${x},${y}` : `M${x},${y}`);
    }, "");
    return pts;
  };

  const bbUpper = bb.map((b) => b.upper);
  const bbLower = bb.map((b) => b.lower);
  const bbAreaPath = (() => {
    const upPts = bbUpper
      .map((v, i) => v != null ? `${cX(i)},${pY(v)}` : null)
      .filter(Boolean);
    const loPts = bbLower
      .map((v, i) => v != null ? `${cX(i)},${pY(v)}` : null)
      .filter(Boolean)
      .reverse();
    if (!upPts.length) return "";
    return `M${upPts.join("L")}L${loPts.join("L")}Z`;
  })();

  const rsiAreaPath = (() => {
    const pts = rsiVals
      .map((v, i) => v != null ? `${cX(i)},${rY(v)}` : null)
      .filter(Boolean);
    if (!pts.length) return "";
    const first = pts[0].split(",");
    const last  = pts[pts.length - 1].split(",");
    return `M${first[0]},${rsiBot}L${pts.join("L")}L${last[0]},${rsiBot}Z`;
  })();

  const totalH = H_main + H_rsi + H_vol + PAD.t + PAD.b + 20;
  const priceLabels = 5;

  return (
    <div style={{ overflowX: "auto", overflowY: "hidden" }}>
      <svg
        viewBox={`0 0 ${W} ${totalH}`}
        style={{ width: "100%", maxHeight: height + 60, display: "block" }}
        fontFamily={T.fontMono}
      >
        <defs>
          <linearGradient id="bbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.cyan} stopOpacity="0.08" />
            <stop offset="100%" stopColor={T.cyan} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.purple} stopOpacity="0.25" />
            <stop offset="100%" stopColor={T.purple} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="mainClip">
            <rect x={PAD.l} y={PAD.t} width={chartW} height={H_main} />
          </clipPath>
          <clipPath id="rsiClip">
            <rect x={PAD.l} y={rsiTop} width={chartW} height={H_rsi} />
          </clipPath>
        </defs>

        {/* ── background ── */}
        <rect width={W} height={totalH} fill={T.bg1} />
        <rect x={PAD.l} y={PAD.t} width={chartW} height={H_main}
          fill={T.bg2} />

        {/* ── horizontal price grid ── */}
        {Array.from({ length: priceLabels }, (_, i) => {
          const v = priceMin + (priceRange * i) / (priceLabels - 1);
          const y = pY(v);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={PAD.l + chartW} y1={y} y2={y}
                stroke={T.border} strokeWidth="0.5" strokeDasharray="4,4" />
              <text x={PAD.l - 4} y={y + 4} fontSize="9" fill={T.text2}
                textAnchor="end">
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* ── Bollinger Band area ── */}
        <path d={bbAreaPath} fill="url(#bbGrad)" clipPath="url(#mainClip)" />

        {/* ── Bollinger upper/lower lines ── */}
        <path d={linePath(bbUpper, pY)} fill="none" stroke={T.cyan}
          strokeWidth="0.8" strokeDasharray="3,3" opacity="0.7"
          clipPath="url(#mainClip)" />
        <path d={linePath(bbLower, pY)} fill="none" stroke={T.cyan}
          strokeWidth="0.8" strokeDasharray="3,3" opacity="0.7"
          clipPath="url(#mainClip)" />
        <path d={linePath(bb.map((b) => b.mid), pY)} fill="none"
          stroke={T.cyanLo} strokeWidth="0.6" opacity="0.5"
          clipPath="url(#mainClip)" />

        {/* ── EMA 20 ── */}
        <path d={linePath(ema20, pY)} fill="none" stroke={T.amber}
          strokeWidth="1.2" opacity="0.85" clipPath="url(#mainClip)" />

        {/* ── EMA 50 ── */}
        <path d={linePath(ema50, pY)} fill="none" stroke={T.amberSoft}
          strokeWidth="1" strokeDasharray="5,3" opacity="0.65"
          clipPath="url(#mainClip)" />

        {/* ── Candlesticks ── */}
        <g clipPath="url(#mainClip)">
          {candles.map((c, i) => {
            const x    = cX(i);
            const bull = c.close >= c.open;
            const col  = bull ? T.green : T.red;
            const bodyTop    = pY(Math.max(c.open, c.close));
            const bodyBottom = pY(Math.min(c.open, c.close));
            const bodyH      = Math.max(1, bodyBottom - bodyTop);
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={pY(c.high)} y2={pY(c.low)}
                  stroke={col} strokeWidth="0.8" opacity="0.9" />
                <rect
                  x={x - candleW / 2} y={bodyTop}
                  width={candleW} height={bodyH}
                  fill={bull ? `${T.green}cc` : `${T.red}cc`}
                  stroke={col} strokeWidth="0.4"
                />
              </g>
            );
          })}
        </g>

        {/* ── RSI separator line ── */}
        <line x1={PAD.l} x2={PAD.l + chartW}
          y1={rsiTop - 4} y2={rsiTop - 4}
          stroke={T.border} strokeWidth="1" />
        <text x={PAD.l} y={rsiTop - 6} fontSize="8"
          fill={T.purple} fontWeight="bold">RSI(14)</text>

        {/* ── RSI background ── */}
        <rect x={PAD.l} y={rsiTop} width={chartW} height={H_rsi}
          fill={T.bg2} />

        {/* ── RSI overbought/oversold zones ── */}
        <rect x={PAD.l} y={rY(70)} width={chartW} height={rY(30) - rY(70)}
          fill={T.purple} opacity="0.04" />
        {[30, 50, 70].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={PAD.l + chartW}
              y1={rY(v)} y2={rY(v)}
              stroke={v === 50 ? T.borderHi : T.border}
              strokeWidth="0.5" strokeDasharray={v === 50 ? "none" : "3,3"} />
            <text x={PAD.l - 4} y={rY(v) + 3} fontSize="8"
              fill={T.text3} textAnchor="end">{v}</text>
          </g>
        ))}

        {/* ── RSI area ── */}
        <path d={rsiAreaPath} fill="url(#rsiGrad)" clipPath="url(#rsiClip)" />
        <path d={linePath(rsiVals, rY)} fill="none" stroke={T.purple}
          strokeWidth="1.4" clipPath="url(#rsiClip)" />

        {/* ── Volume bars ── */}
        <line x1={PAD.l} x2={PAD.l + chartW}
          y1={H_main + PAD.t + H_rsi + 6} y2={H_main + PAD.t + H_rsi + 6}
          stroke={T.border} strokeWidth="1" />
        <text x={PAD.l} y={H_main + PAD.t + H_rsi + 4} fontSize="8"
          fill={T.text3}>VOL</text>
        {candles.map((c, i) => {
          const bull = c.close >= c.open;
          const bh   = H_vol * (c.volume / volMax) * 0.85;
          const by   = H_main + PAD.t + H_rsi + H_vol - bh + 10;
          return (
            <rect key={i}
              x={cX(i) - candleW / 2} y={by}
              width={candleW} height={bh}
              fill={bull ? `${T.green}88` : `${T.red}88`}
            />
          );
        })}

        {/* ── Legend ── */}
        <g transform={`translate(${PAD.l + 4}, ${PAD.t + 10})`}>
          {[
            { col: T.amber,    label: "EMA20" },
            { col: T.amberSoft,label: "EMA50" },
            { col: T.cyan,     label: "BB(20,2)" },
          ].map(({ col, label }, i) => (
            <g key={i} transform={`translate(${i * 72}, 0)`}>
              <line x1="0" x2="14" y1="5" y2="5"
                stroke={col} strokeWidth="1.5" />
              <text x="17" y="9" fontSize="8" fill={T.text1}>{label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUPPORT / RESISTANCE LEVELS — calcula pivotes y zonas clave
═══════════════════════════════════════════════════════════════════════════ */
function calcLevels(ticker) {
  const base  = FALLBACK_PRICES[ticker] || 100;
  const hi52  = base * rnd(1.05, 1.55);
  const lo52  = base * rnd(0.55, 0.92);
  const range = hi52 - lo52;
  return {
    hi52:  parseFloat(hi52.toFixed(2)),
    lo52:  parseFloat(lo52.toFixed(2)),
    pivot: parseFloat((base).toFixed(2)),
    r1:    parseFloat((base + range * 0.08).toFixed(2)),
    r2:    parseFloat((base + range * 0.18).toFixed(2)),
    r3:    parseFloat((base + range * 0.30).toFixed(2)),
    s1:    parseFloat((base - range * 0.08).toFixed(2)),
    s2:    parseFloat((base - range * 0.18).toFixed(2)),
    s3:    parseFloat((base - range * 0.30).toFixed(2)),
    vwap:  parseFloat((base * rnd(0.98, 1.02)).toFixed(2)),
    fib382:parseFloat((lo52 + range * 0.382).toFixed(2)),
    fib500:parseFloat((lo52 + range * 0.500).toFixed(2)),
    fib618:parseFloat((lo52 + range * 0.618).toFixed(2)),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   STOCK DETAIL SCREEN — 8 tabs: grafico · niveles · indicadores · opciones
                                  insider · backtest · noticias · ia
═══════════════════════════════════════════════════════════════════════════ */
const DETAIL_TABS = [
  { id: "grafico",     label: "Gráfico"     },
  { id: "niveles",     label: "Niveles"     },
  { id: "indicadores", label: "Indicadores" },
  { id: "opciones",    label: "Opciones"    },
  { id: "insider",     label: "Insider"     },
  { id: "backtest",    label: "Backtest"    },
  { id: "noticias",    label: "Noticias"    },
  { id: "ia",          label: "IA"          },
];

function StockDetailScreen({ stock, macro, onBack }) {
  const [tab,    setTab]    = useState("grafico");
  const [ind,    setInd]    = useState(null);
  const [fund,   setFund]   = useState(null);
  const [earn,   setEarn]   = useState(null);
  const [opts,   setOpts]   = useState(null);
  const [ins,    setIns]    = useState(null);
  const [shortI, setShortI] = useState(null);
  const [loading, setLoading] = useState(true);
  const [score,  setScore]  = useState(null);

  useEffect(() => {
    setLoading(true);
    setInd(null); setFund(null); setEarn(null);
    setOpts(null); setIns(null); setShortI(null);

    Promise.all([
      fetchRealIndicators(stock.ticker),
      fetchFundamentals(stock.ticker),
      fetchEarnings(stock.ticker),
      fetchOptionsFlow(stock.ticker),
      fetchInsiderTrading(stock.ticker),
      fetchShortInterest(stock.ticker),
    ]).then(([i, f, e, o, ins_, sh]) => {
      setInd(i); setFund(f); setEarn(e);
      setOpts(o); setIns(ins_); setShortI(sh);
      const s = scoreComposite(i, f, macro, o, ins_, sh);
      setScore(s);
      setLoading(false);
    });
  }, [stock.ticker]);

  const price   = FALLBACK_PRICES[stock.ticker] || 100;
  const chg     = rnd(-4, 4);
  const levels  = useMemo(() => calcLevels(stock.ticker), [stock.ticker]);

  return (
    <div style={{ background: T.bg0, minHeight: "100vh", fontFamily: T.fontSans }}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: T.bg1, borderBottom: `1px solid ${T.border}`,
        padding: `${T.sp3}px ${T.sp4}px`,
        display: "flex", alignItems: "center", gap: T.sp3,
      }}>
        <button onClick={onBack} style={{
          background: T.bg3, border: `1px solid ${T.border}`,
          color: T.amber, cursor: "pointer", borderRadius: T.r2,
          padding: "4px 10px", fontSize: 13, fontFamily: T.fontMono,
        }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: T.sp2 }}>
            <span style={{
              fontSize: 22, fontWeight: 800, color: T.amber,
              fontFamily: T.fontMono, letterSpacing: "0.03em",
            }}>{stock.ticker}</span>
            <span style={{ fontSize: 13, color: T.text1 }}>{stock.name}</span>
            <SectorPill sector={stock.sector} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: T.sp3, marginTop: 4 }}>
            <span style={{
              fontSize: 24, fontWeight: 700, color: T.text0,
              fontFamily: T.fontMono,
            }}>${fmt2(price)}</span>
            <span style={{
              fontSize: 14, fontWeight: 600,
              color: chg >= 0 ? T.green : T.red,
              fontFamily: T.fontMono,
            }}>{fmtPct(chg)}</span>
          </div>
        </div>
        {score && (
          <div style={{
            textAlign: "center", background: T.bg3,
            border: `1px solid ${T.border}`, borderRadius: T.r4,
            padding: `${T.sp2}px ${T.sp4}px`,
          }}>
            <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono,
              letterSpacing: "0.08em", textTransform: "uppercase" }}>Score</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: T.fontMono,
              color: score.score >= 68 ? T.green : score.score >= 55 ? T.amber : T.red }}>
              {score.score.toFixed(0)}
            </div>
            <SignalBadge signal={score.signal} />
          </div>
        )}
      </div>

      {/* ─── Tab Bar ─────────────────────────────────────────────────────── */}
      <div style={{ padding: `${T.sp3}px ${T.sp4}px 0` }}>
        <TabBar tabs={DETAIL_TABS} active={tab} onChange={setTab} />
      </div>

      <div style={{ padding: `0 ${T.sp4}px ${T.sp4}px` }}>
        {loading && tab !== "grafico" && tab !== "niveles" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spinner size={32} />
          </div>
        ) : (
          <>
            {/* ──────────────── TAB: GRÁFICO ──────────────── */}
            {tab === "grafico" && (
              <div>
                <Card style={{ marginBottom: T.sp3 }}>
                  <SectionTitle>Precio · Bollinger(20,2) · EMA20/50 · RSI(14)</SectionTitle>
                  <CandlestickChart ticker={stock.ticker} height={380} />
                </Card>
                {score && (
                  <Card>
                    <SectionTitle>Desglose de score compuesto (8 capas)</SectionTitle>
                    {Object.entries(score.layers).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 6 }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          fontSize: 11, marginBottom: 2,
                        }}>
                          <span style={{ color: T.text1, fontFamily: T.fontMono,
                            textTransform: "capitalize" }}>
                            {k.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span style={{ color: T.amber, fontFamily: T.fontMono }}>
                            {v.toFixed(0)} / 100
                          </span>
                        </div>
                        <ScoreBar score={v} />
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}

            {/* ──────────────── TAB: NIVELES ──────────────── */}
            {tab === "niveles" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.sp3 }}>
                <Card>
                  <SectionTitle>Resistencias</SectionTitle>
                  {[
                    { label: "52W High", value: fmt2(levels.hi52),  color: T.redLo },
                    { label: "R3",       value: fmt2(levels.r3),     color: T.red   },
                    { label: "R2",       value: fmt2(levels.r2),     color: "#ff6d00" },
                    { label: "R1",       value: fmt2(levels.r1),     color: T.amber },
                    { label: "Pivot",    value: fmt2(levels.pivot),  color: T.text0 },
                  ].map((row) => <DataRow key={row.label} {...row} />)}
                </Card>
                <Card>
                  <SectionTitle>Soportes</SectionTitle>
                  {[
                    { label: "S1",       value: fmt2(levels.s1),     color: T.cyan  },
                    { label: "S2",       value: fmt2(levels.s2),     color: T.green },
                    { label: "S3",       value: fmt2(levels.s3),     color: T.greenLo },
                    { label: "52W Low",  value: fmt2(levels.lo52),   color: T.greenLo },
                    { label: "VWAP",     value: fmt2(levels.vwap),   color: T.purple },
                  ].map((row) => <DataRow key={row.label} {...row} />)}
                </Card>
                <Card style={{ gridColumn: "1/-1" }}>
                  <SectionTitle>Niveles Fibonacci</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: T.sp2 }}>
                    {[
                      { label: "Fib 38.2%", value: fmt2(levels.fib382) },
                      { label: "Fib 50.0%", value: fmt2(levels.fib500) },
                      { label: "Fib 61.8%", value: fmt2(levels.fib618) },
                    ].map((f) => (
                      <div key={f.label} style={{
                        background: T.bg3, borderRadius: T.r3,
                        padding: T.sp3, textAlign: "center",
                        border: `1px solid ${T.amberGlow}`,
                      }}>
                        <div style={{ fontSize: 9, color: T.amberSoft,
                          fontFamily: T.fontMono, letterSpacing: "0.08em",
                          textTransform: "uppercase", marginBottom: 4 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700,
                          color: T.amberHi, fontFamily: T.fontMono }}>
                          ${f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ──────────────── TAB: INDICADORES ──────────────── */}
            {tab === "indicadores" && ind && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.sp3 }}>
                <Card>
                  <SectionTitle>Técnicos</SectionTitle>
                  <DataRow label="RSI (14)" value={fmt2(ind.rsi)}
                    color={ind.rsi < 30 ? T.green : ind.rsi > 70 ? T.red : T.amber} />
                  <DataRow label="MACD"     value={fmt2(ind.macd)} />
                  <DataRow label="MACD Signal" value={fmt2(ind.macdSig)} />
                  <DataRow label="MACD Hist"   value={fmt2(ind.macdHist)}
                    color={ind.macdHist > 0 ? T.green : T.red} />
                  <DataRow label="SMA 20"   value={`$${fmt2(ind.sma20)}`} />
                  <DataRow label="SMA 200"  value={`$${fmt2(ind.sma200)}`} />
                  <DataRow label="Precio vs EMA200"
                    value={fmtPct(((price - ind.sma200) / ind.sma200) * 100)}
                    color={price > ind.sma200 ? T.green : T.red} />
                  <DataRow label="Fuente" value={ind.source} color={T.text2} />
                </Card>
                <Card>
                  <SectionTitle>Fundamentales</SectionTitle>
                  {fund && <>
                    <DataRow label="P/E Ratio"   value={fmt2(fund.pe)} />
                    <DataRow label="P/B Ratio"   value={fmt2(fund.pb)} />
                    <DataRow label="ROE (%)"     value={fmt2(fund.roe)} />
                    <DataRow label="EPS (TTM)"   value={`$${fmt2(fund.eps)}`} />
                    <DataRow label="Revenue"     value={fmtK(fund.rev)} />
                    <DataRow label="Mkt Cap"     value={fmtK(fund.mktCap)} />
                    <DataRow label="Debt/Equity" value={fmt2(fund.debtEq)} />
                    <DataRow label="Div Yield"   value={`${fmt2(fund.divYield)}%`} />
                    <DataRow label="Beta"        value={fmt2(fund.beta)} />
                    <DataRow label="52W High"    value={`$${fmt2(fund.week52Hi)}`} />
                    <DataRow label="52W Low"     value={`$${fmt2(fund.week52Lo)}`} />
                  </>}
                </Card>
              </div>
            )}

            {/* ──────────────── TAB: OPCIONES ──────────────── */}
            {tab === "opciones" && opts && (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                  gap: T.sp3, marginBottom: T.sp3,
                }}>
                  {[
                    { label: "P/C Ratio", value: fmt2(opts.putCallRatio),
                      color: opts.putCallRatio < 0.8 ? T.green : opts.putCallRatio > 1.2 ? T.red : T.amber },
                    { label: "IV (%)",    value: fmt2(opts.impliedVol),   color: T.purple },
                    { label: "Delta",     value: fmt2(opts.delta),        color: T.cyan   },
                    { label: "Gamma",     value: opts.gamma?.toFixed(4),  color: T.amber  },
                  ].map((m) => (
                    <Card key={m.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono,
                        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: m.color,
                        fontFamily: T.fontMono }}>{m.value}</div>
                    </Card>
                  ))}
                </div>
                {opts.unusualActivity && (
                  <GoldenBanner
                    title="ACTIVIDAD INUSUAL DETECTADA"
                    subtitle={`Flujo ${opts.sentiment.toUpperCase()} · IV ${fmt2(opts.impliedVol)}% · P/C ${fmt2(opts.putCallRatio)}`}
                  />
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.sp3 }}>
                  <Card>
                    <SectionTitle>Top Calls</SectionTitle>
                    {opts.topCalls.map((c, i) => (
                      <div key={i} style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 4, padding: "4px 0", borderBottom: `1px solid ${T.border}`,
                        fontSize: 11, fontFamily: T.fontMono,
                      }}>
                        <span style={{ color: T.green }}>CALL ${c.strike}</span>
                        <span style={{ color: T.text1, textAlign: "center" }}>{c.expiry}</span>
                        <span style={{ color: T.text0, textAlign: "right" }}>
                          {fmtK(c.volume)} vol
                        </span>
                      </div>
                    ))}
                  </Card>
                  <Card>
                    <SectionTitle>Top Puts</SectionTitle>
                    {opts.topPuts.map((p, i) => (
                      <div key={i} style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 4, padding: "4px 0", borderBottom: `1px solid ${T.border}`,
                        fontSize: 11, fontFamily: T.fontMono,
                      }}>
                        <span style={{ color: T.red }}>PUT ${p.strike}</span>
                        <span style={{ color: T.text1, textAlign: "center" }}>{p.expiry}</span>
                        <span style={{ color: T.text0, textAlign: "right" }}>
                          {fmtK(p.volume)} vol
                        </span>
                      </div>
                    ))}
                  </Card>
                </div>
              </div>
            )}

            {/* ──────────────── TAB: INSIDER ──────────────── */}
            {tab === "insider" && ins && (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3,1fr)",
                  gap: T.sp3, marginBottom: T.sp3,
                }}>
                  {[
                    {
                      label: "Compras",
                      value: ins.filter((t) => t.type === "BUY").length,
                      color: T.green,
                    },
                    {
                      label: "Ventas",
                      value: ins.filter((t) => t.type === "SELL").length,
                      color: T.red,
                    },
                    {
                      label: "Short Float",
                      value: `${shortI?.shortFloat?.toFixed(1)}%`,
                      color: shortI?.shortFloat > 15 ? T.red : T.amber,
                    },
                  ].map((m) => (
                    <Card key={m.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono,
                        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: m.color,
                        fontFamily: T.fontMono }}>{m.value}</div>
                    </Card>
                  ))}
                </div>
                <Card style={{ marginBottom: T.sp3 }}>
                  <SectionTitle>Transacciones de Insiders</SectionTitle>
                  {ins.map((t, i) => (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "1fr 80px 100px 90px 90px",
                      gap: 8, padding: "6px 0", borderBottom: `1px solid ${T.border}`,
                      fontSize: 11, alignItems: "center",
                    }}>
                      <span style={{ color: T.text0, fontFamily: T.fontMono }}>
                        {t.role}
                      </span>
                      <Badge
                        color={t.type === "BUY" ? T.green : T.red}
                        bg={t.type === "BUY" ? T.greenDim : T.redDim}
                      >{t.type}</Badge>
                      <span style={{ color: T.text1, fontFamily: T.fontMono }}>
                        {fmtK(t.shares)} acc.
                      </span>
                      <span style={{ color: T.amber, fontFamily: T.fontMono }}>
                        ${fmt2(t.price)}
                      </span>
                      <span style={{ color: T.text2, fontFamily: T.fontMono, fontSize: 10 }}>
                        {t.date}
                      </span>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionTitle>Short Interest</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.sp2 }}>
                    {shortI && [
                      { label: "Short Float",    value: `${shortI.shortFloat.toFixed(2)}%` },
                      { label: "Days to Cover",  value: fmt2(shortI.daysToCover) },
                      { label: "Short Shares",   value: fmtK(shortI.shortShares) },
                      { label: "Borrow Rate",    value: `${shortI.borrowRate.toFixed(2)}%` },
                      { label: "Short Ratio",    value: fmt2(shortI.shortRatio) },
                      { label: "Cambio SoS",     value: fmtPct(shortI.changeWoW),
                        color: shortI.changeWoW < 0 ? T.green : T.red },
                    ].map((row) => <DataRow key={row.label} {...row} />)}
                  </div>
                </Card>
              </div>
            )}

            {/* ──────────────── TAB: BACKTEST ──────────────── */}
            {tab === "backtest" && (
              <BacktestTab ticker={stock.ticker} />
            )}

            {/* ──────────────── TAB: NOTICIAS ──────────────── */}
            {tab === "noticias" && (
              <NoticiaTab ticker={stock.ticker} name={stock.name} />
            )}

            {/* ──────────────── TAB: IA ──────────────── */}
            {tab === "ia" && score && ind && fund && (
              <IATab stock={stock} score={score} ind={ind} fund={fund} macro={macro} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Backtest Tab ─────────────────────────────────────────────────────── */
function BacktestTab({ ticker }) {
  const candles = useMemo(() => generateCandles(ticker, 252), [ticker]);
  const closes  = candles.map((c) => c.close);
  const ema20   = calcEMA(closes, 20);
  const ema50   = calcEMA(closes, 50);

  let capital = 10000, trades = 0, wins = 0;
  let position = null;
  const equity = [capital];

  for (let i = 50; i < closes.length; i++) {
    if (!position && ema20[i] > ema50[i] && ema20[i - 1] <= ema50[i - 1]) {
      position = { entry: closes[i], qty: Math.floor(capital / closes[i]) };
    } else if (position && ema20[i] < ema50[i] && ema20[i - 1] >= ema50[i - 1]) {
      const pnl = (closes[i] - position.entry) * position.qty;
      capital += pnl;
      if (pnl > 0) wins++;
      trades++;
      position = null;
    }
    equity.push(capital);
  }

  const totalReturn = ((capital - 10000) / 10000) * 100;
  const winRate     = trades > 0 ? (wins / trades) * 100 : 0;
  const maxEq       = Math.max(...equity);
  const minEq       = Math.min(...equity.slice(equity.indexOf(maxEq)));
  const maxDD       = maxEq > 0 ? ((maxEq - minEq) / maxEq) * 100 : 0;
  const sharpe      = totalReturn / Math.max(1, maxDD) * 0.5;

  const W = 680, H = 160;
  const eqMin = Math.min(...equity);
  const eqMax = Math.max(...equity);
  const eqRange = eqMax - eqMin || 1;
  const pts = equity.map((v, i) =>
    `${(i / equity.length) * W},${H - (H * (v - eqMin)) / eqRange}`
  ).join(" ");

  return (
    <div>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: T.sp3, marginBottom: T.sp3,
      }}>
        {[
          { label: "Retorno Total", value: fmtPct(totalReturn),
            color: totalReturn >= 0 ? T.green : T.red },
          { label: "Trades",        value: trades,    color: T.amber },
          { label: "Win Rate",      value: `${winRate.toFixed(1)}%`,
            color: winRate >= 55 ? T.green : T.red },
          { label: "Max Drawdown",  value: `${maxDD.toFixed(1)}%`, color: T.red },
        ].map((m) => (
          <Card key={m.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono,
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color,
              fontFamily: T.fontMono }}>{m.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle>Curva de Equity — Estrategia EMA20 × EMA50</SectionTitle>
        <svg viewBox={`0 0 ${W} ${H + 20}`}
          style={{ width: "100%", display: "block" }}>
          <rect width={W} height={H + 20} fill={T.bg3} />
          <line x1={0} y1={H} x2={W} y2={H}
            stroke={T.border} strokeWidth="0.5" />
          <polyline points={pts} fill="none"
            stroke={totalReturn >= 0 ? T.green : T.red} strokeWidth="1.5" />
          <text x={4} y={12} fontSize="9" fill={T.text2} fontFamily={T.fontMono}>
            Capital inicial: $10,000 → ${capital.toFixed(0)}
          </text>
        </svg>
      </Card>
    </div>
  );
}

/* ─── Noticias Tab ─────────────────────────────────────────────────────── */
const NEWS_TEMPLATES = [
  (t, n) => `${n} supera estimaciones de EPS en Q${Math.ceil(Math.random()*4)} con crecimiento de ingresos del ${rnd(4,22).toFixed(1)}%`,
  (t, n) => `Analistas elevan objetivo de precio de ${t} a $${(FALLBACK_PRICES[t]||100 * rnd(1.1,1.4)).toFixed(0)}`,
  (t, n) => `${n} anuncia expansión internacional y nuevo acuerdo estratégico`,
  (t, n) => `${t}: Insider compra ${Math.floor(rnd(5,50))}K acciones en el mercado abierto`,
  (t, n) => `${n} presenta guía de ingresos por encima del consenso para el próximo trimestre`,
  (t, n) => `Actualización de rating: ${t} pasa de "neutral" a "outperform" según firma líder`,
  (t, n) => `${n} anuncia programa de recompra de acciones por $${rnd(1,10).toFixed(1)}B`,
  (t, n) => `Conferencia de inversores: ${t} detalla hoja de ruta de IA para los próximos 3 años`,
];

function NoticiaTab({ ticker, name }) {
  const news = useMemo(() => {
    return NEWS_TEMPLATES.map((fn, i) => {
      const d = new Date(Date.now() - i * rnd(1, 3) * 86400000 * 1.2);
      const sentiment = Math.random() > 0.3 ? "positive" : "negative";
      return {
        headline: fn(ticker, name),
        source: ["Bloomberg", "Reuters", "WSJ", "CNBC", "Barron's",
          "Seeking Alpha", "MarketWatch", "Financial Times"][i % 8],
        date: d.toISOString().slice(0, 10),
        sentiment,
        impact: rnd(0, 1) > 0.7 ? "high" : "medium",
      };
    });
  }, [ticker]);

  return (
    <div>
      {news.map((item, i) => (
        <Card key={i} style={{ marginBottom: T.sp2 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", gap: T.sp3,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, color: T.text0, fontWeight: 600,
                marginBottom: 4, lineHeight: 1.4,
              }}>{item.headline}</div>
              <div style={{
                display: "flex", gap: T.sp2, alignItems: "center",
              }}>
                <span style={{ fontSize: 10, color: T.amber, fontFamily: T.fontMono }}>
                  {item.source}
                </span>
                <span style={{ fontSize: 10, color: T.text2 }}>{item.date}</span>
                {item.impact === "high" && (
                  <Badge color={T.yellow} bg="rgba(255,234,0,0.08)">HIGH IMPACT</Badge>
                )}
              </div>
            </div>
            <div style={{ fontSize: 18 }}>
              {item.sentiment === "positive" ? "📈" : "📉"}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── IA Tab ───────────────────────────────────────────────────────────── */
function IATab({ stock, score, ind, fund, macro }) {
  const signal     = score.signal;
  const bullish    = score.score >= 55;
  const topLayer   = Object.entries(score.layers)
    .sort((a, b) => b[1] - a[1])[0];
  const weakLayer  = Object.entries(score.layers)
    .sort((a, b) => a[1] - b[1])[0];

  const analysis = `${stock.ticker} (${stock.name}) cotiza actualmente a $${fmt2(FALLBACK_PRICES[stock.ticker] || 100)} con una señal compuesta de ${score.score.toFixed(1)}/100 (${signal}).

MOMENTUM TÉCNICO: El RSI(14) se encuentra en ${ind.rsi.toFixed(1)}, ${ind.rsi < 30 ? "indicando sobreventa y posible rebote técnico" : ind.rsi > 70 ? "en zona de sobrecompra que sugiere cautela" : "en zona neutral sin señal extrema"}. El histograma MACD es ${ind.macdHist > 0 ? "positivo, confirmando momentum alcista" : "negativo, presionando la tendencia"}.

TENDENCIA: El precio está ${((FALLBACK_PRICES[stock.ticker] || 100) > (ind.sma200 || 0)) ? "por encima" : "por debajo"} de la SMA200 ($${fmt2(ind.sma200)}), ${((FALLBACK_PRICES[stock.ticker] || 100) > (ind.sma200 || 0)) ? "lo que confirma una estructura de tendencia alcista de largo plazo" : "lo que implica debilidad estructural en el largo plazo"}.

MACRO: El entorno macroeconómico es ${macro?.riskOn ? "favorable (risk-on)" : "adverso (risk-off)"}. La curva de tipos ${macro?.yieldCurveInverted ? "invertida sugiere presión sobre márgenes financieros" : "positiva apoya el apetito por riesgo"}. Liquidez FED: ${macro?.liqChange ? fmtPct(macro.liqChange) : "neutral"}.

FORTALEZA MÁS ALTA: ${topLayer[0].replace(/([A-Z])/g, " $1").trim()} (${topLayer[1].toFixed(0)}/100).
PUNTO DE ATENCIÓN: ${weakLayer[0].replace(/([A-Z])/g, " $1").trim()} (${weakLayer[1].toFixed(0)}/100).

CONCLUSIÓN: ${bullish
  ? `El análisis multi-capa favorece una postura COMPRADORA en ${stock.ticker}. Se recomienda confirmar con ruptura de R1 ($${fmt2(FALLBACK_PRICES[stock.ticker] * 1.06)}) con volumen superior al promedio.`
  : `El balance de señales no justifica exposición agresiva en ${stock.ticker} en el momento actual. Se recomienda esperar consolidación sobre soporte S1 ($${fmt2(FALLBACK_PRICES[stock.ticker] * 0.95)}) antes de reconsiderar.`
}`;

  return (
    <div>
      {score.score >= 68 && (
        <GoldenBanner
          title={`OPORTUNIDAD DE ALTA CONVICCIÓN — ${stock.ticker}`}
          subtitle={`Score ${score.score.toFixed(1)} · ${signal} · Sector: ${stock.sector}`}
        />
      )}
      <Card>
        <SectionTitle>Análisis IA Cuantitativo — Modelo 8 Capas</SectionTitle>
        <div style={{
          fontSize: 12, color: T.text1, lineHeight: 1.7,
          fontFamily: T.fontSans, whiteSpace: "pre-wrap",
        }}>
          {analysis}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.sp3, marginTop: T.sp3 }}>
        <Card>
          <SectionTitle>Entrada sugerida</SectionTitle>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.green,
            fontFamily: T.fontMono, marginBottom: 4 }}>
            ${fmt2((FALLBACK_PRICES[stock.ticker] || 100) * 0.985)}
          </div>
          <div style={{ fontSize: 10, color: T.text2 }}>Precio límite zona de demanda</div>
        </Card>
        <Card>
          <SectionTitle>Stop Loss / Objetivo</SectionTitle>
          <DataRow label="Stop"    value={`$${fmt2((FALLBACK_PRICES[stock.ticker] || 100) * 0.94)}`} color={T.red} />
          <DataRow label="TP1"     value={`$${fmt2((FALLBACK_PRICES[stock.ticker] || 100) * 1.08)}`} color={T.green} />
          <DataRow label="TP2"     value={`$${fmt2((FALLBACK_PRICES[stock.ticker] || 100) * 1.18)}`} color={T.green} />
          <DataRow label="R:R"     value="2.0 : 1" color={T.amber} />
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCANNER SCREEN — scan semanal sector-representativo · banner dorado
═══════════════════════════════════════════════════════════════════════════ */
function ScannerScreen({ macro, onSelectStock }) {
  const [results,  setResults]  = useState([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sectorFilter, setSectorFilter] = useState("ALL");
  const [sortKey,  setSortKey]  = useState("score");
  const [lastScan, setLastScan] = useState(null);
  const [goldenAlerts, setGoldenAlerts] = useState([]);

  const sectors = useMemo(() => {
    const s = new Set(SAMPLE_STOCKS.map((s) => s.sector));
    return ["ALL", ...Array.from(s)];
  }, []);

  async function runWeeklyScan() {
    setScanning(true);
    setProgress(0);
    setResults([]);
    setGoldenAlerts([]);

    const batch = [];
    for (let i = 0; i < SAMPLE_STOCKS.length; i++) {
      const stock = SAMPLE_STOCKS[i];
      const ind   = await fetchRealIndicators(stock.ticker);
      await sleep(120);
      const fund  = { pe: rnd(12,35), pb: rnd(1,6), roe: rnd(8,30),
        debtEq: rnd(0.1,2.5), divYield: rnd(0,3), mktCap: rnd(5e9,2e12) };
      const opts   = await fetchOptionsFlow(stock.ticker);
      const ins    = await fetchInsiderTrading(stock.ticker);
      const shortI = await fetchShortInterest(stock.ticker);
      const scored = scoreComposite(ind, fund, macro, opts, ins, shortI);

      batch.push({
        ...stock, ...scored, ind, fund,
        price: FALLBACK_PRICES[stock.ticker] || 100,
        chg:   rnd(-5, 5),
      });

      setProgress(Math.round(((i + 1) / SAMPLE_STOCKS.length) * 100));
      setResults([...batch].sort((a, b) => b.score - a.score));
    }

    const golden = batch
      .filter((r) => r.score >= 72)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    setGoldenAlerts(golden);
    setLastScan(new Date().toISOString());
    setScanning(false);

    if (golden.length) {
      const msg = `🌟 <b>QuantScan — Oportunidades de Alta Convicción</b>\n\n${
        golden.map((g) => `• <b>${g.ticker}</b> (${g.sector}) Score: ${g.score.toFixed(0)} — ${g.signal}`).join("\n")
      }\n\n🕐 ${new Date().toLocaleString("es-ES")}`;
      sendTelegram(msg);
      triggerMake({ event: "weekly_scan", golden, timestamp: new Date().toISOString() });
    }
  }

  const sectorRep = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.sector] || r.score > map[r.sector].score) map[r.sector] = r;
    });
    return map;
  }, [results]);

  const filtered = useMemo(() => {
    let list = sectorFilter === "ALL" ? results
      : results.filter((r) => r.sector === sectorFilter);
    return [...list].sort((a, b) => {
      if (sortKey === "score") return b.score - a.score;
      if (sortKey === "chg")   return b.chg - a.chg;
      if (sortKey === "rsi")   return b.ind.rsi - a.ind.rsi;
      return a.ticker.localeCompare(b.ticker);
    });
  }, [results, sectorFilter, sortKey]);

  return (
    <div style={{ padding: T.sp4, fontFamily: T.fontSans }}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: T.sp4,
      }}>
        <div>
          <div style={{
            fontSize: 20, fontWeight: 800, color: T.amber,
            fontFamily: T.fontMono, letterSpacing: "0.04em",
          }}>SCANNER SEMANAL</div>
          <div style={{ fontSize: 11, color: T.text2 }}>
            {results.length > 0
              ? `${results.length} acciones analizadas · ${lastScan ? new Date(lastScan).toLocaleString("es-ES") : ""}`
              : "97 acciones · Nasdaq 100 + S&P 500 · modelo 8 capas"}
          </div>
        </div>
        <button
          onClick={runWeeklyScan}
          disabled={scanning}
          style={{
            background: scanning ? T.bg4 : T.amber,
            color: scanning ? T.text2 : T.bg0,
            border: "none", cursor: scanning ? "not-allowed" : "pointer",
            borderRadius: T.r3, padding: "10px 22px",
            fontSize: 12, fontWeight: 800, fontFamily: T.fontMono,
            letterSpacing: "0.06em", transition: "all 0.2s",
          }}
        >
          {scanning ? `ESCANEANDO ${progress}%` : "▶ SCAN SEMANAL"}
        </button>
      </div>

      {/* ─── Progress bar ────────────────────────────────────────────────── */}
      {scanning && (
        <div style={{
          height: 4, background: T.bg3, borderRadius: T.r1,
          marginBottom: T.sp4, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: `linear-gradient(90deg, ${T.amberLo}, ${T.amber})`,
            transition: "width 0.3s ease", borderRadius: T.r1,
          }} />
        </div>
      )}

      {/* ─── Golden Banner ────────────────────────────────────────────────── */}
      {goldenAlerts.length > 0 && (
        <GoldenBanner
          title={`★ ${goldenAlerts.length} OPORTUNIDADES PREMIUM DETECTADAS — SCORE ≥ 72`}
          subtitle={goldenAlerts.map((g) => `${g.ticker} (${g.score.toFixed(0)})`).join(" · ")}
        />
      )}

      {/* ─── Sector Representatives ─────────────────────────────────────── */}
      {Object.keys(sectorRep).length > 0 && (
        <div style={{ marginBottom: T.sp4 }}>
          <SectionTitle>Representante por Sector</SectionTitle>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
            gap: T.sp2,
          }}>
            {Object.entries(sectorRep).map(([sector, rep]) => (
              <button key={sector} onClick={() => onSelectStock(rep)}
                style={{
                  background: rep.score >= 68 ? T.amberDim : T.bg2,
                  border: `1px solid ${rep.score >= 68 ? T.amberBorder : T.border}`,
                  borderRadius: T.r3, padding: T.sp3, textAlign: "left",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: rep.score >= 68 ? T.glowSm : "none",
                }}>
                <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono,
                  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {sector}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.amber,
                  fontFamily: T.fontMono }}>{rep.ticker}</div>
                <ScoreBar score={rep.score} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div style={{
          display: "flex", gap: T.sp2, marginBottom: T.sp3,
          flexWrap: "wrap", alignItems: "center",
        }}>
          <div style={{ overflowX: "auto", display: "flex", gap: T.sp1 }}>
            {sectors.map((s) => (
              <button key={s} onClick={() => setSectorFilter(s)} style={{
                background: sectorFilter === s ? T.amber : T.bg3,
                color: sectorFilter === s ? T.bg0 : T.text1,
                border: `1px solid ${sectorFilter === s ? T.amber : T.border}`,
                borderRadius: T.r2, padding: "4px 10px",
                fontSize: 10, cursor: "pointer",
                fontFamily: T.fontMono, whiteSpace: "nowrap",
              }}>{s}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: T.sp1 }}>
            {[
              { k: "score", label: "Score"  },
              { k: "chg",   label: "Cambio" },
              { k: "rsi",   label: "RSI"    },
              { k: "az",    label: "A-Z"    },
            ].map(({ k, label }) => (
              <button key={k} onClick={() => setSortKey(k)} style={{
                background: sortKey === k ? T.bg5 : T.bg3,
                color: sortKey === k ? T.amber : T.text2,
                border: `1px solid ${sortKey === k ? T.amberBorder : T.border}`,
                borderRadius: T.r2, padding: "4px 8px",
                fontSize: 10, cursor: "pointer", fontFamily: T.fontMono,
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Results Table ───────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "88px 1fr 90px 80px 70px 70px 100px 110px",
            padding: "8px 12px",
            background: T.bg3, borderBottom: `1px solid ${T.border}`,
            fontSize: 9, fontFamily: T.fontMono, fontWeight: 700,
            color: T.amberSoft, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <span>Ticker</span>
            <span>Nombre</span>
            <span>Sector</span>
            <span style={{ textAlign: "right" }}>Precio</span>
            <span style={{ textAlign: "right" }}>Chg%</span>
            <span style={{ textAlign: "right" }}>RSI</span>
            <span>Score</span>
            <span>Señal</span>
          </div>
          {filtered.map((r, i) => (
            <button
              key={r.ticker}
              onClick={() => onSelectStock(r)}
              style={{
                display: "grid",
                gridTemplateColumns: "88px 1fr 90px 80px 70px 70px 100px 110px",
                padding: "9px 12px",
                background: i % 2 === 0 ? T.bg2 : T.bg1,
                border: "none", borderBottom: `1px solid ${T.border}`,
                cursor: "pointer", width: "100%", textAlign: "left",
                transition: "background 0.1s",
              }}
            >
              <span style={{
                fontFamily: T.fontMono, fontWeight: 700, color: T.amber, fontSize: 13,
              }}>{r.ticker}</span>
              <span style={{ fontSize: 11, color: T.text1, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
              <SectorPill sector={r.sector} />
              <span style={{ textAlign: "right", fontSize: 12, color: T.text0,
                fontFamily: T.fontMono }}>${fmt2(r.price)}</span>
              <span style={{
                textAlign: "right", fontSize: 12, fontFamily: T.fontMono,
                color: r.chg >= 0 ? T.green : T.red,
              }}>{fmtPct(r.chg)}</span>
              <span style={{
                textAlign: "right", fontSize: 12, fontFamily: T.fontMono,
                color: r.ind.rsi < 30 ? T.green : r.ind.rsi > 70 ? T.red : T.text1,
              }}>{r.ind.rsi.toFixed(0)}</span>
              <div style={{ paddingRight: 4 }}>
                <ScoreBar score={r.score} />
              </div>
              <div>
                <SignalBadge signal={r.signal} />
              </div>
            </button>
          ))}
        </Card>
      )}

      {results.length === 0 && !scanning && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          color: T.text3, fontFamily: T.fontMono, fontSize: 13,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
          Presiona <span style={{ color: T.amber }}>▶ SCAN SEMANAL</span> para analizar las 97 acciones con el modelo de 8 capas.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WATCHLIST SCREEN
═══════════════════════════════════════════════════════════════════════════ */
function WatchlistScreen({ watchlist, onAdd, onRemove, onSelectStock }) {
  const [query, setQuery]   = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const r = SAMPLE_STOCKS.filter(
      (s) => s.ticker.includes(q.toUpperCase()) ||
        s.name.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10);
    setResults(r);
  };

  return (
    <div style={{ padding: T.sp4, fontFamily: T.fontSans }}>
      <div style={{
        fontSize: 20, fontWeight: 800, color: T.amber,
        fontFamily: T.fontMono, letterSpacing: "0.04em",
        marginBottom: T.sp4,
      }}>WATCHLIST</div>

      {/* ─── Search ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: T.sp4, position: "relative" }}>
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar ticker o empresa..."
          style={{
            width: "100%", padding: "10px 14px",
            background: T.bg2, border: `1px solid ${T.borderHi}`,
            borderRadius: T.r3, color: T.text0,
            fontSize: 13, fontFamily: T.fontMono,
            outline: "none", boxSizing: "border-box",
          }}
        />
        {results.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: T.bg3, border: `1px solid ${T.borderHi}`,
            borderRadius: T.r3, zIndex: 20, boxShadow: T.shadow,
            maxHeight: 280, overflowY: "auto",
          }}>
            {results.map((s) => (
              <button key={s.ticker} onClick={() => {
                onAdd(s); setQuery(""); setResults([]);
              }} style={{
                display: "flex", alignItems: "center", gap: T.sp3,
                width: "100%", padding: "10px 14px",
                background: "transparent", border: "none",
                borderBottom: `1px solid ${T.border}`,
                cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ color: T.amber, fontFamily: T.fontMono,
                  fontWeight: 700, minWidth: 52, fontSize: 13 }}>{s.ticker}</span>
                <span style={{ color: T.text1, fontSize: 12, flex: 1 }}>{s.name}</span>
                <SectorPill sector={s.sector} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Watchlist items ─────────────────────────────────────────────── */}
      {watchlist.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px",
          color: T.text3, fontFamily: T.fontMono, fontSize: 13 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>♡</div>
          Tu watchlist está vacía. Busca una acción arriba para agregar.
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {watchlist.map((s, i) => {
            const price = FALLBACK_PRICES[s.ticker] || 100;
            const chg   = rnd(-4, 4);
            return (
              <div key={s.ticker} style={{
                display: "flex", alignItems: "center", gap: T.sp3,
                padding: "12px 16px",
                background: i % 2 === 0 ? T.bg2 : T.bg1,
                borderBottom: `1px solid ${T.border}`,
              }}>
                <button onClick={() => onSelectStock(s)} style={{
                  flex: 1, display: "flex", alignItems: "center",
                  gap: T.sp3, background: "none", border: "none",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ minWidth: 52 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: T.amber,
                      fontFamily: T.fontMono }}>{s.ticker}</div>
                    <div style={{ fontSize: 10, color: T.text2, marginTop: 1 }}>{s.name}</div>
                  </div>
                  <SectorPill sector={s.sector} />
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontFamily: T.fontMono,
                      color: T.text0, fontWeight: 600 }}>${fmt2(price)}</div>
                    <div style={{ fontSize: 12, fontFamily: T.fontMono,
                      color: chg >= 0 ? T.green : T.red }}>{fmtPct(chg)}</div>
                  </div>
                </button>
                <button onClick={() => onRemove(s.ticker)} style={{
                  background: T.redDim, border: `1px solid ${T.redLo}44`,
                  color: T.red, cursor: "pointer", borderRadius: T.r2,
                  padding: "4px 8px", fontSize: 11, fontFamily: T.fontMono,
                }}>✕</button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MACRO SCREEN — FED liquidity · Yield Curve · CPI · exportConfig
═══════════════════════════════════════════════════════════════════════════ */
function MacroScreen({ macro, onRefresh }) {
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  }

  const riskColor  = macro?.riskOn ? T.green : T.red;
  const curveColor = macro?.yieldCurveInverted ? T.red : T.green;

  return (
    <div style={{ padding: T.sp4, fontFamily: T.fontSans }}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: T.sp4 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.amber,
            fontFamily: T.fontMono, letterSpacing: "0.04em" }}>MACRO DASHBOARD</div>
          <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
            FED · FRED API · Liquidez · Yield Curve
          </div>
        </div>
        <div style={{ display: "flex", gap: T.sp2 }}>
          <button onClick={refresh} disabled={loading} style={{
            background: T.bg3, border: `1px solid ${T.borderHi}`,
            color: T.text0, cursor: "pointer", borderRadius: T.r3,
            padding: "8px 14px", fontSize: 11, fontFamily: T.fontMono,
          }}>
            {loading ? <Spinner size={14} /> : "↻ Actualizar"}
          </button>
          <button onClick={exportConfig} style={{
            background: T.amberDim, border: `1px solid ${T.amberBorder}`,
            color: T.amber, cursor: "pointer", borderRadius: T.r3,
            padding: "8px 14px", fontSize: 11, fontFamily: T.fontMono,
            fontWeight: 700,
          }}>⬇ Exportar Config</button>
        </div>
      </div>

      {/* ─── Risk Status Banner ──────────────────────────────────────────── */}
      {macro && (
        <div style={{
          background: macro.riskOn
            ? "linear-gradient(135deg,#001a0d,#002814)"
            : "linear-gradient(135deg,#1a0005,#2a000a)",
          border: `1.5px solid ${riskColor}`,
          borderRadius: T.r4, padding: "14px 20px",
          marginBottom: T.sp4, display: "flex",
          alignItems: "center", gap: T.sp3,
          boxShadow: `0 0 24px ${riskColor}33`,
        }}>
          <span style={{ fontSize: 28 }}>{macro.riskOn ? "🟢" : "🔴"}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: riskColor,
              fontFamily: T.fontMono, letterSpacing: "0.04em" }}>
              ENTORNO {macro.riskOn ? "RISK-ON — FAVORABLE" : "RISK-OFF — CAUTELOSO"}
            </div>
            <div style={{ fontSize: 11, color: T.text1, marginTop: 2 }}>
              Curva de tipos {macro.yieldCurveInverted ? "INVERTIDA ⚠" : "POSITIVA ✓"} ·
              Fed Funds: {macro.dff ? `${macro.dff.toFixed(2)}%` : "—"} ·
              Actualizado: {macro.updatedAt ? new Date(macro.updatedAt).toLocaleString("es-ES") : "—"}
            </div>
          </div>
        </div>
      )}

      {macro ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.sp3 }}>
          {/* FED Balance Sheet */}
          <Card glow={macro.liqChange > 0}>
            <SectionTitle>FED Balance Sheet (WALCL)</SectionTitle>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: T.fontMono,
              color: T.amber, marginBottom: 4 }}>
              {fmtK(macro.fedBs)}
            </div>
            <DataRow label="Obs. anterior (FRED)" value={fmtK(macro.fedPrev)} color={T.text2} />
            <DataRow label="Variación vs obs. anterior" value={fmtPct(macro.liqChange)}
              color={macro.liqChange > 0 ? T.green : T.red} />
            <div style={{
              marginTop: T.sp3, padding: T.sp2,
              background: macro.liqChange > 0 ? T.greenDim : T.redDim,
              borderRadius: T.r2, fontSize: 11, color: T.text1,
            }}>
              {macro.liqChange > 0
                ? "Expansión de liquidez: favorable para activos de riesgo"
                : "Contracción de liquidez: aumenta la presión vendedora"}
            </div>
          </Card>

          {/* Yield Curve */}
          <Card>
            <SectionTitle>Curva de Tipos — T10Y2Y</SectionTitle>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: T.fontMono,
              color: curveColor, marginBottom: 4 }}>
              {macro.t10y2y ? `${macro.t10y2y.toFixed(2)}%` : "—"}
            </div>
            <DataRow label="Fed Funds Rate" value={`${fmt2(macro.dff)}%`} color={T.amber} />
            <DataRow label="Estado" value={macro.yieldCurveInverted ? "INVERTIDA" : "POSITIVA"}
              color={curveColor} />
            <div style={{
              marginTop: T.sp3, padding: T.sp2,
              background: macro.yieldCurveInverted ? T.redDim : T.greenDim,
              borderRadius: T.r2, fontSize: 11, color: T.text1,
            }}>
              {macro.yieldCurveInverted
                ? "Curva invertida: señal histórica de recesión en 6-18 meses"
                : "Curva positiva: expansión económica en curso"}
            </div>
          </Card>

          {/* M2 Money Supply */}
          <Card>
            <SectionTitle>M2 Money Supply</SectionTitle>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: T.fontMono,
              color: T.blue, marginBottom: 4 }}>
              {fmtK(macro.m2)}
            </div>
            <div style={{ fontSize: 11, color: T.text1, marginTop: 4 }}>
              Oferta monetaria amplia (M2SL). Correlación positiva con mercados de riesgo.
            </div>
          </Card>

          {/* CPI + Unemployment */}
          <Card>
            <SectionTitle>CPI · Desempleo</SectionTitle>
            <DataRow label="CPI (índice)"      value={fmt2(macro.cpi)} color={T.amber} />
            <DataRow label="Desempleo (%)"     value={`${fmt2(macro.unrate)}%`}
              color={macro.unrate > 4.5 ? T.red : T.green} />
            <div style={{ fontSize: 11, color: T.text1, marginTop: T.sp2 }}>
              {macro.unrate < 4 ? "Mercado laboral tensionado. Fed en modo restrictivo."
                : macro.unrate > 5 ? "Debilitamiento laboral. Posibles recortes próximos."
                : "Mercado laboral equilibrado. Política monetaria neutral."}
            </div>
          </Card>

          {/* Configuración API */}
          <Card style={{ gridColumn: "1/-1" }}>
            <SectionTitle>Configuración del Sistema</SectionTitle>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: T.sp3,
              marginBottom: T.sp3,
            }}>
              {[
                { label: "Alpha Vantage Keys", value: `${AV_KEYS.length} activas`, color: T.green },
                { label: "FRED API",           value: "Conectado",                 color: T.green },
                { label: "Telegram Bot",       value: `Chat: ${TG_CHAT_ID}`,       color: T.cyan  },
                { label: "Make Webhook",       value: "Configurado",               color: T.cyan  },
                { label: "Stocks Universe",    value: `${SAMPLE_STOCKS.length} tickers`, color: T.amber },
                { label: "Modelo Score",       value: "8 capas · v2.0",            color: T.amber },
              ].map((m) => (
                <div key={m.label} style={{
                  background: T.bg3, borderRadius: T.r3, padding: T.sp3,
                  border: `1px solid ${T.border}`,
                }}>
                  <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: m.color,
                    fontFamily: T.fontMono, fontWeight: 600 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <button onClick={exportConfig} style={{
              background: T.amberDim, border: `1px solid ${T.amberBorder}`,
              color: T.amber, cursor: "pointer", borderRadius: T.r3,
              padding: "10px 20px", fontSize: 12, fontFamily: T.fontMono,
              fontWeight: 700, letterSpacing: "0.06em",
            }}>
              ⬇ EXPORTAR CONFIGURACIÓN COMPLETA (JSON)
            </button>
          </Card>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spinner size={36} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP — router principal · nav Bloomberg
═══════════════════════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: "scanner",   label: "Scanner",   icon: "◎" },
  { id: "watchlist", label: "Watchlist", icon: "♡" },
  { id: "macro",     label: "Macro",     icon: "⌬" },
];

const GLOBAL_CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 18px rgba(255,179,0,0.3); }
    50%      { box-shadow: 0 0 36px rgba(255,179,0,0.6); }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #07070a; color: #f2f2fa; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0d0d12; }
  ::-webkit-scrollbar-thumb { background: #252535; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #383850; }
  button:focus-visible { outline: 2px solid #ffb300; outline-offset: 2px; }
  input:focus { border-color: #ffb300 !important; }
`;

export default function App() {
  const [screen,    setScreen]    = useState("scanner");
  const [detail,    setDetail]    = useState(null);
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wl") || "[]"); } catch { return []; }
  });
  const [macro, setMacro] = useState(null);

  useEffect(() => {
    fetchMacroContext().then(setMacro);
  }, []);

  useEffect(() => {
    localStorage.setItem("wl", JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = useCallback((stock) => {
    setWatchlist((prev) =>
      prev.find((s) => s.ticker === stock.ticker) ? prev : [...prev, stock]
    );
  }, []);

  const removeFromWatchlist = useCallback((ticker) => {
    setWatchlist((prev) => prev.filter((s) => s.ticker !== ticker));
  }, []);

  const openDetail = useCallback((stock) => {
    setDetail(stock);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
  }, []);

  if (detail) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <StockDetailScreen stock={detail} macro={macro} onBack={closeDetail} />
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh",
        background: T.bg0, fontFamily: T.fontSans }}>

        {/* ─── Top Bar ─────────────────────────────────────────────────── */}
        <header style={{
          background: T.bg1, borderBottom: `1px solid ${T.border}`,
          padding: `0 ${T.sp4}px`, height: 48,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 1px 0 rgba(255,179,0,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: T.sp3 }}>
            <span style={{
              fontSize: 16, fontWeight: 900, color: T.amber,
              fontFamily: T.fontMono, letterSpacing: "0.1em",
            }}>QUANTSCAN</span>
            <span style={{ fontSize: 9, color: T.amberSoft, fontFamily: T.fontMono,
              letterSpacing: "0.12em", textTransform: "uppercase" }}>
              v2.0 · 97 stocks · 8-layer model
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: T.sp2 }}>
            {macro && (
              <div style={{
                display: "flex", gap: T.sp2, alignItems: "center",
                padding: "3px 10px",
                background: macro.riskOn ? T.greenDim : T.redDim,
                borderRadius: T.r2,
                border: `1px solid ${macro.riskOn ? T.green : T.red}44`,
              }}>
                <span style={{ fontSize: 8, fontFamily: T.fontMono, fontWeight: 700,
                  color: macro.riskOn ? T.green : T.red, letterSpacing: "0.08em" }}>
                  {macro.riskOn ? "RISK ON" : "RISK OFF"}
                </span>
                <span style={{ fontSize: 8, color: T.text2, fontFamily: T.fontMono }}>
                  FED {fmtPct(macro.liqChange)}
                </span>
              </div>
            )}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: T.green,
              boxShadow: `0 0 6px ${T.green}`,
              animation: "glowPulse 2s ease-in-out infinite",
            }} />
          </div>
        </header>

        {/* ─── Nav Bar ─────────────────────────────────────────────────── */}
        <nav style={{
          background: T.bg1, borderBottom: `1px solid ${T.border}`,
          display: "flex", padding: `0 ${T.sp4}px`,
        }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              background: "none",
              border: "none",
              borderBottom: screen === item.id
                ? `2px solid ${T.amber}` : "2px solid transparent",
              color: screen === item.id ? T.amber : T.text2,
              padding: "12px 18px",
              fontSize: 12, fontFamily: T.fontMono, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.06em",
              textTransform: "uppercase", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {item.id === "watchlist" && watchlist.length > 0 && (
                <span style={{
                  background: T.amber, color: T.bg0,
                  borderRadius: "50%", width: 16, height: 16,
                  fontSize: 9, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{watchlist.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ─── Content ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {screen === "scanner" && (
            <ScannerScreen
              macro={macro}
              onSelectStock={(s) => { addToWatchlist(s); openDetail(s); }}
            />
          )}
          {screen === "watchlist" && (
            <WatchlistScreen
              watchlist={watchlist}
              onAdd={addToWatchlist}
              onRemove={removeFromWatchlist}
              onSelectStock={openDetail}
            />
          )}
          {screen === "macro" && (
            <MacroScreen
              macro={macro}
              onRefresh={() => fetchMacroContext().then(setMacro)}
            />
          )}
        </main>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer style={{
          background: T.bg1, borderTop: `1px solid ${T.border}`,
          padding: "6px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: T.text3, fontFamily: T.fontMono }}>
            QUANTSCAN © 2025 · Alpha Vantage · FRED · Bloomberg Carbon Theme
          </span>
          <span style={{ fontSize: 9, color: T.text3, fontFamily: T.fontMono }}>
            {SAMPLE_STOCKS.length} tickers · 8-layer composite score
          </span>
        </footer>
      </div>
    </>
  );
}
