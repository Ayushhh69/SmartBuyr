import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Clash+Display:wght@500;600;700&family=Satoshi:wght@400;500;600;700&display=swap";

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  {
    _id: "1", name: "Sony WH-1000XM5 Headphones", brand: "Sony", category: "Electronics",
    current_price: 24999, lowest_price: 19999, highest_price: 32999,
    avg_rating: 4.6, review_count: 1842,
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
    tags: ["noise-cancelling", "wireless", "bluetooth"],
    seller_prices: [
      { seller_name: "Amazon", price: 24999, in_stock: true },
      { seller_name: "Flipkart", price: 26499, in_stock: true },
      { seller_name: "Croma", price: 27990, in_stock: false },
      { seller_name: "Reliance Digital", price: 25499, in_stock: true },
    ]
  },
  {
    _id: "2", name: "Apple MacBook Air M3", brand: "Apple", category: "Laptops",
    current_price: 114900, lowest_price: 104900, highest_price: 124900,
    avg_rating: 4.8, review_count: 3211,
    image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80",
    tags: ["laptop", "apple", "m3", "ultrabook"],
    seller_prices: [
      { seller_name: "Apple Store", price: 114900, in_stock: true },
      { seller_name: "Amazon", price: 112999, in_stock: true },
      { seller_name: "Flipkart", price: 115999, in_stock: true },
    ]
  },
  {
    _id: "3", name: "Samsung 65\" QLED 4K TV", brand: "Samsung", category: "Televisions",
    current_price: 89990, lowest_price: 74990, highest_price: 99990,
    avg_rating: 4.4, review_count: 982,
    image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80",
    tags: ["tv", "4k", "qled", "samsung"],
    seller_prices: [
      { seller_name: "Amazon", price: 89990, in_stock: true },
      { seller_name: "Flipkart", price: 87999, in_stock: true },
      { seller_name: "Vijay Sales", price: 91990, in_stock: false },
    ]
  },
  {
    _id: "4", name: "Nike Air Max 270", brand: "Nike", category: "Footwear",
    current_price: 12995, lowest_price: 8995, highest_price: 13995,
    avg_rating: 4.3, review_count: 5430,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    tags: ["shoes", "sports", "nike"],
    seller_prices: [
      { seller_name: "Nike.com", price: 12995, in_stock: true },
      { seller_name: "Amazon", price: 11999, in_stock: true },
      { seller_name: "Myntra", price: 12495, in_stock: true },
    ]
  },
];

function generatePriceHistory(basePrice, days = 90) {
  const data = [];
  let price = basePrice * 1.1;
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    price = Math.max(basePrice * 0.8, price + (Math.random() - 0.5) * basePrice * 0.03);
    data.push({
      date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      price: Math.round(price),
      amazon: Math.round(price * (0.95 + Math.random() * 0.1)),
      flipkart: Math.round(price * (0.97 + Math.random() * 0.1)),
    });
  }
  return data;
}

const MOCK_REVIEWS = [
  { _id: "r1", user_name: "Arjun Mehta", rating: 5, title: "Absolutely worth it!", body: "The noise cancellation is incredible. Used it on a 12hr flight and it was life-changing. Build quality is top notch.", pros: ["Great ANC", "Long battery life", "Comfortable"], cons: ["Slightly bulky"], sentiment: "positive", created_at: "2024-01-15", helpful: { yes: 84, no: 3 }, verified: true },
  { _id: "r2", user_name: "Priya Sharma", rating: 4, title: "Almost perfect", body: "Sound quality is brilliant and the ANC works great in most environments. The touch controls take getting used to but overall a solid buy.", pros: ["Amazing sound", "Good build"], cons: ["Touch controls take time"], sentiment: "positive", created_at: "2024-01-10", helpful: { yes: 52, no: 7 }, verified: true },
  { _id: "r3", user_name: "Ravi Kumar", rating: 2, title: "Disappointed with mic quality", body: "The headphones sound great for music but the mic quality during calls is quite poor. People complain they can barely hear me.", pros: ["Music quality"], cons: ["Poor mic", "Expensive"], sentiment: "negative", created_at: "2024-01-05", helpful: { yes: 39, no: 12 }, verified: false },
  { _id: "r4", user_name: "Deepika Nair", rating: 5, title: "Best headphones I've owned", body: "Upgraded from Bose QC35 and these are leagues ahead. The adaptive ANC adjusts perfectly to surroundings.", pros: ["Best-in-class ANC", "Multi-device"], cons: [], sentiment: "positive", created_at: "2023-12-28", helpful: { yes: 71, no: 2 }, verified: true },
];

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmt = (n) => n ? "₹" + Number(n).toLocaleString("en-IN") : "—";
const pct = (a, b) => b ? ((a - b) / b * 100).toFixed(1) : 0;
const API_BASE = import.meta.env.PROD ? "" : "http://localhost:8000";

// ── Background ────────────────────────────────────────────────────────────────
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
        backgroundSize: "64px 64px",
      }} />
      {/* Aurora blobs */}
      <div style={{
        position: "absolute", top: "-20%", left: "-10%", width: "50vw", height: "50vw",
        background: "radial-gradient(circle, rgba(110,231,183,0.12) 0%, transparent 70%)",
        borderRadius: "50%", animation: "aurora 12s ease-in-out infinite",
        filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", right: "-10%", width: "55vw", height: "55vw",
        background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
        borderRadius: "50%", animation: "aurora 16s ease-in-out infinite reverse",
        filter: "blur(50px)",
      }} />
      <div style={{
        position: "absolute", top: "40%", left: "50%", width: "30vw", height: "30vw",
        background: "radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)",
        borderRadius: "50%", animation: "aurora 20s ease-in-out infinite",
        filter: "blur(30px)", transform: "translateX(-50%)",
      }} />
      {/* Fade edges */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, #050508 100%)" }} />
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Stars({ rating, size = 14 }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) % 1 >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= full ? "#F59E0B" : (i === full + 1 && half ? "url(#half)" : "none")}
          stroke="#F59E0B" strokeWidth="1.5">
          <defs>
            <linearGradient id="half"><stop offset="50%" stopColor="#F59E0B" /><stop offset="50%" stopColor="transparent" /></linearGradient>
          </defs>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

