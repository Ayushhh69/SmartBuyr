import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";

// ── Google Fonts ──────────────────────────────────────────────────────────────
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
const API_BASE = "http://localhost:8000";

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

function SourceChip({ source }) {
  const cfg = source === "amazon"
    ? { bg: "#FF9900", text: "#000", label: "Amazon" }
    : { bg: "#2874F0", text: "#fff", label: "Flipkart" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.text, fontSize: 10, fontWeight: 800,
      padding: "2px 8px", borderRadius: 4, letterSpacing: 0.5, fontFamily: "Satoshi, sans-serif"
    }}>
      {cfg.label}
    </span>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function NavBar({ page, setPage, onLiveSearch }) {
  const [val, setVal] = useState("");
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "rgba(8,8,12,0.85)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", gap: 20, padding: "0 40px", height: 60,
    }}>
      {/* Logo */}
      <div onClick={() => setPage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="9" fill="url(#lg)" />
          <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#6EE7B7" /><stop offset="1" stopColor="#3B82F6" /></linearGradient></defs>
          <polyline points="6,20 12,13 18,17 26,8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <polyline points="21,8 26,8 26,13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span style={{ fontFamily: "Clash Display, sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: -0.5 }}>SmartBuyr</span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 560, position: "relative" }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
        <input value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) { onLiveSearch(val.trim()); } }}
          placeholder="Search products across Amazon & Flipkart…"
          style={{
            width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "9px 16px 9px 40px", color: "#fff", fontSize: 13.5,
            outline: "none", boxSizing: "border-box", fontFamily: "Satoshi, sans-serif",
            transition: "border-color 0.2s"
          }}
          onFocus={e => e.target.style.borderColor = "rgba(110,231,183,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
        {[["home", "Home"], ["livesearch", "Live Search"], ["alerts", "Alerts"], ["compare", "Compare"]].map(([k, label]) => (
          <button key={k} onClick={() => setPage(k)} style={{
            background: page === k ? "rgba(110,231,183,0.12)" : "transparent",
            color: page === k ? "#6EE7B7" : "rgba(255,255,255,0.5)",
            border: page === k ? "1px solid rgba(110,231,183,0.25)" : "1px solid transparent",
            borderRadius: 8, padding: "7px 14px", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "Satoshi, sans-serif",
            transition: "all 0.2s", whiteSpace: "nowrap"
          }}>{label}</button>
        ))}
      </div>
    </nav>
  );
}

