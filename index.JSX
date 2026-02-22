import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Cell
} from "recharts";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ASSET PRICES — seeded to Feb 22 2026 actuals
// Sources: COMEX, NYMEX, Henry Hub (EIA), CBOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const ASSETS = {
  equity: [
    { id:"SPY",  name:"S&P 500 ETF",   price:599.15,  chg: 1.23, vol:"82.4M", mktCap:"548B"  },
    { id:"QQQ",  name:"NASDAQ ETF",    price:519.87,  chg: 1.78, vol:"41.2M", mktCap:"230B"  },
    { id:"NVDA", name:"NVIDIA Corp",   price:135.80,  chg: 3.41, vol:"54.1M", mktCap:"3.32T" },
    { id:"AAPL", name:"Apple Inc",     price:244.60,  chg:-0.47, vol:"61.3M", mktCap:"3.67T" },
    { id:"MSFT", name:"Microsoft",     price:415.52,  chg: 0.92, vol:"22.8M", mktCap:"3.08T" },
    { id:"TSLA", name:"Tesla Inc",     price:335.40,  chg:-2.14, vol:"112M",  mktCap:"1.08T" },
  ],
  commodity: [
    { id:"GC", name:"Gold (COMEX)",       price:5121.0, chg: 1.29, vol:"18.2M", mktCap:"—", unit:"/oz",    src:"COMEX" },
    { id:"SI", name:"Silver (COMEX)",     price:80.62,  chg: 3.85, vol:"9.1M",  mktCap:"—", unit:"/oz",    src:"COMEX" },
    { id:"CL", name:"WTI Crude (NYMEX)", price:66.37,  chg:-0.09, vol:"6.3K",  mktCap:"—", unit:"/bbl",   src:"NYMEX" },
    { id:"NG", name:"Nat Gas (HH)",      price:3.24,   chg:-4.10, vol:"44.7M", mktCap:"—", unit:"/MMBtu", src:"EIA"   },
    { id:"HG", name:"Copper (COMEX)",    price:4.63,   chg: 0.28, vol:"7.8M",  mktCap:"—", unit:"/lb",    src:"COMEX" },
    { id:"ZW", name:"Wheat (CBOT)",      price:597.50, chg:-0.89, vol:"5.3M",  mktCap:"—", unit:"/bu",    src:"CBOT"  },
  ],
  crypto: [
    { id:"BTC",  name:"Bitcoin",   price:97842.0, chg: 2.84, vol:"38.1B", mktCap:"1.93T" },
    { id:"ETH",  name:"Ethereum",  price:2802.4,  chg: 1.62, vol:"18.4B", mktCap:"337B"  },
    { id:"SOL",  name:"Solana",    price:172.32,  chg: 4.21, vol:"4.2B",  mktCap:"82B"   },
    { id:"BNB",  name:"BNB",       price:694.71,  chg:-0.74, vol:"1.8B",  mktCap:"100B"  },
    { id:"AVAX", name:"Avalanche", price:26.94,   chg: 3.17, vol:"780M",  mktCap:"11B"   },
    { id:"LINK", name:"Chainlink", price:18.24,   chg:-1.38, vol:"520M",  mktCap:"11B"   },
  ],
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COT DATA — All 4 trader categories | 6 weeks ending Feb 17 2026
// Units: thousands of contracts | Source: CFTC COT / TFF Reports (weekly, Fridays)
// Commodity uses Legacy COT: Commercial / Managed Money / Large Spec / Non-Reportable
// Financial uses TFF Report:  Dealer-Intermediary / Asset Mgr / Lev Funds / Other
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const W = ["Jan 13","Jan 20","Jan 27","Feb 3","Feb 10","Feb 17"];