function Badge({ children, color = "#6EE7B7" }) {
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}35`,
      borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 700,
      letterSpacing: 0.3, fontFamily: "Satoshi, sans-serif", display: "inline-flex",
      alignItems: "center", gap: 4,
    }}>{children}</span>
  );
}

function SourceChip({ source }) {
  const cfg = source === "amazon"
    ? { bg: "#FF9900", text: "#000", label: "Amazon" }
    : { bg: "#2874F0", text: "#fff", label: "Flipkart" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.text, fontSize: 10, fontWeight: 800,
      padding: "2px 8px", borderRadius: 4, letterSpacing: 0.5, fontFamily: "Satoshi, sans-serif",
    }}>{cfg.label}</span>
  );
}

function GlowButton({ onClick, children, style = {}, variant = "primary", disabled = false }) {
  const [hovered, setHovered] = useState(false);
  const base = {
    border: "none", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 800, fontSize: 14, fontFamily: "Satoshi, sans-serif",
    transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
    position: "relative", overflow: "hidden", display: "inline-flex",
    alignItems: "center", justifyContent: "center", gap: 8,
    opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: {
      background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", color: "#000",
      boxShadow: hovered ? "0 8px 32px rgba(110,231,183,0.4), 0 0 0 1px rgba(110,231,183,0.2)" : "none",
      transform: hovered ? "translateY(-2px)" : "translateY(0)",
    },
    ghost: {
      background: hovered ? "rgba(110,231,183,0.1)" : "rgba(255,255,255,0.05)",
      color: hovered ? "#6EE7B7" : "rgba(255,255,255,0.5)",
      border: `1px solid ${hovered ? "rgba(110,231,183,0.35)" : "rgba(255,255,255,0.1)"}`,
    },
    danger: {
      background: "none", color: "#F87171",
      border: `1px solid ${hovered ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.25)"}`,
    },
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function NavBar({ page, setPage, onLiveSearch }) {
  const [val, setVal] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav-bar" style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "rgba(5,5,8,0.8)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", gap: 16, padding: "0 40px", height: 60,
    }}>
      {/* Logo */}
      <div onClick={() => setPage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg,#6EE7B7,#3B82F6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(110,231,183,0.3)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4,15 8,9 13,12 20,4" />
            <polyline points="16,4 20,4 20,8" />
          </svg>
        </div>
        <span style={{ fontFamily: "Clash Display, sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: -0.5 }}>SmartBuyr</span>
      </div>

      {/* Search */}
      <div className="nav-search" style={{ flex: 1, maxWidth: 520, position: "relative" }}>
        <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", opacity: 0.35 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onLiveSearch(val.trim()); } }}
          placeholder="Search products across Amazon & Flipkart…"
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 10, padding: "9px 16px 9px 38px",
            color: "#fff", fontSize: 13.5, outline: "none",
            boxSizing: "border-box", fontFamily: "Satoshi, sans-serif",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(110,231,183,0.45)"; e.target.style.boxShadow = "0 0 0 3px rgba(110,231,183,0.08)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* Desktop links */}
      <div className="nav-links-desktop" style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
        {[["home", "Home"], ["livesearch", "Live Search"], ["alerts", "Alerts"], ["compare", "Compare"]].map(([k, label]) => (
          <button key={k} onClick={() => setPage(k)} style={{
            background: page === k ? "rgba(110,231,183,0.1)" : "transparent",
            color: page === k ? "#6EE7B7" : "rgba(255,255,255,0.45)",
            border: page === k ? "1px solid rgba(110,231,183,0.25)" : "1px solid transparent",
            borderRadius: 8, padding: "7px 13px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "Satoshi, sans-serif",
            transition: "all 0.2s", whiteSpace: "nowrap",
          }}
            onMouseEnter={e => { if (page !== k) { e.currentTarget.style.color = "rgba(255,255,255,0.8)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (page !== k) { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "transparent"; } }}
          >{label}</button>
        ))}
      </div>

      {/* Hamburger */}
      <button
        className="hamburger"
        onClick={() => setMenuOpen(o => !o)}
        style={{
          display: "none", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
          width: 36, height: 36, cursor: "pointer", marginLeft: "auto",
          alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, padding: 8,
        }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{ display: "block", width: "100%", height: 1.5, background: "#fff", borderRadius: 2, opacity: menuOpen && i === 1 ? 0 : 0.7 }} />
        ))}
      </button>

      {/* Mobile nav overlay */}
      {menuOpen && (
        <div className="nav-links-desktop open" style={{ display: "flex" }}>
          {[["home", "Home"], ["livesearch", "Live Search"], ["alerts", "Alerts"], ["compare", "Compare"]].map(([k, label]) => (
            <button key={k} onClick={() => { setPage(k); setMenuOpen(false); }} style={{
              background: page === k ? "rgba(110,231,183,0.12)" : "transparent",
              color: page === k ? "#6EE7B7" : "rgba(255,255,255,0.5)",
              border: page === k ? "1px solid rgba(110,231,183,0.25)" : "1px solid transparent",
              borderRadius: 8, padding: "7px 12px", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600, fontFamily: "Satoshi, sans-serif",
            }}>{label}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ── Price History Chart ───────────────────────────────────────────────────────
function PriceHistoryChart({ product }) {
  const [range, setRange] = useState(30);
  const history = generatePriceHistory(product.current_price, range);
  const min = Math.min(...history.map(d => d.price));
  const max = Math.max(...history.map(d => d.price));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "Clash Display, sans-serif" }}>Price History</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 3 }}>
            Low <b style={{ color: "#6EE7B7" }}>{fmt(min)}</b> · High <b style={{ color: "#F87171" }}>{fmt(max)}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              background: range === d ? "linear-gradient(135deg,#6EE7B7,#3B82F6)" : "rgba(255,255,255,0.06)",
              color: range === d ? "#000" : "rgba(255,255,255,0.4)",
              border: "none", borderRadius: 6, padding: "5px 12px",
              cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Satoshi, sans-serif",
              transition: "all 0.2s",
              boxShadow: range === d ? "0 4px 14px rgba(110,231,183,0.3)" : "none",
            }}>{d}D</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} tickLine={false} interval={Math.floor(range / 5)} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} tickLine={false} tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "rgba(10,10,18,0.95)", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 10, fontSize: 12, fontFamily: "Satoshi, sans-serif", backdropFilter: "blur(20px)" }}
            labelStyle={{ color: "rgba(255,255,255,0.5)" }}
            formatter={v => [fmt(v), "Price"]}
          />
          <Area type="monotone" dataKey="price" stroke="#6EE7B7" strokeWidth={2.5} fill="url(#priceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Seller Table ──────────────────────────────────────────────────────────────