// ── Product Detail (in-app, full featured) ────────────────────────────────────
function PriceHistoryChart({ product }) {
  const [range, setRange] = useState(30);
  const history = generatePriceHistory(product.current_price, range);
  const min = Math.min(...history.map(d => d.price));
  const max = Math.max(...history.map(d => d.price));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: 16, fontFamily: "Clash Display, sans-serif" }}>Price History</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2, fontFamily: "Satoshi, sans-serif" }}>
            Low <b style={{ color: "#6EE7B7" }}>{fmt(min)}</b> · High <b style={{ color: "#F87171" }}>{fmt(max)}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              background: range === d ? "#6EE7B7" : "rgba(255,255,255,0.06)",
              color: range === d ? "#000" : "rgba(255,255,255,0.5)",
              border: "none", borderRadius: 6, padding: "5px 12px",
              cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "Satoshi, sans-serif",
              transition: "all 0.2s"
            }}>{d}D</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={history} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false}
            interval={Math.floor(range / 5)} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false}
            tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "#0D0D16", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, fontFamily: "Satoshi, sans-serif" }}
            labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            formatter={v => [fmt(v), "Price"]} />
          <Area type="monotone" dataKey="price" stroke="#6EE7B7" strokeWidth={2}
            fill="url(#g1)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SellerTable({ product }) {
  const sorted = [...(product.seller_prices || [])].sort((a, b) => a.price - b.price);
  const best = sorted[0]?.price || product.current_price;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((s, i) => (
        <div key={s.seller_name} style={{
          display: "flex", alignItems: "center", gap: 12,
          background: i === 0 ? "rgba(110,231,183,0.07)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${i === 0 ? "rgba(110,231,183,0.25)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 10, padding: "12px 16px"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, fontFamily: "Satoshi, sans-serif" }}>{s.seller_name}</div>
            {!s.in_stock && <div style={{ color: "#F87171", fontSize: 11, marginTop: 2 }}>Out of stock</div>}
          </div>
          {i === 0 && <span style={{ background: "rgba(110,231,183,0.15)", color: "#6EE7B7", border: "1px solid rgba(110,231,183,0.3)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Best Price</span>}
          {i > 0 && <span style={{ color: "#F87171", fontSize: 12 }}>+{fmt(s.price - best)}</span>}
          <div style={{ fontWeight: 800, fontSize: 18, color: i === 0 ? "#6EE7B7" : "#fff", fontFamily: "Clash Display, sans-serif" }}>{fmt(s.price)}</div>
          <button disabled={!s.in_stock} style={{
            background: s.in_stock ? "rgba(110,231,183,0.15)" : "rgba(255,255,255,0.05)",
            color: s.in_stock ? "#6EE7B7" : "rgba(255,255,255,0.3)",
            border: `1px solid ${s.in_stock ? "rgba(110,231,183,0.3)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600,
            cursor: s.in_stock ? "pointer" : "not-allowed", fontFamily: "Satoshi, sans-serif"
          }}>{s.in_stock ? "Select" : "Unavailable"}</button>
        </div>
      ))}
    </div>
  );
}

function ReviewsPanel({ reviews }) {
  const total = reviews.length;
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => dist[Math.round(r.rating)]++);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20 }}>
        <div style={{ textAlign: "center", minWidth: 80 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "Clash Display, sans-serif" }}>{avg}</div>
          <Stars rating={parseFloat(avg)} size={14} />
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4, fontFamily: "Satoshi, sans-serif" }}>{total} reviews</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", width: 6, fontFamily: "Satoshi, sans-serif" }}>{star}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 6 }}>
                <div style={{ height: "100%", background: "#F59E0B", width: `${(dist[star] / total) * 100}%`, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", width: 16, fontFamily: "Satoshi, sans-serif" }}>{dist[star]}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Review cards */}
      {reviews.map(r => (
        <div key={r._id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{r.user_name[0]}</div>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, fontFamily: "Satoshi, sans-serif" }}>{r.user_name}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                <Stars rating={r.rating} size={12} />
                {r.verified && <span style={{ background: "rgba(110,231,183,0.1)", color: "#6EE7B7", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>✓ Verified</span>}
              </div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Satoshi, sans-serif" }}>{r.created_at}</span>
          </div>
          <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.9)", marginBottom: 6, fontFamily: "Satoshi, sans-serif" }}>{r.title}</div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.6, margin: "0 0 10px", fontFamily: "Satoshi, sans-serif" }}>{r.body}</p>
          {(r.pros.length > 0 || r.cons.length > 0) && (
            <div style={{ display: "flex", gap: 20 }}>
              {r.pros.length > 0 && <div>{r.pros.map(p => <div key={p} style={{ fontSize: 12, color: "#6EE7B7", fontFamily: "Satoshi, sans-serif" }}>+ {p}</div>)}</div>}
              {r.cons.length > 0 && <div>{r.cons.map(c => <div key={c} style={{ fontSize: 12, color: "#F87171", fontFamily: "Satoshi, sans-serif" }}>− {c}</div>)}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AlertModal({ product, onClose }) {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(Math.round(product.current_price * 0.9));
  const [saved, setSaved] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#0D0D16", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32, maxWidth: 400, width: "90%", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        {saved ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔔</div>
            <div style={{ color: "#6EE7B7", fontSize: 18, fontWeight: 700, fontFamily: "Clash Display, sans-serif" }}>Alert Set!</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8, fontFamily: "Satoshi, sans-serif" }}>We'll notify you when the price drops below {fmt(targetPrice)}</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "Clash Display, sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 4 }}>🔔 Price Drop Alert</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 24, fontFamily: "Satoshi, sans-serif" }}>{product.name || product.title}</div>
            {[["Email Address", email, setEmail, "text", "you@example.com"],
            ["Alert when price drops below", targetPrice, setTargetPrice, "number", ""]].map(([label, val, set, type, ph]) => (
              <label key={label} style={{ display: "block", marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6, fontFamily: "Satoshi, sans-serif" }}>{label}</div>
                <input type={type} value={val} onChange={e => set(type === "number" ? parseInt(e.target.value) : e.target.value)} placeholder={ph}
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "Satoshi, sans-serif" }} />
              </label>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "Satoshi, sans-serif", fontWeight: 600 }}>Cancel</button>
              <button onClick={() => { if (email && targetPrice) setSaved(true); }} style={{ flex: 2, background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", border: "none", borderRadius: 10, padding: 12, color: "#000", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "Satoshi, sans-serif" }}>Set Alert</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Full In-App Product Detail Page ───────────────────────────────────────────
function ProductDetailPage({ product, onBack }) {
  const [tab, setTab] = useState("price");
  const [showAlert, setShowAlert] = useState(false);
  const [wishlist, setWishlist] = useState(false);

  // Normalize both mock products and live search results
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

  const TABS = [
    ["price", "📈 Price History"],
    ["sellers", "🏪 Sellers"],
    ["reviews", "⭐ Reviews"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#08080C" }}>
      {showAlert && <AlertModal product={product} onClose={() => setShowAlert(false)} />}

      {/* Back bar */}
      <div style={{ padding: "16px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: "Satoshi, sans-serif", transition: "color 0.2s" }}
          onMouseEnter={e => e.target.style.color = "#6EE7B7"}
          onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.4)"}>
          ← Back to results
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 40px" }}>
        {/* Hero section */}
        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 40, marginBottom: 40 }}>
          {/* Image */}
          <div style={{ borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {image
              ? <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 16 }} />
              : <div style={{ fontSize: 80, opacity: 0.3 }}>📦</div>
            }
            {discountPct > 0 && (
              <div style={{ position: "absolute", top: 16, left: 16, background: "#EF4444", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, fontFamily: "Satoshi, sans-serif" }}>−{discountPct}%</div>
            )}
            {product.prime && (
              <div style={{ position: "absolute", bottom: 16, left: 16, background: "#00A8E0", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, fontFamily: "Satoshi, sans-serif" }}>prime</div>
            )}
            {product.assured && (
              <div style={{ position: "absolute", bottom: 16, left: 16, background: "#2874F0", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 5, fontFamily: "Satoshi, sans-serif" }}>FK Assured</div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Brand + source */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {brand && <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "Satoshi, sans-serif" }}>{brand}</span>}
              {category && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "Satoshi, sans-serif" }}>· {category}</span>}
              {product.source && <SourceChip source={product.source} />}
            </div>

            {/* Title */}
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.25, fontFamily: "Clash Display, sans-serif" }}>{name}</h1>

            {/* Rating */}
            {rating && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Stars rating={rating} size={16} />
                <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: 14, fontFamily: "Satoshi, sans-serif" }}>{rating}</span>
                {reviews && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "Satoshi, sans-serif" }}>({Number(reviews).toLocaleString("en-IN")} reviews)</span>}
              </div>
            )}

            {/* Price block */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1, fontFamily: "Clash Display, sans-serif" }}>{fmt(price)}</div>
              {origPrice && origPrice > price && (
                <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", textDecoration: "line-through", fontFamily: "Satoshi, sans-serif" }}>{fmt(origPrice)}</span>
                  <span style={{ fontSize: 13, color: "#6EE7B7", fontWeight: 700, fontFamily: "Satoshi, sans-serif" }}>Save {fmt(savings)}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {lowestPrice && <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Satoshi, sans-serif" }}>All-Time Low</div><div style={{ color: "#6EE7B7", fontWeight: 700, fontSize: 15, fontFamily: "Satoshi, sans-serif" }}>{fmt(lowestPrice)}</div></div>}
                {origPrice && origPrice > price && <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Satoshi, sans-serif" }}>All-Time High</div><div style={{ color: "#F87171", fontWeight: 700, fontSize: 15, fontFamily: "Satoshi, sans-serif" }}>{fmt(origPrice)}</div></div>}
                {sellerPrices.length > 0 && <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, fontFamily: "Satoshi, sans-serif" }}>Sellers</div><div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "Satoshi, sans-serif" }}>{sellerPrices.length} stores</div></div>}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tags.map(t => (
                  <span key={t} style={{ background: "rgba(110,231,183,0.08)", color: "rgba(110,231,183,0.7)", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontFamily: "Satoshi, sans-serif" }}>{t}</span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <button onClick={() => setShowAlert(true)} style={{
                flex: 1, background: "linear-gradient(135deg,#6EE7B7,#3B82F6)",
                border: "none", borderRadius: 12, padding: "13px", color: "#000",
                cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "Satoshi, sans-serif",
                letterSpacing: 0.3
              }}>🔔 Set Price Alert</button>
              <button onClick={() => setWishlist(w => !w)} style={{
                background: wishlist ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${wishlist ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, padding: "13px 18px", cursor: "pointer",
                color: wishlist ? "#F87171" : "rgba(255,255,255,0.4)", fontSize: 18
              }}>{wishlist ? "♥" : "♡"}</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 28 }}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: "none", border: "none", padding: "12px 22px",
              cursor: "pointer", color: tab === k ? "#6EE7B7" : "rgba(255,255,255,0.35)",
              fontWeight: tab === k ? 700 : 500, fontSize: 13.5, fontFamily: "Satoshi, sans-serif",
              borderBottom: tab === k ? "2px solid #6EE7B7" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.2s"
            }}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
          {tab === "price" && <PriceHistoryChart product={{ current_price: price }} />}
          {tab === "sellers" && (
            sellerPrices.length > 0
              ? <SellerTable product={product} />
              : <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)", fontFamily: "Satoshi, sans-serif" }}>No seller data available for this product.</div>
          )}
          {tab === "reviews" && <ReviewsPanel reviews={MOCK_REVIEWS} />}
        </div>
      </div>
    </div>
  );
}

// ── Live Search Result Card (click to open detail, not external link) ─────────
function SearchResultCard({ item, onClick }) {
  const hasDiscount = item.discount_pct > 0;
  const savings = item.original_price && item.price ? item.original_price - item.price : 0;
  return (
    <div onClick={onClick} style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
      cursor: "pointer", transition: "all 0.25s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(110,231,183,0.4)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(110,231,183,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Image */}
      <div style={{ height: 200, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} onError={e => { e.target.style.display = "none"; }} />
          : <div style={{ fontSize: 50, opacity: 0.2 }}>📦</div>
        }
        {hasDiscount && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#EF4444", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, fontFamily: "Satoshi, sans-serif" }}>−{item.discount_pct}%</div>
        )}
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <SourceChip source={item.source} />
        </div>
        {item.prime && <div style={{ position: "absolute", bottom: 10, left: 10, background: "#00A8E0", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, fontFamily: "Satoshi, sans-serif" }}>prime</div>}
        {item.assured && <div style={{ position: "absolute", bottom: 10, left: 10, background: "#2874F0", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4, fontFamily: "Satoshi, sans-serif" }}>FK Assured</div>}

        {/* View detail overlay hint */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(110,231,183,0.06)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <span style={{ background: "rgba(0,0,0,0.7)", color: "#6EE7B7", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "Satoshi, sans-serif" }}>View Details →</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "Satoshi, sans-serif"
        }}>
          {item.title}
        </div>
        {item.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Stars rating={item.rating} size={11} />
            <span style={{ fontSize: 11.5, color: "#F59E0B", fontWeight: 600, fontFamily: "Satoshi, sans-serif" }}>{item.rating}</span>
            {item.review_count && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "Satoshi, sans-serif" }}>({Number(item.review_count).toLocaleString()})</span>}
          </div>
        )}
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif" }}>{fmt(item.price)}</div>
          {item.original_price && item.original_price > item.price && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "line-through", fontFamily: "Satoshi, sans-serif" }}>{fmt(item.original_price)}</span>
              <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 600, fontFamily: "Satoshi, sans-serif" }}>Save {fmt(savings)}</span>
            </div>
          )}
        </div>
        {/* Click-to-detail button — replaces external link */}
        <button style={{
          width: "100%", background: "rgba(110,231,183,0.08)",
          color: "#6EE7B7", border: "1px solid rgba(110,231,183,0.2)",
          borderRadius: 9, padding: "9px", cursor: "pointer",
          fontWeight: 700, fontSize: 13, textAlign: "center",
          fontFamily: "Satoshi, sans-serif", transition: "all 0.2s"
        }}
          onMouseEnter={e => { e.target.style.background = "rgba(110,231,183,0.15)"; e.target.style.borderColor = "rgba(110,231,183,0.4)"; }}
          onMouseLeave={e => { e.target.style.background = "rgba(110,231,183,0.08)"; e.target.style.borderColor = "rgba(110,231,183,0.2)"; }}
        >
          View Details →
        </button>
        {!item.in_stock && <div style={{ textAlign: "center", fontSize: 11, color: "#F87171", fontWeight: 600, fontFamily: "Satoshi, sans-serif" }}>⚠ Out of Stock</div>}
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px" }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, maxWidth: 700 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && inputVal.trim()) { setQuery(inputVal); setSearch(inputVal); runSearch(inputVal); } }}
            placeholder="Search across Amazon & Flipkart…"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px 12px 42px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "Satoshi, sans-serif" }}
          />
        </div>
        <button onClick={() => { setQuery(inputVal); setSearch(inputVal); runSearch(inputVal); }}
          style={{ background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", border: "none", borderRadius: 12, padding: "0 24px", color: "#000", cursor: "pointer", fontWeight: 800, fontSize: 14, fontFamily: "Satoshi, sans-serif", whiteSpace: "nowrap" }}>
          Search
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16 }}>
            {["Amazon", "Flipkart"].map((s, i) => (
              <div key={s} style={{ background: i === 0 ? "rgba(255,153,0,0.1)" : "rgba(40,116,240,0.1)", border: `1px solid ${i === 0 ? "#FF9900" : "#2874F0"}`, borderRadius: 12, padding: "12px 24px", color: i === 0 ? "#FF9900" : "#60A5FA", fontWeight: 700, fontSize: 14, animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.3}s`, fontFamily: "Satoshi, sans-serif" }}>
                🔍 Searching {s}…
              </div>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "Satoshi, sans-serif" }}>Fetching live prices — ~5 seconds</div>
          <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          {/* Meta + filters */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Satoshi, sans-serif" }}>
                <b style={{ color: "#fff" }}>{displayed.length}</b> results for <b style={{ color: "#6EE7B7" }}>"{query}"</b>
                {meta?.mock && <span style={{ color: "#F59E0B", fontSize: 12, marginLeft: 8 }}>(demo data)</span>}
                {meta?.cached && <span style={{ color: "#6EE7B7", fontSize: 12, marginLeft: 8 }}>⚡ cached</span>}
              </span>
              {meta && (
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ background: "rgba(255,153,0,0.1)", color: "#FF9900", border: "1px solid rgba(255,153,0,0.2)", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontFamily: "Satoshi, sans-serif" }}>Amazon: {meta.amazon}</span>
                  <span style={{ background: "rgba(40,116,240,0.1)", color: "#60A5FA", border: "1px solid rgba(40,116,240,0.2)", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontFamily: "Satoshi, sans-serif" }}>Flipkart: {meta.flipkart}</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3, gap: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
                {[["all", "All"], ["amazon", "Amazon"], ["flipkart", "Flipkart"]].map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)} style={{
                    background: filter === val ? (val === "amazon" ? "#FF9900" : val === "flipkart" ? "#2874F0" : "#6EE7B7") : "transparent",
                    color: filter === val ? (val === "amazon" || val === "flipkart" ? "#fff" : "#000") : "rgba(255,255,255,0.4)",
                    border: "none", borderRadius: 6, padding: "5px 12px",
                    cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", fontFamily: "Satoshi, sans-serif"
                  }}>{label}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", fontFamily: "Satoshi, sans-serif" }}>
                <option value="default">Sort: Relevance</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="rating">Best Rated</option>
                <option value="discount">Best Discount</option>
              </select>
            </div>
          </div>

          {/* Grid — cards open in-app detail, NOT external links */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {displayed.map((item, i) => (
              <SearchResultCard key={`${item.source}-${i}`} item={item} onClick={() => onViewProduct(item)} />
            ))}
          </div>
        </>
      )}

      {/* Empty */}
      {!loading && results.length === 0 && query && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif" }}>No results found</div>
          <div style={{ color: "rgba(255,255,255,0.3)", marginTop: 6, fontFamily: "Satoshi, sans-serif" }}>Try a different search term</div>
        </div>
      )}

      {/* Prompt chips */}
      {!loading && !query && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif", marginBottom: 8 }}>Search Live Prices</div>
          <div style={{ color: "rgba(255,255,255,0.35)", marginBottom: 28, fontFamily: "Satoshi, sans-serif" }}>Results open inside SmartBuyr — compare, track, and set alerts without leaving</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {["Sony headphones", "iPhone 15", "Nike shoes", "Samsung TV", "MacBook Air", "Gaming laptop", "milk frother", "Air purifier"].map(s => (
              <button key={s} onClick={() => { setInputVal(s); setQuery(s); setSearch(s); runSearch(s); }}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "8px 18px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontFamily: "Satoshi, sans-serif", transition: "all 0.2s" }}
                onMouseEnter={e => { e.target.style.borderColor = "rgba(110,231,183,0.4)"; e.target.style.color = "#6EE7B7"; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.5)"; }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ onViewProduct, onLiveSearch }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 40px" }}>
      {/* Hero */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "52px 56px", marginBottom: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, background: "radial-gradient(circle,rgba(110,231,183,0.08),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["LIVE TRACKING", "PRICE ALERTS", "REVIEW ANALYSIS"].map(b => (
              <span key={b} style={{ background: "rgba(110,231,183,0.1)", color: "#6EE7B7", border: "1px solid rgba(110,231,183,0.2)", borderRadius: 20, padding: "3px 12px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, fontFamily: "Satoshi, sans-serif" }}>{b}</span>
            ))}
          </div>
          <h1 style={{ margin: "0 0 14px", fontSize: 52, fontWeight: 700, color: "#fff", lineHeight: 1.1, fontFamily: "Clash Display, sans-serif" }}>
            Track Prices.<br /><span style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", background: "linear-gradient(90deg,#6EE7B7,#3B82F6)" }}>Buy Smarter.</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16, maxWidth: 500, margin: "0 0 28px", lineHeight: 1.6, fontFamily: "Satoshi, sans-serif" }}>
            Monitor prices across Amazon & Flipkart. View full product details right here — no jumping between tabs.
          </p>
          <button onClick={() => onLiveSearch("")} style={{ background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", border: "none", borderRadius: 12, padding: "13px 28px", color: "#000", cursor: "pointer", fontWeight: 800, fontSize: 15, fontFamily: "Satoshi, sans-serif" }}>
            Start Searching →
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 44 }}>
        {[["1,200+", "Products Tracked", "#6EE7B7"], ["₹4.2Cr", "Savings Found", "#3B82F6"], ["50K+", "Alerts Sent", "#F59E0B"], ["2.5L+", "Reviews", "#F87171"]].map(([v, l, c]) => (
          <div key={l} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c, fontFamily: "Clash Display, sans-serif" }}>{v}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4, fontFamily: "Satoshi, sans-serif" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Trending products */}
      <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 18, fontFamily: "Clash Display, sans-serif" }}>Trending Products</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 18 }}>
        {MOCK_PRODUCTS.map(p => (
          <div key={p._id} onClick={() => onViewProduct(p)} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "all 0.25s"
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(110,231,183,0.4)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
              <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 10, left: 10, background: "#EF4444", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, fontFamily: "Satoshi, sans-serif" }}>
                ↓ {Math.abs(pct(p.current_price, p.highest_price))}%
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontFamily: "Satoshi, sans-serif" }}>{p.brand}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8, lineHeight: 1.3, fontFamily: "Satoshi, sans-serif" }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Stars rating={p.avg_rating} size={12} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Satoshi, sans-serif" }}>({p.review_count.toLocaleString()})</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "Clash Display, sans-serif" }}>{fmt(p.current_price)}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, fontFamily: "Satoshi, sans-serif" }}>Lowest: {fmt(p.lowest_price)}</div>
            </div>
          </div>
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
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px" }}>
      <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 700, marginBottom: 24, fontFamily: "Clash Display, sans-serif" }}>🔔 My Price Alerts</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {alerts.map(a => (
          <div key={a.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${a.triggered ? "rgba(110,231,183,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 15, marginBottom: 4, fontFamily: "Satoshi, sans-serif" }}>{a.product_name}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "Satoshi, sans-serif" }}>
                Target: <b style={{ color: "#6EE7B7" }}>{fmt(a.target_price)}</b> · Current: <b style={{ color: "#fff" }}>{fmt(a.current_price)}</b> · Need: <b style={{ color: "#F87171" }}>↓{fmt(a.current_price - a.target_price)}</b>
              </div>
            </div>
            <span style={{ background: a.triggered ? "rgba(110,231,183,0.1)" : "rgba(245,158,11,0.1)", color: a.triggered ? "#6EE7B7" : "#F59E0B", border: `1px solid ${a.triggered ? "rgba(110,231,183,0.25)" : "rgba(245,158,11,0.25)"}`, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700, fontFamily: "Satoshi, sans-serif" }}>
              {a.triggered ? "✓ Triggered" : "⏳ Watching"}
            </span>
            <button style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "6px 12px", color: "#F87171", cursor: "pointer", fontSize: 12, fontFamily: "Satoshi, sans-serif" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compare Page ──────────────────────────────────────────────────────────────
const COMPARE_ROWS = [
  {
    key: "current_price", label: "Current Price",
    render: (p) => <span style={{ color: "#6EE7B7", fontWeight: 700, fontSize: 17, fontFamily: "Clash Display, sans-serif" }}>{fmt(p.current_price)}</span>,
    winner: (a, b) => a.current_price <= b.current_price ? a._id : b._id,
  },
  {
    key: "lowest_price", label: "Lowest Ever",
    render: (p) => <span style={{ color: "#6EE7B7", fontWeight: 600, fontFamily: "Satoshi, sans-serif" }}>{fmt(p.lowest_price)}</span>,
    winner: (a, b) => a.lowest_price <= b.lowest_price ? a._id : b._id,
  },
  {
    key: "avg_rating", label: "Avg Rating",
    render: (p) => (
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Stars rating={p.avg_rating} size={13} />
        <span style={{ color: "#F59E0B", fontWeight: 700, fontSize: 13, fontFamily: "Satoshi, sans-serif" }}>{p.avg_rating}</span>
      </span>
    ),
    winner: (a, b) => a.avg_rating >= b.avg_rating ? a._id : b._id,
  },
  {
    key: "review_count", label: "Reviews",
    render: (p) => <span style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Satoshi, sans-serif" }}>{p.review_count.toLocaleString()}</span>,
    winner: (a, b) => a.review_count >= b.review_count ? a._id : b._id,
  },
  {
    key: "sellers", label: "Sellers",
    render: (p) => <span style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Satoshi, sans-serif" }}>{p.seller_prices.length} stores</span>,
    winner: (a, b) => a.seller_prices.length >= b.seller_prices.length ? a._id : b._id,
  },
  {
    key: "price_drop", label: "Price Drop",
    render: (p) => <span style={{ color: "#F87171", fontWeight: 600, fontFamily: "Satoshi, sans-serif" }}>{Math.abs(pct(p.current_price, p.highest_price))}% from high</span>,
    winner: (a, b) => Math.abs(pct(a.current_price, a.highest_price)) >= Math.abs(pct(b.current_price, b.highest_price)) ? a._id : b._id,
  },
];

function CompareSlot({ product, slotIndex, onSelect, onRemove, availableProducts }) {
  const [dropOpen, setDropOpen] = useState(false);

  if (!product) {
    return (
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          onClick={() => setDropOpen(o => !o)}
          style={{
            height: "100%", minHeight: 220,
            border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 14,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 10, cursor: "pointer", transition: "all 0.2s",
            background: "rgba(255,255,255,0.01)",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(110,231,183,0.4)"; e.currentTarget.style.background = "rgba(110,231,183,0.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.01)"; }}
        >
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(110,231,183,0.1)", border: "1px solid rgba(110,231,183,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "#6EE7B7" }}>+</div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontFamily: "Satoshi, sans-serif" }}>Add product</span>
        </div>
        {dropOpen && availableProducts.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, background: "#0D0D16", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, zIndex: 100, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            {availableProducts.map(p => (
              <div key={p._id}
                onClick={() => { onSelect(slotIndex, p); setDropOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <img src={p.image_url} alt={p.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8 }} />
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "Satoshi, sans-serif" }}>{p.name}</div>
                  <div style={{ color: "#6EE7B7", fontSize: 11, fontFamily: "Satoshi, sans-serif" }}>{p.brand}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", position: "relative" }}>
      {/* Remove */}
      <button onClick={() => onRemove(slotIndex)} style={{ position: "absolute", top: 10, right: 10, zIndex: 10, width: 26, height: 26, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
      {/* Image */}
      <div style={{ height: 160, overflow: "hidden", position: "relative" }}>
        <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(8,8,12,0.85))" }} />
      </div>
      {/* Info */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 11, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, fontFamily: "Satoshi, sans-serif" }}>{product.brand}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, fontFamily: "Satoshi, sans-serif" }}>{product.name}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, fontFamily: "Satoshi, sans-serif" }}>{product.category}</div>
      </div>
    </div>
  );
}

function ComparePage() {
  const EMPTY = null;
  const [slots, setSlots] = useState([MOCK_PRODUCTS[0], MOCK_PRODUCTS[1], EMPTY]);

  const handleSelect = (idx, product) => {
    setSlots(prev => { const n = [...prev]; n[idx] = product; return n; });
  };
  const handleRemove = (idx) => {
    setSlots(prev => { const n = [...prev]; n[idx] = EMPTY; return n; });
  };

  const active = slots.filter(Boolean);
  const hasTwo = active.length >= 2;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#6EE7B7,#3B82F6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚖️</div>
        <div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 700, fontFamily: "Clash Display, sans-serif" }}>Compare Products</h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "Satoshi, sans-serif" }}>Select up to 3 products to compare side-by-side</p>
        </div>
      </div>

      {/* Slots row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 6, alignItems: "stretch" }}>
        {/* Label spacer */}
        <div style={{ width: 160, flexShrink: 0 }} />
        {slots.map((product, i) => (
          <CompareSlot
            key={i}
            product={product}
            slotIndex={i}
            onSelect={handleSelect}
            onRemove={handleRemove}
            availableProducts={MOCK_PRODUCTS.filter(p => !slots.some(s => s && s._id === p._id))}
          />
        ))}
      </div>

      {/* Comparison table */}
      {hasTwo && (
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginTop: 20 }}>
          {/* Section header */}
          <div style={{ background: "rgba(110,231,183,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#6EE7B7", textTransform: "uppercase", fontFamily: "Satoshi, sans-serif" }}>
            Pricing &amp; Ratings
          </div>

          {COMPARE_ROWS.map((row, ri) => {
            const winnerId = active.length >= 2 ? row.winner(active[0], active[1]) : null;
            const isLast = ri === COMPARE_ROWS.length - 1;
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.06)", background: ri % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                {/* Label */}
                <div style={{ width: 160, flexShrink: 0, padding: "16px 20px", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Satoshi, sans-serif" }}>{row.label}</div>
                {/* Values */}
                {slots.map((product, si) => {
                  const isWinner = product && winnerId && product._id === winnerId;
                  return (
                    <div key={si} style={{ flex: 1, minWidth: 0, padding: "16px 20px", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8, background: isWinner ? "rgba(110,231,183,0.05)" : "transparent" }}>
                      {product ? (
                        <>
                          {row.render(product)}
                          {isWinner && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#6EE7B7", background: "rgba(110,231,183,0.12)", border: "1px solid rgba(110,231,183,0.25)", borderRadius: 4, padding: "2px 7px", letterSpacing: 0.5, fontFamily: "Satoshi, sans-serif", whiteSpace: "nowrap" }}>👑 BEST</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 18 }}>—</span>
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
        <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.2)", fontSize: 15, fontFamily: "Satoshi, sans-serif" }}>
          Add at least 2 products to start comparing
        </div>
      )}
    </div>
  );
}

// ── Mock search fallback ──────────────────────────────────────────────────────
function generateMockSearchResults(query) {
  return [
    { title: `${query} - Premium Edition`, price: 24999, original_price: 32999, discount_pct: 24, rating: 4.5, review_count: 1842, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Pro Max`, price: 22499, original_price: 28000, discount_pct: 20, rating: 4.3, review_count: 5430, source: "flipkart", assured: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", product_url: "https://flipkart.com" },
    { title: `${query} Wireless`, price: 19999, original_price: null, discount_pct: 0, rating: 4.6, review_count: 3211, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Lite`, price: 12995, original_price: 15995, discount_pct: 19, rating: 4.1, review_count: 8923, source: "flipkart", in_stock: true, image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&q=80", product_url: "https://flipkart.com" },
    { title: `${query} Ultra`, price: 54999, original_price: 64999, discount_pct: 15, rating: 4.8, review_count: 982, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Classic`, price: 8999, original_price: 11999, discount_pct: 25, rating: 4.0, review_count: 12400, source: "flipkart", assured: true, in_stock: false, image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&q=80", product_url: "https://flipkart.com" },
    { title: `${query} Sport Edition`, price: 16499, original_price: 18999, discount_pct: 13, rating: 4.4, review_count: 2200, source: "amazon", in_stock: true, image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Home Series`, price: 34999, original_price: 44999, discount_pct: 22, rating: 4.7, review_count: 745, source: "flipkart", assured: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80", product_url: "https://flipkart.com" },
  ];
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [liveSearchQuery, setLiveSearchQuery] = useState("");

  useEffect(() => {
    document.body.style.cssText = "background:#08080C;margin:0;padding:0;";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_LINK;
    document.head.appendChild(link);
  }, []);

  const handleSetPage = (p) => { setPage(p); setSelectedProduct(null); };

  const handleLiveSearch = (q) => {
    setLiveSearchQuery(q);
    setSearch(q);
    setPage("livesearch");
    setSelectedProduct(null);
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleBack = () => {
    setSelectedProduct(null);
  };

  // If a product is selected, always show the detail page
  if (selectedProduct) {
    return (
      <div style={{ minHeight: "100vh", background: "#08080C", color: "#fff" }}>
        <NavBar page={page} setPage={handleSetPage} onLiveSearch={handleLiveSearch} />
        <ProductDetailPage product={selectedProduct} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08080C", color: "#fff" }}>
      <NavBar page={page} setPage={handleSetPage} onLiveSearch={handleLiveSearch} />
      {page === "home" && <HomePage onViewProduct={handleViewProduct} onLiveSearch={handleLiveSearch} />}
      {page === "livesearch" && <LiveSearchPage initialQuery={liveSearchQuery} setSearch={setSearch} onViewProduct={handleViewProduct} />}
      {page === "alerts" && <AlertsPage />}
      {page === "compare" && <ComparePage />}
    </div>
  );
}