// cotIndex = managed-money (or equiv) net as 52-week percentile (0=max short, 100=max long)
const COT_MARKETS = {
  // ── ENERGY ─────────────────────────────────────────────────────────────────
  CL: {
    name:"WTI Crude", sector:"energy", color:"#ffd600", cotIndex:78,
    catLabels:["Commercial","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    weeks:[
      {comm:{l:421,s:683},mm:{l:312,s:108},ls:{l: 89,s: 42},rt:{l:28,s:20},oi:1820},
      {comm:{l:418,s:689},mm:{l:319,s:106},ls:{l: 92,s: 40},rt:{l:29,s:20},oi:1834},
      {comm:{l:424,s:695},mm:{l:326,s:102},ls:{l: 96,s: 38},rt:{l:30,s:19},oi:1848},
      {comm:{l:427,s:701},mm:{l:331,s: 99},ls:{l: 99,s: 37},rt:{l:31,s:19},oi:1861},
      {comm:{l:430,s:712},mm:{l:338,s: 96},ls:{l:103,s: 36},rt:{l:32,s:19},oi:1875},
      {comm:{l:435,s:724},mm:{l:352,s: 88},ls:{l:108,s: 34},rt:{l:33,s:18},oi:1891},
    ],
  },
  NG: {
    name:"Natural Gas", sector:"energy", color:"#00bfa5", cotIndex:12,
    catLabels:["Commercial","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    weeks:[
      {comm:{l:382,s:294},mm:{l:182,s:244},ls:{l:48,s: 82},rt:{l:19,s:14},oi:1284},
      {comm:{l:386,s:298},mm:{l:191,s:258},ls:{l:46,s: 86},rt:{l:20,s:14},oi:1296},
      {comm:{l:378,s:295},mm:{l:198,s:271},ls:{l:44,s: 89},rt:{l:20,s:14},oi:1302},
      {comm:{l:374,s:291},mm:{l:203,s:284},ls:{l:42,s: 92},rt:{l:21,s:14},oi:1294},
      {comm:{l:371,s:288},mm:{l:197,s:279},ls:{l:41,s: 90},rt:{l:21,s:14},oi:1282},
      {comm:{l:368,s:284},mm:{l:190,s:286},ls:{l:39,s: 93},rt:{l:22,s:14},oi:1274},
    ],
  },
  // ── METALS ─────────────────────────────────────────────────────────────────
  GC: {
    name:"Gold", sector:"metals", color:"#ffd600", cotIndex:38,
    catLabels:["Commercial","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    weeks:[
      {comm:{l: 92,s:290},mm:{l:182,s:28},ls:{l:62,s:16},rt:{l:14,s: 9},oi:488},
      {comm:{l: 94,s:298},mm:{l:175,s:32},ls:{l:60,s:17},rt:{l:14,s:10},oi:492},
      {comm:{l: 96,s:312},mm:{l:168,s:38},ls:{l:58,s:18},rt:{l:14,s:10},oi:501},
      {comm:{l: 98,s:318},mm:{l:161,s:42},ls:{l:55,s:19},rt:{l:14,s:10},oi:494},
      {comm:{l: 97,s:312},mm:{l:156,s:46},ls:{l:54,s:20},rt:{l:14,s:10},oi:489},
      {comm:{l: 96,s:308},mm:{l:152,s:48},ls:{l:53,s:21},rt:{l:14,s:10},oi:486},
    ],
  },
  SI: {
    name:"Silver", sector:"metals", color:"#9e9e9e", cotIndex:72,
    catLabels:["Commercial","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    weeks:[
      {comm:{l:38,s: 98},mm:{l:72,s:14},ls:{l:24,s:7},rt:{l:10,s:7},oi:178},
      {comm:{l:40,s:104},mm:{l:78,s:12},ls:{l:26,s:7},rt:{l:11,s:7},oi:188},
      {comm:{l:42,s:112},mm:{l:82,s:11},ls:{l:28,s:7},rt:{l:11,s:7},oi:196},
      {comm:{l:41,s:108},mm:{l:76,s:13},ls:{l:26,s:7},rt:{l:10,s:7},oi:184},
      {comm:{l:40,s:104},mm:{l:70,s:16},ls:{l:24,s:8},rt:{l:10,s:7},oi:176},
      {comm:{l:39,s:102},mm:{l:68,s:18},ls:{l:23,s:8},rt:{l:10,s:7},oi:172},
    ],
  },
  HG: {
    name:"Copper", sector:"metals", color:"#ff7043", cotIndex:68,
    catLabels:["Commercial","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    weeks:[
      {comm:{l:58,s:118},mm:{l:72,s:22},ls:{l:26,s:10},rt:{l:12,s:9},oi:232},
      {comm:{l:60,s:124},mm:{l:76,s:20},ls:{l:27,s: 9},rt:{l:12,s:9},oi:238},
      {comm:{l:62,s:128},mm:{l:80,s:19},ls:{l:28,s: 9},rt:{l:13,s:9},oi:244},
      {comm:{l:64,s:132},mm:{l:82,s:19},ls:{l:29,s: 9},rt:{l:13,s:8},oi:247},
      {comm:{l:63,s:130},mm:{l:81,s:20},ls:{l:28,s: 9},rt:{l:13,s:8},oi:242},
      {comm:{l:62,s:128},mm:{l:80,s:21},ls:{l:27,s: 9},rt:{l:13,s:8},oi:238},
    ],
  },
  // ── FINANCIAL — uses CFTC TFF report categories ──────────────────────────
  ES: {
    name:"S&P 500", sector:"financial", color:"#00e5ff", cotIndex:62,
    catLabels:["Asset Mgr/Inst","Lev. Funds","Large Spec","Retail"],
    catColors:["#00e5ff","#ff7043","#ab47bc","rgba(255,255,255,0.45)"],
    note:"TFF Report — Asset Mgr = structural longs; Lev Funds = hedgers/shorts",
    weeks:[
      {comm:{l:948,s:218},mm:{l:298,s:612},ls:{l: 92,s:78},rt:{l:52,s:42},oi:2842},
      {comm:{l:956,s:222},mm:{l:288,s:624},ls:{l: 90,s:80},rt:{l:51,s:43},oi:2848},
      {comm:{l:962,s:228},mm:{l:278,s:638},ls:{l: 88,s:82},rt:{l:50,s:44},oi:2852},
      {comm:{l:958,s:232},mm:{l:284,s:628},ls:{l: 90,s:80},rt:{l:51,s:43},oi:2844},
      {comm:{l:964,s:236},mm:{l:292,s:618},ls:{l: 92,s:78},rt:{l:52,s:42},oi:2858},
      {comm:{l:972,s:240},mm:{l:302,s:608},ls:{l: 94,s:76},rt:{l:53,s:41},oi:2874},
    ],
  },
  ZB: {
    name:"30Y T-Bond", sector:"financial", color:"#ab47bc", cotIndex:58,
    catLabels:["Dealer/Intermediary","Asset Mgr","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    note:"TFF Report — Dealers net short (rate hedging); Asset Mgrs net long",
    weeks:[
      {comm:{l:192,s:398},mm:{l:298,s:134},ls:{l:62,s:128},rt:{l:22,s:28},oi:1184},
      {comm:{l:188,s:412},mm:{l:312,s:128},ls:{l:60,s:132},rt:{l:22,s:28},oi:1192},
      {comm:{l:184,s:428},mm:{l:322,s:122},ls:{l:58,s:138},rt:{l:22,s:28},oi:1198},
      {comm:{l:182,s:438},mm:{l:316,s:126},ls:{l:56,s:136},rt:{l:21,s:28},oi:1186},
      {comm:{l:186,s:432},mm:{l:308,s:130},ls:{l:58,s:134},rt:{l:22,s:28},oi:1192},
      {comm:{l:189,s:428},mm:{l:318,s:124},ls:{l:60,s:130},rt:{l:22,s:28},oi:1198},
    ],
  },
  "6E": {
    name:"Euro FX", sector:"financial", color:"#42a5f5", cotIndex:74,
    catLabels:["Dealer/Corp","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    note:"FX Legacy COT — Dealers net short (hedging FX exposure); MM building USD-bearish longs",
    weeks:[
      {comm:{l:148,s:258},mm:{l:132,s:42},ls:{l:62,s:24},rt:{l:22,s:30},oi:686},
      {comm:{l:152,s:264},mm:{l:138,s:40},ls:{l:64,s:23},rt:{l:22,s:30},oi:694},
      {comm:{l:148,s:268},mm:{l:144,s:38},ls:{l:66,s:22},rt:{l:22,s:30},oi:698},
      {comm:{l:152,s:272},mm:{l:148,s:36},ls:{l:68,s:21},rt:{l:22,s:30},oi:706},
      {comm:{l:156,s:276},mm:{l:152,s:35},ls:{l:70,s:21},rt:{l:22,s:30},oi:712},
      {comm:{l:158,s:278},mm:{l:156,s:34},ls:{l:72,s:20},rt:{l:22,s:30},oi:718},
    ],
  },
  "6J": {
    name:"Yen FX", sector:"financial", color:"#ef5350", cotIndex:22,
    catLabels:["Dealer/Corp","Managed Money","Large Spec","Retail"],
    catColors:["#ff7043","#00e5ff","#ab47bc","rgba(255,255,255,0.45)"],
    note:"FX Legacy COT — MM deeply net short (carry trade borrowing yen); retail fading",
    weeks:[
      {comm:{l:88,s:44},mm:{l:32,s:108},ls:{l:16,s:54},rt:{l:20,s:14},oi:274},
      {comm:{l:90,s:46},mm:{l:30,s:112},ls:{l:15,s:56},rt:{l:20,s:14},oi:278},
      {comm:{l:88,s:48},mm:{l:28,s:116},ls:{l:14,s:58},rt:{l:20,s:14},oi:276},
      {comm:{l:86,s:48},mm:{l:30,s:112},ls:{l:15,s:56},rt:{l:20,s:14},oi:272},
      {comm:{l:88,s:47},mm:{l:32,s:109},ls:{l:15,s:55},rt:{l:20,s:14},oi:274},
      {comm:{l:90,s:46},mm:{l:34,s:106},ls:{l:16,s:53},rt:{l:20,s:14},oi:278},
    ],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIX TERM STRUCTURE + VVIX — 6 weeks | Source: CBOE (weekly)
// d9=VIX9D  d30=VIX(30d)  m3=VIX3M  m6=VIX6M  vvix=VVIX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const VIX_DATA = [
  {w:"Jan 13", d9:16.2, d30:17.8, m3:18.9, m6:20.1, vvix:108.4},
  {w:"Jan 20", d9:22.8, d30:19.4, m3:18.1, m6:19.8, vvix:124.6}, // DeepSeek panic spike
  {w:"Jan 27", d9:18.4, d30:18.2, m3:18.4, m6:19.6, vvix:112.8},
  {w:"Feb 3",  d9:15.8, d30:16.6, m3:17.8, m6:19.2, vvix:98.4 },
  {w:"Feb 10", d9:14.8, d30:16.2, m3:17.4, m6:18.8, vvix:96.2 },
  {w:"Feb 17", d9:13.8, d30:15.6, m3:17.2, m6:18.9, vvix:94.2 }, // current — calm ST, mild LT concern
];
// VIX curve data for multi-line term structure chart
const VIX_TENORS = ["VIX9D","VIX","VIX3M","VIX6M"];
const vixCurveWeeks = [
  {label:"Jan 20 (spike)", color:"rgba(255,23,68,0.5)",   data:[22.8,19.4,18.1,19.8], dash:"4 3"},
  {label:"Feb 3",          color:"rgba(255,255,255,0.25)", data:[15.8,16.6,17.8,19.2], dash:"2 2"},
  {label:"Feb 17 (now)",   color:"#00e5ff",                data:[13.8,15.6,17.2,18.9], dash:""},
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fmt   = (n,d=2) => n>=1000 ? n.toLocaleString("en-US",{maximumFractionDigits:d}) : n.toFixed(d);
const fmtK  = (n) => Math.abs(n)>=1e6?`${(n/1e6).toFixed(2)}M`:Math.abs(n)>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);
const pct   = (n) => `${n>=0?"+":""}${n.toFixed(2)}%`;
const hRGB  = (hex) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `${r},${g},${b}`; };
const CAT_COLOR = {equity:"#00e5ff",commodity:"#ffd600",crypto:"#76ff03"};
const POS="#00e676", NEG="#ff1744", ACCENT="#ffd600";
const NET = (cat) => cat.l - cat.s;

function generateHistory(base,n=60,v=0.007) {
  const arr=[]; let p=base*(0.97+Math.random()*0.02);
  for(let i=0;i<n;i++){p=p*(1+(Math.random()-0.49)*v);arr.push({t:i,p:parseFloat(p.toFixed(base>=1000?1:base>=10?2:4))});}
  return arr;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BASE COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Spark({data,color}) {
  const id=`sg${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={data} margin={{top:2,right:0,bottom:2,left:0}}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="10%" stopColor={color} stopOpacity={0.3}/>
          <stop offset="95%" stopColor={color} stopOpacity={0}/>
        </linearGradient></defs>
        <Area type="monotone" dataKey="p" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AssetCard({asset,history,category,isSelected,onClick}) {
  const color=CAT_COLOR[category]; const isPos=asset.chg>=0; const chgC=isPos?POS:NEG;
  const [flash,setFlash]=useState(false);
  useEffect(()=>{setFlash(true);const t=setTimeout(()=>setFlash(false),280);return()=>clearTimeout(t);},[asset.price]);
  return (
    <div onClick={onClick} style={{
      background:isSelected?`linear-gradient(135deg,rgba(${hRGB(color)},0.13),rgba(${hRGB(color)},0.03))`:"rgba(10,12,20,0.75)",
      border:isSelected?`1px solid ${color}`:"1px solid rgba(255,255,255,0.07)",
      borderRadius:4,padding:"11px 12px 7px",cursor:"pointer",position:"relative",overflow:"hidden",transition:"all 0.18s",
      boxShadow:isSelected?`0 0 18px rgba(${hRGB(color)},0.18)`:"none",
    }}>
      <div style={{position:"absolute",top:0,left:0,width:isSelected?3:2,height:"100%",background:color,opacity:isSelected?1:0.22,transition:"all 0.18s"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
        <div>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color,letterSpacing:0.8}}>{asset.id}</span>
          {asset.src&&<span style={{marginLeft:5,fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.28)",letterSpacing:1}}>{asset.src}</span>}
          <div style={{fontFamily:"'Syne',sans-serif",fontSize:8.5,color:"rgba(255,255,255,0.33)",marginTop:1}}>{asset.name}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:600,color:flash?chgC:"#e8eaf0",transition:"color 0.22s"}}>
            {fmt(asset.price,asset.price>=100?2:asset.price>=1?3:4)}
            {asset.unit&&<span style={{fontSize:7,color:"rgba(255,255,255,0.28)",marginLeft:2}}>{asset.unit}</span>}
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:chgC}}>{pct(asset.chg)}</div>
        </div>
      </div>
      <Spark data={history} color={isPos?POS:NEG}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.23)"}}>VOL {asset.vol}</span>
        {asset.mktCap!=="—"&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.23)"}}>MC {asset.mktCap}</span>}
      </div>
    </div>
  );
}

function MainChart({asset,history,category}) {
  const color=CAT_COLOR[category]; const base=history[0]?.p||0,latest=history[history.length-1]?.p||0; const lc=latest>=base?POS:NEG;
  const CT=({active,payload})=>!active||!payload?.length?null:(
    <div style={{background:"rgba(4,6,12,0.97)",border:`1px solid ${color}`,borderRadius:2,padding:"5px 10px",fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"#e8eaf0"}}>
      <div style={{color,fontSize:9,letterSpacing:1}}>{asset.id}</div>
      <div>{fmt(payload[0].value,asset.price>=100?2:3)}{asset.unit||""}</div>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={history} margin={{top:8,right:8,bottom:0,left:8}}>
        <defs><linearGradient id="mcg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={lc} stopOpacity={0.2}/><stop offset="95%" stopColor={lc} stopOpacity={0.01}/>
        </linearGradient></defs>
        <XAxis dataKey="t" hide/>
        <YAxis domain={["auto","auto"]} tickFormatter={(v)=>fmt(v,v>=1000?0:2)} width={62}
          tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
        <Tooltip content={<CT/>}/>
        <Area type="monotone" dataKey="p" stroke={lc} strokeWidth={2} fill="url(#mcg)" dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function HeatMap({allAssets}) {
  const all=Object.entries(allAssets).flatMap(([cat,arr])=>arr.map(a=>({...a,cat})));
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3}}>
      {all.map(a=>{
        const intensity=Math.min(Math.abs(a.chg)/5,1);
        const bg=a.chg>=0?`rgba(0,230,118,${0.1+intensity*0.5})`:`rgba(255,23,68,${0.1+intensity*0.5})`;
        return (<div key={a.id} style={{background:bg,borderRadius:2,padding:"6px 4px",textAlign:"center"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:"#fff",fontWeight:700}}>{a.id}</div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:a.chg>=0?POS:NEG}}>{pct(a.chg)}</div>
        </div>);
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COT INDEX GAUGE — horizontal percentile bar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function COTIndexGauge({label,value,color,onClick,isSelected}) {
  const pctVal = value/100;
  const gaugeColor = value>75?"#00e676":value>50?"#ffee58":value>25?"#ffa726":"#ff1744";
  return (
    <div onClick={onClick} style={{
      padding:"9px 12px",borderRadius:3,cursor:"pointer",
      background:isSelected?`rgba(${hRGB(color)},0.1)`:"rgba(255,255,255,0.02)",
      border:isSelected?`1px solid ${color}`:"1px solid rgba(255,255,255,0.06)",
      transition:"all 0.15s",marginBottom:6,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:isSelected?color:"rgba(255,255,255,0.6)",letterSpacing:0.8}}>{label}</span>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:gaugeColor,fontWeight:700}}>{value}<span style={{fontSize:7,opacity:0.6}}>%ile</span></span>
      </div>
      <div style={{background:"rgba(255,255,255,0.08)",borderRadius:2,height:5,overflow:"hidden"}}>
        <div style={{width:`${value}%`,height:"100%",background:gaugeColor,borderRadius:2,transition:"width 0.4s",boxShadow:`0 0 6px ${gaugeColor}55`}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:6.5,color:"rgba(255,255,255,0.2)"}}>MAX SHORT</span>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:6.5,color:"rgba(255,255,255,0.2)"}}>MAX LONG</span>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW MATRIX — the centerpiece OI change visualization
// Shows: ΔGross Long | ΔGross Short | ΔNet | Current Net | 6-week sparkline
// Color intensity = magnitude; sign meaning is directionally corrected per column
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FlowMatrix({mkt}) {
  const cats   = ["comm","mm","ls","rt"];
  const curr   = mkt.weeks[mkt.weeks.length-1];
  const prev   = mkt.weeks[mkt.weeks.length-2];
  const scale  = Math.max(...cats.flatMap(c=>[Math.abs(curr[c].l-prev[c].l),Math.abs(curr[c].s-prev[c].s)]));

  const cellBg = (val, isLongCol) => {
    // ΔLong: positive = bullish (buying). ΔShort: positive = bearish (adding shorts)
    const bullish = isLongCol ? val > 0 : val < 0;
    const intensity = Math.min(Math.abs(val)/Math.max(scale,1)*0.7,0.7);
    return bullish ? `rgba(0,230,118,${0.06+intensity})` : `rgba(255,23,68,${0.06+intensity})`;
  };
  const netBg = (val) => {
    const intensity = Math.min(Math.abs(val)/Math.max(scale,1)*0.7,0.7);
    return val>=0?`rgba(0,230,118,${0.06+intensity})`:`rgba(255,23,68,${0.06+intensity})`;
  };
  const arrow = (v) => v>0?"▲":v<0?"▼":"–";
  const arrowColor = (v,isLongCol) => {
    const bull = isLongCol ? v>0 : v<0;
    return v===0?"rgba(255,255,255,0.3)":bull?POS:NEG;
  };

  // Total OI change
  const dOI = curr.oi - prev.oi;
  // Per-category sparklines (6w net)
  const sparkData = (key) => mkt.weeks.map((w,i)=>({t:i,p:NET(w[key])}));

  const TH = ({children}) => (
    <th style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:1.2,padding:"6px 10px",textAlign:"right",fontWeight:400,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
      {children}
    </th>
  );

  return (
    <div style={{overflowX:"auto"}}>
      {/* Header row annotation */}
      <div style={{display:"flex",gap:16,marginBottom:8,alignItems:"center"}}>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:1.5}}>POSITION FLOW MATRIX — WEEK OF {W[W.length-1]}</span>
        <div style={{display:"flex",gap:10}}>
          {[["▲ Δ LONG","buying new longs",POS],["▼ Δ LONG","liquidating longs",NEG],["▲ Δ SHORT","adding new shorts",NEG],["▼ Δ SHORT","covering/buying back",POS]].map(([s,d,c])=>(
            <span key={s} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.25)"}}>
              <span style={{color:c}}>{s}</span> = {d}
            </span>
          ))}
        </div>
      </div>

      <table style={{width:"100%",borderCollapse:"collapse",fontSize:9}}>
        <thead>
          <tr style={{background:"rgba(255,255,255,0.02)"}}>
            <TH>CATEGORY</TH>
            <TH>Δ GROSS LONG</TH>
            <TH>Δ GROSS SHORT</TH>
            <TH>Δ NET</TH>
            <TH>CURRENT NET</TH>
            <TH>CURRENT GROSS L</TH>
            <TH>CURRENT GROSS S</TH>
            <TH>6W TREND</TH>
          </tr>
        </thead>
        <tbody>
          {cats.map((ck,ci)=>{
            const c=curr[ck], p=prev[ck];
            const dL=c.l-p.l, dS=c.s-p.s, dN=NET(c)-NET(p);
            const currNet=NET(c);
            const catColor=mkt.catColors[ci];
            const sp=sparkData(ck);
            return (
              <tr key={ck} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                {/* Category */}
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:3,height:24,background:catColor,borderRadius:2,flexShrink:0}}/>
                    <div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:"rgba(255,255,255,0.8)",fontWeight:600}}>{mkt.catLabels[ci]}</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.25)",marginTop:1}}>
                        {ci===0?"Hedgers / structural":""}
                        {ci===1?"Directional spec / CTA":""}
                        {ci===2?"Large non-commercial":""}
                        {ci===3?"Small traders / retail":""}
                      </div>
                    </div>
                  </div>
                </td>
                {/* Δ Gross Long */}
                <td style={{padding:"8px 10px",background:cellBg(dL,true),textAlign:"right"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:arrowColor(dL,true),fontWeight:600}}>
                    {arrow(dL)} {dL>=0?"+":""}{fmtK(dL*1000)}
                  </span>
                </td>
                {/* Δ Gross Short */}
                <td style={{padding:"8px 10px",background:cellBg(dS,false),textAlign:"right"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:arrowColor(dS,false),fontWeight:600}}>
                    {arrow(dS)} {dS>=0?"+":""}{fmtK(dS*1000)}
                  </span>
                </td>
                {/* Δ Net */}
                <td style={{padding:"8px 10px",background:netBg(dN),textAlign:"right"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dN>=0?POS:NEG,fontWeight:700}}>
                    {dN>=0?"+":""}{fmtK(dN*1000)}
                  </span>
                </td>
                {/* Current Net */}
                <td style={{padding:"8px 10px",textAlign:"right"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:currNet>=0?POS:NEG,fontWeight:600}}>
                    {currNet>=0?"+":""}{fmtK(currNet*1000)}
                  </span>
                </td>
                {/* Gross L / S */}
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)"}}>{fmtK(c.l*1000)}</td>
                <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)"}}>{fmtK(c.s*1000)}</td>
                {/* 6W Spark */}
                <td style={{padding:"4px 8px",width:90}}>
                  <Spark data={sp} color={NET(c)>=0?POS:NEG}/>
                </td>
              </tr>
            );
          })}
          {/* Total OI row */}
          <tr style={{background:"rgba(255,255,255,0.03)",borderTop:"1px solid rgba(255,255,255,0.1)"}}>
            <td style={{padding:"7px 10px",fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>TOTAL OPEN INTEREST</td>
            <td colSpan={2} style={{padding:"7px 10px",textAlign:"right"}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:"rgba(255,255,255,0.35)"}}>
                Prior: {fmtK(prev.oi*1000)} → Current: {fmtK(curr.oi*1000)}
              </span>
            </td>
            <td style={{padding:"7px 10px",background:netBg(dOI),textAlign:"right"}}>
              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:dOI>=0?POS:NEG,fontWeight:700}}>
                {dOI>=0?"+":""}{fmtK(dOI*1000)}
              </span>
            </td>
            <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.5)"}}>{fmtK(curr.oi*1000)}</td>
            <td colSpan={3}/>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RATE OF CHANGE TABLE — last 3 weeks, % WoW change in net position per category
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RateOfChange({mkt}) {
  const cats=["comm","mm","ls","rt"];
  const last3 = mkt.weeks.slice(-4); // 3 periods = 4 data points
  const periods = last3.slice(1).map((curr,i)=>{
    const prev=last3[i];
    return {
      week:W[W.length-3+i],
      cats:cats.map(ck=>{
        const currNet=NET(curr[ck]), prevNet=NET(prev[ck]);
        const absChg = currNet-prevNet;
        const pctChg = prevNet!==0 ? ((currNet-prevNet)/Math.abs(prevNet))*100 : 0;
        return {absChg, pctChg};
      })
    };
  });

  const intensity = (v) => Math.min(Math.abs(v)/30,1)*0.65;
  const cellC = (v) => v>=0?`rgba(0,230,118,${0.08+intensity(v)})`:`rgba(255,23,68,${0.08+intensity(Math.abs(v))})`;

  return (
    <div>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.28)",letterSpacing:1.5,marginBottom:8}}>
        RATE OF CHANGE — WoW % CHANGE IN NET POSITION (ACCELERATION / DECELERATION)
      </div>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",padding:"5px 10px",textAlign:"left",fontWeight:400,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>CATEGORY</th>
            {periods.map(p=>(
              <th key={p.week} colSpan={2} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",padding:"5px 10px",textAlign:"center",fontWeight:400,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                {p.week}
              </th>
            ))}
          </tr>
          <tr>
            <th style={{padding:"3px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}/>
            {periods.flatMap(()=>["Δ Abs","Δ%"].map(l=>(
              <th key={l} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.2)",padding:"3px 8px",textAlign:"right",fontWeight:400,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{l}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {cats.map((ck,ci)=>(
            <tr key={ck} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <td style={{padding:"6px 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:mkt.catColors[ci],flexShrink:0}}/>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:"rgba(255,255,255,0.7)"}}>{mkt.catLabels[ci]}</span>
                </div>
              </td>
              {periods.map((p,pi)=>{
                const {absChg,pctChg}=p.cats[ci];
                return [
                  <td key={`abs${pi}`} style={{padding:"6px 8px",background:cellC(absChg),textAlign:"right"}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:absChg>=0?POS:NEG,fontWeight:600}}>
                      {absChg>=0?"+":""}{fmtK(absChg*1000)}
                    </span>
                  </td>,
                  <td key={`pct${pi}`} style={{padding:"6px 8px",background:cellC(pctChg),textAlign:"right"}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:pctChg>=0?POS:NEG}}>
                      {pctChg>=0?"+":""}{pctChg.toFixed(1)}%
                    </span>
                  </td>
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIX STRUCTURE — term structure curve + VVIX + weekly VIX history
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function VIXStructure() {
  const latest = VIX_DATA[VIX_DATA.length-1];
  // Build tenor chart data — 4 points per line
  const tenorData = VIX_TENORS.map((t,ti)=>({tenor:t,...Object.fromEntries(vixCurveWeeks.map(w=>([w.label,w.data[ti]])))}));

  // Slope signal
  const currSlope = latest.m6 - latest.d9;
  const spikeWeek = VIX_DATA[1]; // Jan 20 spike
  const slopeLabel = latest.d9 > latest.d30 ? "INVERTED (short-term fear)" : currSlope > 3 ? "CONTANGO (calm spot, future concern)" : "FLAT (uniform vol pricing)";
  const slopeColor = latest.d9 > latest.d30 ? NEG : currSlope > 3 ? "#ffee58" : POS;

  const CTVix = ({active,payload,label:lb})=>!active||!payload?.length?null:(
    <div style={{background:"rgba(4,6,12,0.97)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:2,padding:"5px 10px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9,color:"#e8eaf0"}}>
      <div style={{color:"rgba(255,255,255,0.5)",marginBottom:3}}>{lb}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color||"#fff"}}>{p.name}: {p.value?.toFixed(1)}</div>)}
    </div>
  );

  const Panel = ({title,children,style={}})=>(
    <div style={{background:"rgba(8,11,20,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"14px 16px",...style}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:2,marginBottom:10}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{marginTop:14}}>
      {/* Section label */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
        <div style={{width:20,height:1,background:"#00e5ff"}}/>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"#00e5ff",letterSpacing:2}}>CBOE VOLATILITY STRUCTURE</span>
        <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)"}}>SOURCE: CBOE · VIX9D / VIX / VIX3M / VIX6M / VVIX</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 220px",gap:12}}>

        {/* VIX Term Structure Curve */}
        <Panel title="VIX TERM STRUCTURE — 3 SNAPSHOTS OVERLAID">
          <div style={{marginBottom:8,display:"flex",gap:14}}>
            {vixCurveWeeks.map(w=>(
              <div key={w.label} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:18,height:2,background:w.color,borderRadius:2,borderStyle:w.dash?"dashed":"solid"}}/>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.4)"}}>{w.label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={tenorData} margin={{top:4,right:8,bottom:0,left:0}}>
              <XAxis dataKey="tenor" tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,fill:"rgba(255,255,255,0.4)"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[10,26]} width={28} tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CTVix/>}/>
              {vixCurveWeeks.map(w=>(
                <Line key={w.label} type="monotone" dataKey={w.label} name={w.label}
                  stroke={w.color} strokeWidth={w.dash?"1.5":2.5} dot={{r:3,fill:w.color,stroke:"#05070c",strokeWidth:1}}
                  strokeDasharray={w.dash} isAnimationActive={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)"}}>CURRENT SHAPE:</span>
            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:slopeColor,fontWeight:700}}>{slopeLabel}</span>
          </div>
        </Panel>

        {/* Weekly VIX history + VVIX */}
        <Panel title="VIX WEEKLY HISTORY + VVIX (VOL OF VOL)">
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={VIX_DATA} margin={{top:4,right:4,bottom:0,left:0}}>
              <XAxis dataKey="w" tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
              <YAxis domain={[10,26]} width={26} tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CTVix/>}/>
              <ReferenceLine y={20} stroke="rgba(255,23,68,0.2)" strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="d9"  name="VIX9D" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="3 2"/>
              <Line type="monotone" dataKey="d30" name="VIX"   stroke="#00e5ff" strokeWidth={2} dot={{r:3,fill:"#00e5ff"}} isAnimationActive={false}/>
              <Line type="monotone" dataKey="m3"  name="VIX3M" stroke="rgba(0,229,255,0.4)" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 2"/>
              <Line type="momentone" dataKey="m6"  name="VIX6M" stroke="rgba(0,229,255,0.2)" strokeWidth={1} dot={false} isAnimationActive={false} strokeDasharray="2 2"/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{marginTop:8}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",marginBottom:5}}>VVIX (VIX OF VIX)</div>
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={VIX_DATA} margin={{top:2,right:4,bottom:0,left:0}}>
                <defs><linearGradient id="vvixg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#ab47bc" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#ab47bc" stopOpacity={0}/>
                </linearGradient></defs>
                <XAxis dataKey="w" tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[85,130]} width={26} tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
                <ReferenceLine y={100} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3"/>
                <Area type="monotone" dataKey="vvix" name="VVIX" stroke="#ab47bc" strokeWidth={2} fill="url(#vvixg)" dot={{r:3,fill:"#ab47bc"}} isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Current readings + signal card */}
        <Panel title="CURRENT READINGS">
          {[
            {label:"VIX9D",  val:latest.d9,  color:"rgba(255,255,255,0.6)", note:"9-day implied vol"},
            {label:"VIX",    val:latest.d30, color:"#00e5ff",               note:"30-day (benchmark)"},
            {label:"VIX3M",  val:latest.m3,  color:"rgba(0,229,255,0.5)",   note:"3-month implied"},
            {label:"VIX6M",  val:latest.m6,  color:"rgba(0,229,255,0.3)",   note:"6-month implied"},
            {label:"VVIX",   val:latest.vvix,color:"#ab47bc",               note:"Vol of vol"},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:r.color,fontWeight:600}}>{r.label}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.22)"}}>{r.note}</div>
              </div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:r.color,fontWeight:700}}>{r.val.toFixed(1)}</div>
            </div>
          ))}
          <div style={{marginTop:10,padding:"8px 10px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:3}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",marginBottom:4,letterSpacing:1}}>STRUCTURE SIGNAL</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:"rgba(255,255,255,0.7)",lineHeight:1.6}}>
              Jan 20 spike (VIX9D 22.8) was a short-term fear event — quickly absorbed. Current curve is in normal contango; short-term calm but market paying up for tail protection at 3M+. VVIX at 94 = vol regime stable. No regime change signal.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUTURES FLOW TAB — complete
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FuturesFlowTab() {
  const [sector, setSector] = useState("energy");
  const [market, setMarket] = useState("CL");

  const sectors=[
    {key:"energy",   label:"ENERGY",    markets:["CL","NG"]},
    {key:"metals",   label:"METALS",    markets:["GC","SI","HG"]},
    {key:"financial",label:"FINANCIAL", markets:["ES","ZB","6E","6J"]},
  ];

  const sectorMarkets = sectors.find(s=>s.key===sector)?.markets||[];
  const mkt = COT_MARKETS[market];

  const curr=mkt.weeks[mkt.weeks.length-1], prev=mkt.weeks[mkt.weeks.length-2];
  const cats=["comm","mm","ls","rt"];

  // KPIs
  const mmNet=NET(curr.mm), mmNetPrev=NET(prev.mm);
  const dOI=(curr.oi-prev.oi)*1000;
  const mostActiveKey = cats.reduce((best,ck)=>{
    const change=Math.abs(NET(curr[ck])-NET(prev[ck]));
    return change>Math.abs(NET(curr[best])-NET(prev[best]))?ck:best;
  },"comm");
  const mostActiveLabel=mkt.catLabels[cats.indexOf(mostActiveKey)];

  // Historical net positioning chart data
  const histData = W.map((w,i)=>({
    w, comm:NET(mkt.weeks[i].comm), mm:NET(mkt.weeks[i].mm),
    ls:NET(mkt.weeks[i].ls), rt:NET(mkt.weeks[i].rt),
  }));

  const CTHist = ({active,payload,label:lb})=>!active||!payload?.length?null:(
    <div style={{background:"rgba(4,6,12,0.97)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:2,padding:"6px 10px",fontFamily:"'IBM Plex Mono',monospace",fontSize:9}}>
      <div style={{color:"rgba(255,255,255,0.4)",marginBottom:3}}>{lb}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: {p.value>=0?"+":""}{fmtK(p.value*1000)}</div>)}
    </div>
  );

  const Panel=({title,children,style={}})=>(
    <div style={{background:"rgba(8,11,20,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"14px 16px",...style}}>
      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:2,marginBottom:10}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      {/* Source banner */}
      <div style={{background:"rgba(255,214,0,0.05)",border:"1px solid rgba(255,214,0,0.15)",borderRadius:4,padding:"8px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:ACCENT,letterSpacing:1.5}}>DATA SOURCES</span>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,color:"rgba(255,255,255,0.45)"}}>
          CFTC Legacy COT (commodity) · CFTC TFF Report (financial futures) · CBOE VIX/VVIX term structure ·
          Week ending Feb 17 2026, released Feb 21 · All positions in thousands of contracts
        </span>
      </div>

      {/* Sector tabs */}
      <div style={{display:"flex",gap:4,marginBottom:12}}>
        {sectors.map(s=>(
          <button key={s.key} onClick={()=>{setSector(s.key);setMarket(sectors.find(x=>x.key===s.key).markets[0]);}} style={{
            fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,letterSpacing:1.2,padding:"5px 14px",borderRadius:2,border:"none",cursor:"pointer",transition:"all 0.14s",
            background:sector===s.key?ACCENT:"rgba(255,255,255,0.05)",
            color:sector===s.key?"#05070c":"rgba(255,255,255,0.4)",fontWeight:sector===s.key?700:400,
          }}>{s.label}</button>
        ))}
      </div>

      {/* Market selector */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {sectorMarkets.map(mk=>{
          const m=COT_MARKETS[mk]; const isSel=market===mk;
          return (
            <button key={mk} onClick={()=>setMarket(mk)} style={{
              fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,letterSpacing:1,padding:"4px 14px",borderRadius:2,
              border:isSel?`1px solid ${m.color}`:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",transition:"all 0.14s",
              background:isSel?`rgba(${hRGB(m.color)},0.12)`:"rgba(255,255,255,0.02)",
              color:isSel?m.color:"rgba(255,255,255,0.4)",fontWeight:isSel?700:400,
            }}>
              {mk} <span style={{fontSize:7,opacity:0.6}}>· {m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Financial note */}
      {mkt.note && (
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.3)",marginBottom:12,padding:"5px 10px",background:"rgba(255,255,255,0.02)",borderLeft:"2px solid rgba(255,255,255,0.1)",borderRadius:"0 2px 2px 0"}}>
          ℹ {mkt.note}
        </div>
      )}

      {/* KPI row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {label:"COT INDEX (52W %ILE)", value:`${mkt.cotIndex}th`, sub:"MM net vs 52-week range",
           col:mkt.cotIndex>70?"#00e676":mkt.cotIndex>40?"#ffee58":"#ff1744"},
          {label:"MM NET CHANGE",value:`${mmNet-mmNetPrev>=0?"+":""}${fmtK((mmNet-mmNetPrev)*1000)}`,sub:"vs prior week",col:mmNet-mmNetPrev>=0?POS:NEG},
          {label:"TOTAL OI CHANGE",value:`${dOI>=0?"+":""}${fmtK(dOI)}`,sub:"contracts WoW",col:dOI>=0?POS:NEG},
          {label:"MOST ACTIVE",value:mostActiveLabel,sub:"largest net shift this week",col:mkt.color},
        ].map(k=>(
          <div key={k.label} style={{background:"rgba(8,11,20,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"11px 14px"}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:1.5,marginBottom:5}}>{k.label}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:17,fontWeight:700,color:k.col,lineHeight:1}}>{k.value}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)",marginTop:4}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid: historical positioning + COT gauges */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:12,marginBottom:12}}>

        {/* Historical 4-line net positioning */}
        <Panel title={`${market} — HISTORICAL NET POSITION BY CATEGORY (6 WEEKS, ALL 4 TRADERS)`}>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={histData} margin={{top:4,right:8,bottom:0,left:0}}>
              <XAxis dataKey="w" tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,fill:"rgba(255,255,255,0.35)"}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>fmtK(v*1000)} width={52}
                tick={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,fill:"rgba(255,255,255,0.28)"}} axisLine={false} tickLine={false}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3"/>
              <Tooltip content={<CTHist/>}/>
              {["comm","mm","ls","rt"].map((ck,ci)=>(
                <Line key={ck} type="monotone" dataKey={ck} name={mkt.catLabels[ci]}
                  stroke={mkt.catColors[ci]} strokeWidth={ci===0||ci===1?2:1.5}
                  dot={{r:3,fill:mkt.catColors[ci],stroke:"#05070c",strokeWidth:1}}
                  strokeDasharray={ci===2?"4 2":ci===3?"2 2":""} isAnimationActive={false}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{display:"flex",gap:14,marginTop:8,flexWrap:"wrap"}}>
            {["comm","mm","ls","rt"].map((ck,ci)=>{
              const netVal=NET(curr[ck]);
              return (
                <div key={ck} style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:14,height:2,background:mkt.catColors[ci],borderRadius:2}}/>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.45)"}}>{mkt.catLabels[ci]}</span>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:netVal>=0?POS:NEG}}>({netVal>=0?"+":""}{fmtK(netVal*1000)})</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* COT Index gauges for all markets in current sector */}
        <Panel title="COT INDEX — ALL MARKETS">
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)",marginBottom:10,lineHeight:1.5}}>
            52-week percentile of MM net position. &gt;80 = crowded long. &lt;20 = crowded short.
          </div>
          {sectorMarkets.map(mk=>(
            <COTIndexGauge key={mk} label={`${mk} · ${COT_MARKETS[mk].name}`}
              value={COT_MARKETS[mk].cotIndex} color={COT_MARKETS[mk].color}
              onClick={()=>setMarket(mk)} isSelected={market===mk}/>
          ))}
          {/* Cross-sector quick view */}
          <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)",marginBottom:6}}>CROSS-SECTOR EXTREMES</div>
            {Object.entries(COT_MARKETS).filter(([k])=>!sectorMarkets.includes(k)).map(([k,m])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.35)"}}>{k}</span>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:40,height:3,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:`${m.cotIndex}%`,height:"100%",background:m.cotIndex>70?"#00e676":m.cotIndex>40?"#ffee58":"#ff1744",borderRadius:2}}/>
                  </div>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:m.cotIndex>70?POS:m.cotIndex>40?ACCENT:NEG,fontWeight:600}}>{m.cotIndex}%</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Flow Matrix */}
      <div style={{background:"rgba(8,11,20,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"14px 16px",marginBottom:12}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:2,marginBottom:10}}>
          OPEN INTEREST FLOW MATRIX — POSITION TAKING & ACTIVITY
        </div>
        <FlowMatrix mkt={mkt}/>
      </div>

      {/* Rate of Change */}
      <div style={{background:"rgba(8,11,20,0.85)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:"14px 16px",marginBottom:12}}>
        <RateOfChange mkt={mkt}/>
      </div>

      {/* VIX Structure — always visible */}
      <VIXStructure/>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function QuantDashboard() {
  const [assets,  setAssets]   = useState(ASSETS);
  const [hists,   setHists]    = useState(()=>{const h={};Object.values(ASSETS).flat().forEach(a=>{h[a.id]=generateHistory(a.price);});return h;});
  const [selected,setSelected] = useState({id:"GC",category:"commodity"});
  const [tab,     setTab]      = useState("futures");
  const [clock,   setClock]    = useState(new Date());
  const tickRef=useRef(null); const aRef=useRef(assets); aRef.current=assets;

  const tick=useCallback(()=>{
    setAssets(prev=>{const n={};Object.entries(prev).forEach(([cat,arr])=>{n[cat]=arr.map(a=>{const d=(Math.random()-0.492)*a.price*0.0014;return{...a,price:parseFloat(Math.max(a.price+d,0.001).toFixed(a.price>=100?2:a.price>=1?3:4))};});});return n;});
    setHists(prev=>{const n={};Object.values(aRef.current).flat().forEach(a=>{const h=prev[a.id]||[];const last=h[h.length-1]?.p||a.price;const d=(Math.random()-0.49)*last*0.001;n[a.id]=[...h.slice(-119),{t:h.length,p:parseFloat((last+d).toFixed(last>=100?2:last>=1?3:4))}];});return n;});
    setClock(new Date());
  },[]);

  useEffect(()=>{tickRef.current=setInterval(tick,1800);return()=>clearInterval(tickRef.current);},[tick]);

  const selAsset=Object.values(assets).flat().find(a=>a.id===selected.id);
  const selHist=hists[selected.id]||[];
  const all=Object.values(assets).flat();
  const gainers=all.filter(a=>a.chg>0).length, losers=all.filter(a=>a.chg<0).length;
  const avgChg=all.reduce((s,a)=>s+a.chg,0)/all.length;

  const TABS=[
    {key:"equity",   label:"EQUITY"},
    {key:"commodity",label:"COMMODITY"},
    {key:"crypto",   label:"CRYPTO"},
    {key:"futures",  label:"⬡ FUTURES & VOL FLOW", special:true},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;600;700&family=Syne:wght@400;600;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#05070c;}
        @keyframes ticker{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.18;}}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.09);border-radius:2px;}
        table{border-collapse:collapse;}
      `}</style>

      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#05070c 0%,#070a12 55%,#060810 100%)",color:"#e8eaf0",fontFamily:"'Syne',sans-serif",padding:"16px 20px",position:"relative"}}>
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)`,backgroundSize:"40px 40px"}}/>

        <div style={{position:"relative",zIndex:1,maxWidth:1500,margin:"0 auto"}}>

          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:11}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:POS,animation:"blink 2s ease-in-out infinite",boxShadow:`0 0 7px ${POS}`}}/>
                <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:19,fontWeight:800,letterSpacing:-0.5,background:"linear-gradient(90deg,#00e5ff,#76ff03)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ALPHA TERMINAL</h1>
              </div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)",letterSpacing:2,marginTop:2}}>
                MULTI-ASSET · COT ALL 4 CATEGORIES · VIX/VVIX STRUCTURE · SEEDED FEB 22 2026
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,color:"#00e5ff"}}>{clock.toLocaleTimeString("en-US",{hour12:false})}</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.25)",marginTop:2}}>{clock.toLocaleDateString("en-US",{weekday:"short",year:"numeric",month:"short",day:"numeric"})}</div>
            </div>
          </div>

          {/* Ticker */}
          <div style={{overflow:"hidden",whiteSpace:"nowrap",borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:7,marginBottom:12}}>
            <div style={{display:"inline-block",animation:"ticker 48s linear infinite"}}>
              {[...Object.entries(assets).flatMap(([cat,arr])=>arr.map(a=>({...a,cat}))),
                ...Object.entries(assets).flatMap(([cat,arr])=>arr.map(a=>({...a,cat})))].map((a,i)=>(
                <span key={i} style={{marginRight:24,fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5}}>
                  <span style={{color:CAT_COLOR[a.cat]}}>{a.id}</span>{" "}
                  <span style={{color:"#e8eaf0"}}>{fmt(a.price,a.price>=100?2:a.price>=1?3:4)}</span>{" "}
                  <span style={{color:a.chg>=0?POS:NEG}}>{pct(a.chg)}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{display:"flex",gap:22,marginBottom:13}}>
            {[{l:"GAINERS",v:gainers,c:POS},{l:"LOSERS",v:losers,c:NEG},
              {l:"AVG MOVE",v:`${avgChg>=0?"+":""}${avgChg.toFixed(2)}%`,c:avgChg>=0?POS:NEG},
              {l:"ASSETS",v:all.length,c:"rgba(255,255,255,0.38)"}].map(s=>(
              <div key={s.l}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)",letterSpacing:1.5,marginBottom:2}}>{s.l}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:15,color:s.c,fontWeight:700}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Main price layout */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:12,marginBottom:12}}>
            <div style={{background:"rgba(8,11,20,0.82)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:18,fontWeight:700,color:CAT_COLOR[selected.category]}}>{selAsset?.id}</span>
                    <span style={{background:`rgba(${hRGB(CAT_COLOR[selected.category])},0.12)`,border:`1px solid ${CAT_COLOR[selected.category]}`,borderRadius:2,fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:CAT_COLOR[selected.category],padding:"2px 6px",letterSpacing:1.5}}>{selected.category.toUpperCase()}</span>
                    {selAsset?.src&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)"}}>via {selAsset.src}</span>}
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:2}}>{selAsset?.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,fontWeight:700,color:"#e8eaf0",lineHeight:1}}>
                    {selAsset?fmt(selAsset.price,selAsset.price>=100?2:3):"—"}
                    {selAsset?.unit&&<span style={{fontSize:10,color:"rgba(255,255,255,0.28)",marginLeft:3}}>{selAsset.unit}</span>}
                  </div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:selAsset?.chg>=0?POS:NEG,marginTop:4}}>{selAsset?pct(selAsset.chg):"—"}</div>
                </div>
              </div>
              <MainChart asset={selAsset||{}} history={selHist} category={selected.category}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:12,borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:10}}>
                {[{l:"VOLUME",v:selAsset?.vol||"—"},{l:"MKT CAP",v:selAsset?.mktCap||"—"},{l:"24H CHG",v:selAsset?pct(selAsset.chg):"—"}].map(s=>(
                  <div key={s.l}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.25)",letterSpacing:1.5,marginBottom:3}}>{s.l}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:"#e8eaf0"}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <div style={{background:"rgba(8,11,20,0.82)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:12,flex:1}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:2,marginBottom:9}}>PERFORMANCE HEATMAP</div>
                <HeatMap allAssets={assets}/>
              </div>
              <div style={{background:"rgba(8,11,20,0.82)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:12}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.28)",letterSpacing:2,marginBottom:9}}>TOP MOVERS</div>
                {[...all].sort((a,b)=>Math.abs(b.chg)-Math.abs(a.chg)).slice(0,5).map(a=>(
                  <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:"#e8eaf0"}}>{a.id}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:9.5,color:a.chg>=0?POS:NEG}}>{pct(a.chg)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{background:"rgba(8,11,20,0.82)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:4,padding:16}}>
            <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
              {TABS.map(t=>{
                const isActive=tab===t.key;
                const tc=t.special?ACCENT:(CAT_COLOR[t.key]||"#fff");
                return (<button key={t.key} onClick={()=>setTab(t.key)} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8.5,letterSpacing:1.2,padding:"5px 13px",borderRadius:2,border:"none",cursor:"pointer",transition:"all 0.14s",background:isActive?tc:"rgba(255,255,255,0.05)",color:isActive?"#05070c":"rgba(255,255,255,0.4)",fontWeight:isActive?700:400,boxShadow:isActive&&t.special?`0 0 10px rgba(${hRGB(ACCENT)},0.35)`:""}}>{t.label}</button>);
              })}
            </div>

            {tab==="futures"?<FuturesFlowTab/>:
              Object.entries(assets).filter(([cat])=>tab===cat).map(([cat,arr])=>(
                <div key={cat}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:8,color:CAT_COLOR[cat],letterSpacing:2,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:16,height:1,background:CAT_COLOR[cat]}}/>
                    {cat.toUpperCase()}
                    {cat==="commodity"&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:7,color:"rgba(255,255,255,0.28)",letterSpacing:1}}>· COMEX/NYMEX/EIA/CBOT · SEEDED FEB 22 2026</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
                    {arr.map(a=><AssetCard key={a.id} asset={a} history={hists[a.id]||[]} category={cat} isSelected={selected.id===a.id} onClick={()=>setSelected({id:a.id,category:cat})}/>)}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Footer */}
          <div style={{marginTop:10,fontFamily:"'IBM Plex Mono',monospace",fontSize:7.5,color:"rgba(255,255,255,0.15)",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
            <span>ALPHA TERMINAL · SEED PRICES FEB 22 2026 · SIMULATED TICKS THEREAFTER · NOT FINANCIAL ADVICE</span>
            <span>COT: CFTC LEGACY (COMMODITY) / TFF (FINANCIAL) · VOL: CBOE OVX/GVZ/VIX/VVIX</span>
          </div>
        </div>
      </div>
    </>
  );
}