function SellerTable({ product }) {
  const sorted = [...(product.seller_prices || [])].sort((a, b) => a.price - b.price);
  const best = sorted[0]?.price || product.current_price;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((s, i) => (
        <div key={s.seller_name} style={{
          display: "flex", alignItems: "center", gap: 12,
          background: i === 0 ? "rgba(110,231,183,0.06)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${i === 0 ? "rgba(110,231,183,0.3)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 12, padding: "14px 18px",
          transition: "all 0.2s",
          boxShadow: i === 0 ? "0 0 20px rgba(110,231,183,0.06)" : "none",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, fontFamily: "Satoshi, sans-serif" }}>{s.seller_name}</div>
            {!s.in_stock && <div style={{ color: "#F87171", fontSize: 11, marginTop: 2 }}>Out of stock</div>}
          </div>
          {i === 0 && <Badge color="#6EE7B7">👑 Best Price</Badge>}
          {i > 0 && <span style={{ color: "#F87171", fontSize: 12 }}>+{fmt(s.price - best)}</span>}
          <div style={{ fontWeight: 800, fontSize: 18, color: i === 0 ? "#6EE7B7" : "#fff", fontFamily: "Clash Display, sans-serif" }}>{fmt(s.price)}</div>
          <GlowButton disabled={!s.in_stock} variant={s.in_stock ? "ghost" : "ghost"} style={{ padding: "7px 16px", fontSize: 13 }}>
            {s.in_stock ? "Select" : "Unavailable"}
          </GlowButton>
        </div>
      ))}
    </div>
  );
}

// ── Reviews Panel ─────────────────────────────────────────────────────────────
function ReviewsPanel({ reviews }) {
  const total = reviews.length;
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => dist[Math.round(r.rating)]++);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "Clash Display, sans-serif" }}>{avg}</div>
          <Stars rating={parseFloat(avg)} size={14} />
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>{total} reviews</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 6 }}>{star}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 5 }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg,#F59E0B,#FB923C)", width: `${(dist[star] / total) * 100}%`, borderRadius: 4, transition: "width 0.8s ease" }} />
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", width: 16 }}>{dist[star]}</span>
            </div>
          ))}
        </div>
      </div>
      {reviews.map(r => (
        <div key={r._id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}
        >
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{r.user_name[0]}</div>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{r.user_name}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                <Stars rating={r.rating} size={12} />
                {r.verified && <Badge color="#6EE7B7">✓ Verified</Badge>}
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{r.created_at}</span>
          </div>
          <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 8 }}>{r.title}</div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.7, margin: "0 0 10px" }}>{r.body}</p>
          {(r.pros.length > 0 || r.cons.length > 0) && (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {r.pros.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{r.pros.map(p => <div key={p} style={{ fontSize: 12, color: "#6EE7B7" }}>+ {p}</div>)}</div>}
              {r.cons.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{r.cons.map(c => <div key={c} style={{ fontSize: 12, color: "#F87171" }}>− {c}</div>)}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Alert Modal ───────────────────────────────────────────────────────────────
function AlertModal({ product, onClose }) {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(Math.round(product.current_price * 0.9));
  const [saved, setSaved] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease" }}
      onClick={onClose}>
      <div style={{
        background: "rgba(10,10,18,0.97)", border: "1px solid rgba(110,231,183,0.2)",
        borderRadius: 22, padding: 32, maxWidth: 400, width: "90%",
        boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(110,231,183,0.08)",
        animation: "fadeInUp 0.3s ease",
      }} onClick={e => e.stopPropagation()}>
        {saved ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14, animation: "float 2s ease-in-out infinite" }}>🔔</div>
            <div style={{ color: "#6EE7B7", fontSize: 20, fontWeight: 700, fontFamily: "Clash Display, sans-serif", marginBottom: 8 }}>Alert Set!</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>We'll notify you when the price drops below {fmt(targetPrice)}</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "Clash Display, sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", marginBottom: 4 }}>Price Drop Alert</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginBottom: 24 }}>{product.name || product.title}</div>
            {[
              ["Email Address", email, setEmail, "text", "you@example.com"],
              ["Alert when price drops below", targetPrice, setTargetPrice, "number", ""],
            ].map(([label, val, set, type, ph]) => (
              <label key={label} style={{ display: "block", marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{label}</div>
                <input type={type} value={val} onChange={e => set(type === "number" ? parseInt(e.target.value) : e.target.value)} placeholder={ph}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                    padding: "11px 14px", color: "#fff", fontSize: 14,
                    outline: "none", boxSizing: "border-box", fontFamily: "Satoshi, sans-serif",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(110,231,183,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </label>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <GlowButton onClick={onClose} variant="ghost" style={{ flex: 1, padding: 12 }}>Cancel</GlowButton>
              <GlowButton onClick={() => { if (email && targetPrice) setSaved(true); }} style={{ flex: 2, padding: 12 }}>
                🔔 Set Alert
              </GlowButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Product Detail Page ───────────────────────────────────────────────────────
function ProductDetailPage({ product, onBack }) {
  const [tab, setTab] = useState("price");
  const [showAlert, setShowAlert] = useState(false);
  const [wishlist, setWishlist] = useState(false);

  const name = product.name || product.title || "Unknown Product";
  const price = product.current_price || product.price || 0;
  const origPrice = product.highest_price || product.original_price;
  const lowestPrice = product.lowest_price || product.price;
  const image = product.image_url;
  const rating = product.avg_rating || product.rating;
  const reviews = product.review_count;
  const brand = product.brand;
  const category = product.category;
  const tags = product.tags || [product.source].filter(Boolean);
  const sellerPrices = product.seller_prices || [];
  const discountPct = product.discount_pct || (origPrice > price ? Math.round((origPrice - price) / origPrice * 100) : 0);
  const savings = origPrice && origPrice > price ? origPrice - price : 0;

  const TABS = [["price", "📈 Price History"], ["sellers", "🏪 Sellers"], ["reviews", "⭐ Reviews"]];

  return (
    <div style={{ minHeight: "100vh" }}>
      {showAlert && <AlertModal product={product} onClose={() => setShowAlert(false)} />}
      <div style={{ padding: "14px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.35)",
          cursor: "pointer", fontSize: 13, fontWeight: 600,
          display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "Satoshi, sans-serif",
          transition: "color 0.2s", padding: "4px 0",
        }}
          onMouseEnter={e => e.target.style.color = "#6EE7B7"}
          onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.35)"}
        >← Back to results</button>
      </div>

      <div className="product-detail-container" style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 40px" }}>
        <div className="product-detail-hero" style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 40, marginBottom: 40 }}>
          {/* Image */}
          <div style={{
            borderRadius: 20, overflow: "hidden",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            aspectRatio: "1/1", display: "flex", alignItems: "center",
            justifyContent: "center", position: "relative",
            boxShadow: "0 0 60px rgba(0,0,0,0.5)",
          }}>
            {image
              ? <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 20 }} />
              : <div style={{ fontSize: 80, opacity: 0.2 }}>📦</div>}
            {discountPct > 0 && (
              <div style={{ position: "absolute", top: 14, left: 14, background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#fff", borderRadius: 8, padding: "5px 11px", fontSize: 12, fontWeight: 800 }}>−{discountPct}%</div>
            )}
            {product.prime && <div style={{ position: "absolute", bottom: 14, left: 14, background: "#00A8E0", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5 }}>prime</div>}
            {product.assured && <div style={{ position: "absolute", bottom: 14, left: 14, background: "#2874F0", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5 }}>FK Assured</div>}
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {brand && <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{brand}</span>}
              {category && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>· {category}</span>}
              {product.source && <SourceChip source={product.source} />}
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.2, fontFamily: "Clash Display, sans-serif" }}>{name}</h1>
            {rating && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Stars rating={rating} size={16} />
                <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: 14 }}>{rating}</span>
                {reviews && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>({Number(reviews).toLocaleString("en-IN")} reviews)</span>}
              </div>
            )}

            {/* Price block */}
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 18, padding: 22,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "Clash Display, sans-serif" }}>{fmt(price)}</div>
              {origPrice && origPrice > price && (
                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", textDecoration: "line-through" }}>{fmt(origPrice)}</span>
                  <Badge color="#6EE7B7">Save {fmt(savings)}</Badge>
                </div>
              )}
              <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
                {lowestPrice && <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>All-Time Low</div><div style={{ color: "#6EE7B7", fontWeight: 700, fontSize: 15 }}>{fmt(lowestPrice)}</div></div>}
                {origPrice && origPrice > price && <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>All-Time High</div><div style={{ color: "#F87171", fontWeight: 700, fontSize: 15 }}>{fmt(origPrice)}</div></div>}
                {sellerPrices.length > 0 && <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Sellers</div><div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{sellerPrices.length} stores</div></div>}
              </div>
            </div>

            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tags.map(t => <Badge key={t} color="#A78BFA">{t}</Badge>)}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <GlowButton onClick={() => setShowAlert(true)} style={{ flex: 1, padding: 13, fontSize: 14 }}>
                🔔 Set Price Alert
              </GlowButton>
              <button onClick={() => setWishlist(w => !w)} style={{
                background: wishlist ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${wishlist ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, padding: "13px 18px", cursor: "pointer",
                color: wishlist ? "#F87171" : "rgba(255,255,255,0.35)", fontSize: 20,
                transition: "all 0.2s",
              }}>{wishlist ? "♥" : "♡"}</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 24 }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: "none", border: "none", padding: "12px 22px", cursor: "pointer",
              color: tab === k ? "#6EE7B7" : "rgba(255,255,255,0.35)",
              fontWeight: tab === k ? 700 : 500, fontSize: 13.5, fontFamily: "Satoshi, sans-serif",
              borderBottom: tab === k ? "2px solid #6EE7B7" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 24 }}>
          {tab === "price" && <PriceHistoryChart product={{ current_price: price }} />}
          {tab === "sellers" && (
            sellerPrices.length > 0
              ? <SellerTable product={product} />
              : <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.25)" }}>No seller data available.</div>
          )}
          {tab === "reviews" && <ReviewsPanel reviews={MOCK_REVIEWS} />}
        </div>
      </div>
    </div>
  );
}

// ── Search Result Card ────────────────────────────────────────────────────────
function SearchResultCard({ item, onClick }) {
  const [hov, setHov] = useState(false);
  const savings = item.original_price && item.price ? item.original_price - item.price : 0;
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hov ? "rgba(110,231,183,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column",
        cursor: "pointer", transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hov ? "0 16px 48px rgba(0,0,0,0.4), 0 0 30px rgba(110,231,183,0.08)" : "none",
      }}>
      {/* Image */}
      <div style={{ height: 196, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 12, transition: "transform 0.3s", transform: hov ? "scale(1.04)" : "scale(1)" }} onError={e => { e.target.style.display = "none"; }} />
          : <div style={{ fontSize: 50, opacity: 0.15 }}>📦</div>}
        {item.discount_pct > 0 && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#fff", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 800 }}>−{item.discount_pct}%</div>
        )}
        <div style={{ position: "absolute", top: 10, right: 10 }}><SourceChip source={item.source} /></div>
        {item.prime && <div style={{ position: "absolute", bottom: 10, left: 10, background: "#00A8E0", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>prime</div>}
        {item.assured && <div style={{ position: "absolute", bottom: 10, left: 10, background: "#2874F0", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>FK Assured</div>}
      </div>

      {/* Info */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.title}
        </div>
        {item.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Stars rating={item.rating} size={11} />
            <span style={{ fontSize: 11.5, color: "#F59E0B", fontWeight: 600 }}>{item.rating}</span>
            {item.review_count && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>({Number(item.review_count).toLocaleString()})</span>}
          </div>
        )}
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif" }}>{fmt(item.price)}</div>
          {item.original_price && item.original_price > item.price && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "line-through" }}>{fmt(item.original_price)}</span>
              <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 600 }}>Save {fmt(savings)}</span>
            </div>
          )}
        </div>
        <button style={{
          width: "100%",
          background: hov ? "rgba(110,231,183,0.15)" : "rgba(110,231,183,0.07)",
          color: "#6EE7B7", border: "1px solid rgba(110,231,183,0.25)",
          borderRadius: 10, padding: "9px", cursor: "pointer",
          fontWeight: 700, fontSize: 13, fontFamily: "Satoshi, sans-serif",
          transition: "all 0.2s",
        }}>View Details →</button>
        {!item.in_stock && <div style={{ textAlign: "center", fontSize: 11, color: "#F87171", fontWeight: 600 }}>⚠ Out of Stock</div>}
      </div>
    </div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, overflow: "hidden" }}>
      <div className="skeleton" style={{ height: 196 }} />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 13, width: "90%" }} />
        <div className="skeleton" style={{ height: 13, width: "60%" }} />
        <div className="skeleton" style={{ height: 22, width: "45%", marginTop: 4 }} />
        <div className="skeleton" style={{ height: 36, marginTop: 4, borderRadius: 10 }} />
      </div>
    </div>
  );
}

// ── Live Search Page ──────────────────────────────────────────────────────────
function LiveSearchPage({ initialQuery, setSearch, onViewProduct }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [inputVal, setInputVal] = useState(initialQuery || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [meta, setMeta] = useState(null);

  const runSearch = async (q, source = "all", max = 12) => {
    if (!q.trim()) return;
    setLoading(true); setResults([]); setMeta(null);
    try {
      const url = `${API_BASE}/api/search/?q=${encodeURIComponent(q)}&source=${source}&max_results=${max}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setMeta({ amazon: data.amazon_count, flipkart: data.flipkart_count, cached: data.cached, total: data.total });
    } catch {
      setResults(generateMockSearchResults(q));
      setMeta({ amazon: 6, flipkart: 6, cached: false, total: 12, mock: true });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (initialQuery) runSearch(initialQuery); }, []);

  const sorted = [...results].sort((a, b) => {
    if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
    if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "discount") return (b.discount_pct || 0) - (a.discount_pct || 0);
    return 0;
  });
  const displayed = filter === "all" ? sorted : sorted.filter(r => r.source === filter);

  return (
    <div className="page-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px" }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, maxWidth: 680 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && inputVal.trim()) { setQuery(inputVal); setSearch(inputVal); runSearch(inputVal); } }}
            placeholder="Search across Amazon & Flipkart…"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px 12px 42px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "Satoshi, sans-serif", transition: "border-color 0.2s" }}
            onFocus={e => e.target.style.borderColor = "rgba(110,231,183,0.45)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>
        <GlowButton onClick={() => { setQuery(inputVal); setSearch(inputVal); runSearch(inputVal); }} style={{ padding: "0 24px", height: 46 }}>
          Search
        </GlowButton>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
            {["Amazon", "Flipkart"].map((s, i) => (
              <div key={s} style={{
                background: i === 0 ? "rgba(255,153,0,0.08)" : "rgba(40,116,240,0.08)",
                border: `1px solid ${i === 0 ? "rgba(255,153,0,0.3)" : "rgba(40,116,240,0.3)"}`,
                borderRadius: 12, padding: "12px 24px",
                color: i === 0 ? "#FF9900" : "#60A5FA", fontWeight: 700, fontSize: 14,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? "#FF9900" : "#60A5FA", animation: `bounce-dot 1.4s ease-in-out ${j * 0.2}s infinite` }} />
                  ))}
                </div>
                Searching {s}…
              </div>
            ))}
          </div>
          <div className="search-result-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <style>{`@keyframes bounce-dot{0%,80%,100%{transform:scale(0);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                <b style={{ color: "#fff" }}>{displayed.length}</b> results for <b style={{ color: "#6EE7B7" }}>"{query}"</b>
                {meta?.mock && <span style={{ color: "#F59E0B", fontSize: 12, marginLeft: 8 }}>(demo data)</span>}
                {meta?.cached && <span style={{ color: "#6EE7B7", fontSize: 12, marginLeft: 8 }}>⚡ cached</span>}
              </span>
              {meta && (
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge color="#FF9900">Amazon: {meta.amazon}</Badge>
                  <Badge color="#60A5FA">Flipkart: {meta.flipkart}</Badge>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3, gap: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
                {[["all", "All"], ["amazon", "Amazon"], ["flipkart", "Flipkart"]].map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)} style={{
                    background: filter === val ? (val === "amazon" ? "#FF9900" : val === "flipkart" ? "#2874F0" : "linear-gradient(135deg,#6EE7B7,#3B82F6)") : "transparent",
                    color: filter === val ? (val === "amazon" || val === "flipkart" ? "#fff" : "#000") : "rgba(255,255,255,0.4)",
                    border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                  }}>{label}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "Satoshi, sans-serif", outline: "none" }}>
                <option value="default">Sort: Relevance</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="rating">Best Rated</option>
                <option value="discount">Best Discount</option>
              </select>
            </div>
          </div>
          <div className="search-result-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {displayed.map((item, i) => (
              <div key={`${item.source}-${i}`} style={{ animation: `fadeInUp 0.4s ease ${(i % 6) * 0.06}s both` }}>
                <SearchResultCard item={item} onClick={() => onViewProduct(item)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty */}
      {!loading && results.length === 0 && query && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.5 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif", marginBottom: 6 }}>No results found</div>
          <div style={{ color: "rgba(255,255,255,0.3)" }}>Try a different search term</div>
        </div>
      )}

      {/* Prompt */}
      {!loading && !query && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16, display: "inline-block", animation: "float 3s ease-in-out infinite" }}>🛒</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif", marginBottom: 8 }}>Search Live Prices</div>
          <div style={{ color: "rgba(255,255,255,0.3)", marginBottom: 32, fontSize: 15 }}>Results open inside SmartBuyr — compare, track, and set alerts without leaving</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", maxWidth: 600, margin: "0 auto" }}>
            {["Sony headphones", "iPhone 15", "Nike shoes", "Samsung TV", "MacBook Air", "Gaming laptop", "Air purifier", "Milk frother"].map((s, i) => (
              <button key={s} onClick={() => { setInputVal(s); setQuery(s); setSearch(s); runSearch(s); }}
                style={{
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 20, padding: "8px 16px", color: "rgba(255,255,255,0.5)",
                  cursor: "pointer", fontSize: 13, fontFamily: "Satoshi, sans-serif",
                  transition: "all 0.2s", animation: `fadeInUp 0.5s ease ${i * 0.05}s both`,
                }}
                onMouseEnter={e => { e.target.style.borderColor = "rgba(110,231,183,0.4)"; e.target.style.color = "#6EE7B7"; e.target.style.background = "rgba(110,231,183,0.05)"; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.5)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hero Visual ───────────────────────────────────────────────────────────────
function HeroVisual() {
  const [price, setPrice] = useState(32999);
  const [phase, setPhase] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);

  useEffect(() => {
    let timers = [];
    const run = () => {
      setPhase(0); setPrice(32999); setNotifVisible(false);
      timers.push(setTimeout(() => setPhase(1), 900));
      timers.push(setTimeout(() => { setPhase(2); setNotifVisible(true); }, 2800));
    };
    run();
    const cycle = setInterval(() => { timers.forEach(clearTimeout); timers = []; run(); }, 7500);
    return () => { timers.forEach(clearTimeout); clearInterval(cycle); };
  }, []);

  useEffect(() => {
    if (phase !== 1) return;
    const from = 32999, to = 24999, dur = 1800;
    const t0 = performance.now();
    let raf;
    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      setPrice(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const dropped = phase === 2;
  const savings = 32999 - price;

  // Sparkline — high then steadily falling (price drop trend)
  const raw = [91, 95, 88, 97, 93, 98, 90, 94, 86, 79, 71, 63, 57];
  const W = 200, H = 52;
  const lo = Math.min(...raw), hi = Math.max(...raw);
  const px = i => (i / (raw.length - 1)) * W;
  const py = v => H - 6 - ((v - lo) / (hi - lo)) * (H - 14);
  const linePath = raw.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
      {/* Main tracker card */}
      <div style={{
        background: "rgba(6,6,14,0.94)", backdropFilter: "blur(32px)",
        border: `1px solid ${dropped ? "rgba(110,231,183,0.45)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 24, padding: 24, position: "relative", overflow: "hidden",
        boxShadow: dropped
          ? "0 0 0 1px rgba(110,231,183,0.08), 0 40px 100px rgba(0,0,0,0.65), 0 0 80px rgba(110,231,183,0.1)"
          : "0 40px 100px rgba(0,0,0,0.65)",
        transition: "border-color 0.7s ease, box-shadow 0.7s ease",
        animation: "fadeInUp 0.7s ease 0.2s both",
      }}>
        {/* Top glow */}
        <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "radial-gradient(circle,rgba(110,231,183,0.1),transparent 70%)", pointerEvents: "none" }} />

        {/* Product header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
              <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80" alt="Sony" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>Sony WH-1000XM5</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>Electronics · Sony</div>
            </div>
          </div>
          {/* Live dot */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 20, padding: "4px 10px" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px rgba(239,68,68,0.8)", animation: "pulse-ring 1.4s ease infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: "#EF4444", letterSpacing: 1.2 }}>LIVE</span>
          </div>
        </div>

        {/* Animated price */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <span style={{
              fontSize: 38, fontWeight: 800, fontFamily: "Clash Display, sans-serif",
              letterSpacing: -1.5, color: dropped ? "#6EE7B7" : "#fff",
              transition: "color 0.6s ease", fontVariantNumeric: "tabular-nums",
            }}>₹{price.toLocaleString("en-IN")}</span>
            {phase > 0 && (
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.26)", textDecoration: "line-through", fontFamily: "Satoshi, sans-serif" }}>₹32,999</span>
            )}
          </div>
          {/* Savings badge — slides in */}
          <div style={{ height: 22, overflow: "hidden" }}>
            <div style={{
              transform: dropped ? "translateY(0)" : "translateY(24px)",
              transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#6EE7B7", background: "rgba(110,231,183,0.14)", border: "1px solid rgba(110,231,183,0.3)", borderRadius: 6, padding: "1px 8px" }}>
                ↓ {Math.round(savings / 32999 * 100)}% off
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: "Satoshi, sans-serif" }}>
                Save ₹{savings.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>90-day price history</span>
            <span style={{ fontSize: 10, color: "#6EE7B7", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 2 L5 6 L9 1" stroke="#6EE7B7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Trending down
            </span>
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#sparkGrad)" />
            <path d={linePath} fill="none" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Current price dot with ring */}
            <circle cx={px(raw.length - 1)} cy={py(raw[raw.length - 1])} r="7" fill="rgba(110,231,183,0.18)" />
            <circle cx={px(raw.length - 1)} cy={py(raw[raw.length - 1])} r="3.5" fill="#6EE7B7" />
          </svg>
        </div>

        {/* Seller comparison */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Seller comparison</div>
          {[
            ["Amazon", 24999, true, "#FF9900", true],
            ["Flipkart", 26499, true, "#2874F0", false],
            ["Croma", 27990, false, "rgba(255,255,255,0.2)", false],
          ].map(([name, p, inStock, color, isBest]) => (
            <div key={name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: 10,
              background: isBest ? "rgba(110,231,183,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${isBest ? "rgba(110,231,183,0.22)" : "rgba(255,255,255,0.06)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: inStock ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.22)", fontFamily: "Satoshi, sans-serif" }}>{name}</span>
                {isBest && <span style={{ fontSize: 9, color: "#6EE7B7", fontWeight: 700, background: "rgba(110,231,183,0.12)", borderRadius: 4, padding: "1px 5px" }}>BEST</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "Clash Display, sans-serif", color: isBest ? "#6EE7B7" : inStock ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)" }}>
                {inStock ? `₹${p.toLocaleString("en-IN")}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating alert notification */}
      <div style={{
        position: "absolute", top: -22, right: -22,
        background: "rgba(4,4,12,0.97)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(110,231,183,0.42)",
        borderRadius: 16, padding: "12px 16px",
        opacity: notifVisible ? 1 : 0,
        transform: notifVisible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.9)",
        transition: "all 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        minWidth: 196, zIndex: 10,
        boxShadow: "0 12px 48px rgba(0,0,0,0.55), 0 0 32px rgba(110,231,183,0.14)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}>🔔</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#6EE7B7", marginBottom: 3 }}>Price dropped!</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.45 }}>Sony WH-1000XM5<br />↓ ₹8,000 saved · 24% off</div>
          </div>
        </div>
      </div>

      {/* Floating platform chip */}
      <div style={{
        position: "absolute", bottom: -18, left: -18,
        background: "rgba(4,4,12,0.97)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
        padding: "9px 14px", display: "flex", alignItems: "center", gap: 9,
        animation: "fadeInUp 0.6s ease 0.6s both",
        boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
      }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontWeight: 600 }}>Tracked on</div>
        <div style={{ display: "flex", gap: 5 }}>
          <span style={{ background: "#FF9900", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>Amazon</span>
          <span style={{ background: "#2874F0", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>Flipkart</span>
        </div>
      </div>
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, delay = 0 }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, padding: "20px 24px", textAlign: "center",
      transition: "all 0.25s", animation: `fadeInUp 0.5s ease ${delay}s both`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.background = `${color}08`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
    >
      <div style={{ fontSize: 30, fontWeight: 700, color, fontFamily: "Clash Display, sans-serif", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Satoshi, sans-serif" }}>{label}</div>
    </div>
  );
}

function ProductCard({ product, onClick, delay = 0 }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${hov ? "rgba(110,231,183,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 18, overflow: "hidden", cursor: "pointer",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hov ? "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(110,231,183,0.07)" : "none",
        animation: `fadeInUp 0.5s ease ${delay}s both`,
      }}>
      <div style={{ height: 180, overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.02)" }}>
        <img src={product.image_url} alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s", transform: hov ? "scale(1.07)" : "scale(1)" }}
        />
        <div style={{ position: "absolute", inset: 0, background: hov ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)", transition: "background 0.3s" }} />
        <div style={{ position: "absolute", top: 10, left: 10, background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#fff", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 800 }}>
          ↓ {Math.abs(pct(product.current_price, product.highest_price))}%
        </div>
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
          {product.category}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5 }}>{product.brand}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.35 }}>{product.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Stars rating={product.avg_rating} size={12} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>({product.review_count.toLocaleString()})</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif" }}>{fmt(product.current_price)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>Lowest: {fmt(product.lowest_price)}</div>
          </div>
          <div style={{ background: hov ? "rgba(110,231,183,0.15)" : "rgba(110,231,183,0.07)", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "#6EE7B7", fontWeight: 700, transition: "all 0.2s" }}>
            Track →
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePage({ onViewProduct, onLiveSearch }) {
  return (
    <div className="page-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 40px" }}>
      {/* Hero */}
      <div className="hero-inner" style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 28, padding: "68px 72px", marginBottom: 44,
        position: "relative", overflow: "visible",
        animation: "fadeInUp 0.6s ease",
      }}>
        {/* Background glows */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 28, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: -80, left: -40, width: 520, height: 520, background: "radial-gradient(circle,rgba(110,231,183,0.07) 0%,transparent 65%)" }} />
          <div style={{ position: "absolute", bottom: -60, right: 180, width: 420, height: 420, background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 65%)" }} />
          <div style={{ position: "absolute", top: "30%", right: "20%", width: 280, height: 280, background: "radial-gradient(circle,rgba(167,139,250,0.05) 0%,transparent 65%)" }} />
        </div>

        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 80, alignItems: "center", position: "relative", zIndex: 1 }}>
          {/* Left: Text content */}
          <div>
            <div className="hero-badges" style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {[["● LIVE", "#6EE7B7"], ["🔔 ALERTS", "#3B82F6"], ["📊 COMPARE", "#A78BFA"]].map(([b, c]) => (
                <Badge key={b} color={c}>{b}</Badge>
              ))}
            </div>

            <h1 className="hero-title" style={{
              margin: "0 0 22px", fontSize: 62, fontWeight: 700, color: "#fff",
              lineHeight: 1.04, fontFamily: "Clash Display, sans-serif", letterSpacing: -2,
            }}>
              Never Overpay<br />
              <span className="gradient-text">For Anything</span><br />
              Again.
            </h1>

            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16.5, maxWidth: 400, margin: "0 0 38px", lineHeight: 1.75, fontFamily: "Satoshi, sans-serif" }}>
              Track prices across Amazon & Flipkart in real time. Get instant alerts when prices drop. Save big on every purchase.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <GlowButton onClick={() => onLiveSearch("")} style={{ padding: "15px 32px", fontSize: 15 }}>
                Search Products →
              </GlowButton>
              <GlowButton variant="ghost" onClick={() => onLiveSearch("Sony headphones")} style={{ padding: "15px 26px", fontSize: 15 }}>
                Live Demo
              </GlowButton>
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["📉", "Real-time price drops across 2 major platforms"],
                ["🔔", "Instant alerts the moment your target price is hit"],
                ["📊", "90-day price history with trend analysis"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{icon}</div>
                  <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.42)", fontFamily: "Satoshi, sans-serif" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Animated product tracker */}
          <div className="hero-visual-col" style={{ display: "flex", justifyContent: "flex-end" }}>
            <HeroVisual />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 48 }}>
        {[["1,200+", "Products Tracked", "#6EE7B7", 0], ["₹4.2Cr", "Savings Found", "#3B82F6", 0.1], ["50K+", "Alerts Sent", "#F59E0B", 0.2], ["2.5L+", "Reviews Indexed", "#A78BFA", 0.3]].map(([v, l, c, d]) => (
          <StatCard key={l} value={v} label={l} color={c} delay={d} />
        ))}
      </div>

      {/* Trending */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, fontFamily: "Clash Display, sans-serif", margin: 0 }}>🔥 Trending Products</h2>
        <GlowButton variant="ghost" onClick={() => onLiveSearch("")} style={{ padding: "7px 16px", fontSize: 13 }}>View All →</GlowButton>
      </div>
      <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
        {MOCK_PRODUCTS.map((p, i) => (
          <ProductCard key={p._id} product={p} onClick={() => onViewProduct(p)} delay={i * 0.08} />
        ))}
      </div>
    </div>
  );
}

// ── Alerts Page ───────────────────────────────────────────────────────────────
function AlertsPage() {
  const alerts = [
    { id: 1, product_name: "Sony WH-1000XM5", target_price: 21999, current_price: 24999, triggered: false, created_at: "2024-01-20" },
    { id: 2, product_name: "Apple MacBook Air M3", target_price: 109900, current_price: 114900, triggered: false, created_at: "2024-01-18" },
    { id: 3, product_name: "Nike Air Max 270", target_price: 10000, current_price: 12995, triggered: true, triggered_at: "2024-01-15", created_at: "2024-01-10" },
  ];
  return (
    <div className="page-pad" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 24px rgba(110,231,183,0.3)" }}>🔔</div>
        <div>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 700, fontFamily: "Clash Display, sans-serif", margin: 0 }}>My Price Alerts</h2>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0, marginTop: 2 }}>Get notified when prices drop to your target</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map((a, i) => (
          <div key={a.id} style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${a.triggered ? "rgba(110,231,183,0.25)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16,
            animation: `fadeInUp 0.4s ease ${i * 0.1}s both`,
            boxShadow: a.triggered ? "0 0 20px rgba(110,231,183,0.05)" : "none",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 5 }}>{a.product_name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                Target: <b style={{ color: "#6EE7B7" }}>{fmt(a.target_price)}</b>
                <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
                Current: <b style={{ color: "#fff" }}>{fmt(a.current_price)}</b>
                <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
                Need: <b style={{ color: "#F87171" }}>↓ {fmt(a.current_price - a.target_price)}</b>
              </div>
            </div>
            <Badge color={a.triggered ? "#6EE7B7" : "#F59E0B"}>
              {a.triggered ? "✓ Triggered" : "⏳ Watching"}
            </Badge>
            <GlowButton variant="danger" style={{ padding: "6px 14px", fontSize: 12 }}>Delete</GlowButton>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compare Page ──────────────────────────────────────────────────────────────
const COMPARE_ROWS = [
  { key: "current_price", label: "Current Price", render: p => <span style={{ color: "#6EE7B7", fontWeight: 700, fontSize: 17, fontFamily: "Clash Display, sans-serif" }}>{fmt(p.current_price)}</span>, winner: (a, b) => a.current_price <= b.current_price ? a._id : b._id },
  { key: "lowest_price", label: "Lowest Ever", render: p => <span style={{ color: "#6EE7B7", fontWeight: 600 }}>{fmt(p.lowest_price)}</span>, winner: (a, b) => a.lowest_price <= b.lowest_price ? a._id : b._id },
  { key: "avg_rating", label: "Avg Rating", render: p => <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Stars rating={p.avg_rating} size={13} /><span style={{ color: "#F59E0B", fontWeight: 700 }}>{p.avg_rating}</span></span>, winner: (a, b) => a.avg_rating >= b.avg_rating ? a._id : b._id },
  { key: "review_count", label: "Reviews", render: p => <span style={{ color: "rgba(255,255,255,0.8)" }}>{p.review_count.toLocaleString()}</span>, winner: (a, b) => a.review_count >= b.review_count ? a._id : b._id },
  { key: "sellers", label: "Sellers", render: p => <span style={{ color: "rgba(255,255,255,0.8)" }}>{p.seller_prices.length} stores</span>, winner: (a, b) => a.seller_prices.length >= b.seller_prices.length ? a._id : b._id },
  { key: "price_drop", label: "Price Drop", render: p => <span style={{ color: "#F87171", fontWeight: 600 }}>{Math.abs(pct(p.current_price, p.highest_price))}% from high</span>, winner: (a, b) => Math.abs(pct(a.current_price, a.highest_price)) >= Math.abs(pct(b.current_price, b.highest_price)) ? a._id : b._id },
];

function CompareSlot({ product, slotIndex, onSelect, onRemove, availableProducts }) {
  const [dropOpen, setDropOpen] = useState(false);

  if (!product) {
    return (
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div onClick={() => setDropOpen(o => !o)} style={{
          height: "100%", minHeight: 220,
          border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 16,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 10, cursor: "pointer", transition: "all 0.2s", background: "rgba(255,255,255,0.01)",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(110,231,183,0.4)"; e.currentTarget.style.background = "rgba(110,231,183,0.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}
        >
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#6EE7B7" }}>+</div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Add product</span>
        </div>
        {dropOpen && availableProducts.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "rgba(10,10,18,0.98)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, zIndex: 100, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
            {availableProducts.map(p => (
              <div key={p._id} onClick={() => { onSelect(slotIndex, p); setDropOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <img src={p.image_url} alt={p.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8 }} />
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: "#6EE7B7", fontSize: 11 }}>{p.brand}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
      <button onClick={() => onRemove(slotIndex)} style={{ position: "absolute", top: 10, right: 10, zIndex: 10, width: 26, height: 26, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      <div style={{ height: 160, overflow: "hidden", position: "relative" }}>
        <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(5,5,8,0.9))" }} />
      </div>
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{product.brand}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{product.category}</div>
      </div>
    </div>
  );
}

function ComparePage() {
  const [slots, setSlots] = useState([MOCK_PRODUCTS[0], MOCK_PRODUCTS[1], null]);
  const handleSelect = (idx, product) => setSlots(prev => { const n = [...prev]; n[idx] = product; return n; });
  const handleRemove = (idx) => setSlots(prev => { const n = [...prev]; n[idx] = null; return n; });
  const active = slots.filter(Boolean);
  const hasTwo = active.length >= 2;

  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 24px rgba(110,231,183,0.3)" }}>⚖️</div>
        <div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 24, fontWeight: 700, fontFamily: "Clash Display, sans-serif" }}>Compare Products</h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Select up to 3 products to compare side-by-side</p>
        </div>
      </div>

      <div className="compare-slots" style={{ display: "flex", gap: 14, marginBottom: 8, alignItems: "stretch" }}>
        <div className="compare-label-col" style={{ width: 160, flexShrink: 0 }} />
        {slots.map((product, i) => (
          <CompareSlot key={i} product={product} slotIndex={i} onSelect={handleSelect} onRemove={handleRemove}
            availableProducts={MOCK_PRODUCTS.filter(p => !slots.some(s => s && s._id === p._id))} />
        ))}
      </div>

      {hasTwo && (
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginTop: 24 }}>
          <div style={{ background: "rgba(110,231,183,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#6EE7B7", textTransform: "uppercase" }}>
            Pricing &amp; Ratings
          </div>
          {COMPARE_ROWS.map((row, ri) => {
            const winnerId = active.length >= 2 ? row.winner(active[0], active[1]) : null;
            const isLast = ri === COMPARE_ROWS.length - 1;
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)", background: ri % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <div className="compare-label-col" style={{ width: 160, flexShrink: 0, padding: "15px 20px", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{row.label}</div>
                {slots.map((product, si) => {
                  const isWinner = product && winnerId && product._id === winnerId;
                  return (
                    <div key={si} style={{ flex: 1, minWidth: 0, padding: "15px 20px", borderLeft: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, background: isWinner ? "rgba(110,231,183,0.04)" : "transparent" }}>
                      {product ? (
                        <>{row.render(product)}{isWinner && <Badge color="#6EE7B7">👑 BEST</Badge>}</>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 18 }}>—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {!hasTwo && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.2)", fontSize: 15 }}>
          Add at least 2 products to start comparing
        </div>
      )}
    </div>
  );
}

// ── Mock search fallback ──────────────────────────────────────────────────────
function generateMockSearchResults(query) {
  return [
    { title: `${query} - Premium Edition`, price: 24999, original_price: 32999, discount_pct: 24, rating: 4.5, review_count: 1842, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80" },
    { title: `${query} Pro Max`, price: 22499, original_price: 28000, discount_pct: 20, rating: 4.3, review_count: 5430, source: "flipkart", assured: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80" },
    { title: `${query} Wireless`, price: 19999, original_price: null, discount_pct: 0, rating: 4.6, review_count: 3211, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80" },
    { title: `${query} Lite`, price: 12995, original_price: 15995, discount_pct: 19, rating: 4.1, review_count: 8923, source: "flipkart", in_stock: true, image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&q=80" },
    { title: `${query} Ultra`, price: 54999, original_price: 64999, discount_pct: 15, rating: 4.8, review_count: 982, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&q=80" },
    { title: `${query} Classic`, price: 8999, original_price: 11999, discount_pct: 25, rating: 4.0, review_count: 12400, source: "flipkart", assured: true, in_stock: false, image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&q=80" },
    { title: `${query} Sport Edition`, price: 16499, original_price: 18999, discount_pct: 13, rating: 4.4, review_count: 2200, source: "amazon", in_stock: true, image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80" },
    { title: `${query} Home Series`, price: 34999, original_price: 44999, discount_pct: 22, rating: 4.7, review_count: 745, source: "flipkart", assured: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80" },
  ];
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [liveSearchQuery, setLiveSearchQuery] = useState("");

  useEffect(() => {
    document.body.style.cssText = "background:#050508;margin:0;padding:0;";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_LINK;
    document.head.appendChild(link);
  }, []);

  const handleSetPage = p => { setPage(p); setSelectedProduct(null); };
  const handleLiveSearch = q => { setLiveSearchQuery(q); setSearch(q); setPage("livesearch"); setSelectedProduct(null); };
  const handleViewProduct = product => setSelectedProduct(product);
  const handleBack = () => setSelectedProduct(null);

  if (selectedProduct) {
    return (
      <div style={{ minHeight: "100vh", color: "#fff", position: "relative" }}>
        <Background />
        <div style={{ position: "relative", zIndex: 1 }}>
          <NavBar page={page} setPage={handleSetPage} onLiveSearch={handleLiveSearch} />
          <ProductDetailPage product={selectedProduct} onBack={handleBack} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", color: "#fff", position: "relative" }}>
      <Background />
      <div style={{ position: "relative", zIndex: 1 }}>
        <NavBar page={page} setPage={handleSetPage} onLiveSearch={handleLiveSearch} />
        {page === "home" && <HomePage onViewProduct={handleViewProduct} onLiveSearch={handleLiveSearch} />}
        {page === "livesearch" && <LiveSearchPage initialQuery={liveSearchQuery} setSearch={setSearch} onViewProduct={handleViewProduct} />}
        {page === "alerts" && <AlertsPage />}
        {page === "compare" && <ComparePage />}
      </div>
    </div>
  );
}
