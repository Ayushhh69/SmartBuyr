import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend
} from "recharts";

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
  { _id:"r1", user_name:"Arjun Mehta", rating:5, title:"Absolutely worth it!", body:"The noise cancellation is incredible. Used it on a 12hr flight and it was life-changing. Build quality is top notch.", pros:["Great ANC","Long battery life","Comfortable"], cons:["Slightly bulky"], sentiment:"positive", created_at:"2024-01-15", helpful:{yes:84,no:3}, verified:true },
  { _id:"r2", user_name:"Priya Sharma", rating:4, title:"Almost perfect", body:"Sound quality is brilliant and the ANC works great in most environments. The touch controls take getting used to but overall a solid buy.", pros:["Amazing sound","Good build"], cons:["Touch controls take time"], sentiment:"positive", created_at:"2024-01-10", helpful:{yes:52,no:7}, verified:true },
  { _id:"r3", user_name:"Ravi Kumar", rating:2, title:"Disappointed with mic quality", body:"The headphones sound great for music but the mic quality during calls is quite poor. People complain they can barely hear me.", pros:["Music quality"], cons:["Poor mic","Expensive"], sentiment:"negative", created_at:"2024-01-05", helpful:{yes:39,no:12}, verified:false },
  { _id:"r4", user_name:"Deepika Nair", rating:5, title:"Best headphones I've owned", body:"Upgraded from Bose QC35 and these are leagues ahead. The adaptive ANC adjusts perfectly to surroundings.", pros:["Best-in-class ANC","Multi-device"], cons:[], sentiment:"positive", created_at:"2023-12-28", helpful:{yes:71,no:2}, verified:true },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
const fmt = (n) => "₹" + n.toLocaleString("en-IN");
const pct = (a, b) => ((a - b) / b * 100).toFixed(1);

function StarRating({ rating, size = 16 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

function Badge({ children, color = "#10B981" }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function NavBar({ page, setPage, search, setSearch, onLiveSearch }) {
  const [focused, setFocused] = useState(false);
  const handleKey = (e) => {
    if (e.key === "Enter" && search.trim()) onLiveSearch(search.trim());
  };
  return (
    <nav style={{
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      padding: "0 48px", height: 64, display: "flex", alignItems: "center",
      gap: 24, position: "sticky", top: 0, zIndex: 100,
      borderBottom: "1px solid #334155", boxShadow: "0 4px 24px #0008"
    }}>
      <div onClick={() => setPage("home")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#F1F5F9", letterSpacing: -0.5 }}>PriceWatch</span>
      </div>
      <div style={{ flex: 1, maxWidth: 700, position: "relative" }}>
        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search Amazon & Flipkart... (press Enter)"
          style={{
            width: "100%", background: focused ? "#0F172A" : "#1E293B",
            border: `1px solid ${focused ? "#6366F1" : "#334155"}`,
            borderRadius: 10, padding: "10px 116px 10px 40px",
            color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box",
            transition: "all 0.2s", boxShadow: focused ? "0 0 0 3px #6366F122" : "none"
          }}
        />
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4, pointerEvents: "none" }}>
          <span style={{ background: "#FF9900", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>AMZ</span>
          <span style={{ background: "#2874F0", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>FK</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        {[["Home","home"],["Live Search","livesearch"],["Alerts","alerts"],["Compare","compare"]].map(([label, key]) => (
          <button key={key} onClick={() => setPage(key)} style={{
            background: page === key ? (key === "livesearch" ? "#FF990022" : "#6366F122") : "transparent",
            color: page === key ? (key === "livesearch" ? "#FF9900" : "#818CF8") : "#94A3B8",
            border: page === key ? `1px solid ${key === "livesearch" ? "#FF990044" : "#6366F144"}` : "1px solid transparent",
            borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap"
          }}>{label}</button>
        ))}
      </div>
    </nav>
  );
}

function ProductCard({ product, onClick }) {
  const drop = product.current_price < product.highest_price;
  const dropPct = Math.abs(pct(product.current_price, product.highest_price));
  return (
    <div onClick={onClick} style={{
      background: "linear-gradient(145deg,#1E293B,#162032)", border: "1px solid #334155",
      borderRadius: 16, overflow: "hidden", cursor: "pointer", transition: "all 0.25s",
      display: "flex", flexDirection: "column"
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.boxShadow = "0 12px 40px #6366F122"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
        <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {drop && <div style={{ position: "absolute", top: 12, right: 12, background: "#EF4444", color: "white", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>↓ {dropPct}% OFF</div>}
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{product.brand} · {product.category}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.3 }}>{product.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StarRating rating={product.avg_rating} size={13} />
          <span style={{ fontSize: 12, color: "#64748B" }}>({product.review_count.toLocaleString()})</span>
        </div>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9" }}>{fmt(product.current_price)}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Lowest ever: {fmt(product.lowest_price)}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#64748B" }}>
            <div>{product.seller_prices.length} sellers</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceHistoryChart({ product }) {
  const [range, setRange] = useState(30);
  const history = generatePriceHistory(product.current_price, range);
  const min = Math.min(...history.map(d => d.price));
  const max = Math.max(...history.map(d => d.price));

  return (
    <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, color: "#F1F5F9", fontSize: 18, fontWeight: 700 }}>Price History</h3>
          <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 13 }}>Min: <b style={{ color: "#10B981" }}>{fmt(min)}</b> · Max: <b style={{ color: "#EF4444" }}>{fmt(max)}</b></p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              background: range === d ? "#6366F1" : "#0F172A",
              color: range === d ? "white" : "#64748B",
              border: "1px solid " + (range === d ? "#6366F1" : "#334155"),
              borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600
            }}>{d}D</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={history} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} interval={Math.floor(range / 6)} />
          <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8, fontSize: 13 }}
            labelStyle={{ color: "#94A3B8" }}
            formatter={(v) => [fmt(v), "Price"]}
          />
          <Area type="monotone" dataKey="price" stroke="#6366F1" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SellerComparison({ product }) {
  const sorted = [...product.seller_prices].sort((a, b) => a.price - b.price);
  const best = sorted[0]?.price || product.current_price;
  return (
    <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: 24 }}>
      <h3 style={{ margin: "0 0 16px", color: "#F1F5F9", fontSize: 18, fontWeight: 700 }}>Compare Prices</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((s, i) => (
          <div key={s.seller_name} style={{
            display: "flex", alignItems: "center", gap: 14,
            background: i === 0 ? "#10B98112" : "#0F172A",
            border: `1px solid ${i === 0 ? "#10B98144" : "#1E293B"}`,
            borderRadius: 10, padding: "12px 16px"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14 }}>{s.seller_name}</div>
              {!s.in_stock && <div style={{ color: "#EF4444", fontSize: 11 }}>Out of stock</div>}
            </div>
            {i === 0 && <Badge color="#10B981">Best Price</Badge>}
            {i > 0 && <span style={{ fontSize: 11, color: "#EF4444" }}>+{fmt(s.price - best)} more</span>}
            <div style={{ fontWeight: 800, fontSize: 18, color: i === 0 ? "#10B981" : "#F1F5F9" }}>{fmt(s.price)}</div>
            <button style={{
              background: s.in_stock ? "#6366F1" : "#334155", color: "white", border: "none",
              borderRadius: 8, padding: "8px 16px", cursor: s.in_stock ? "pointer" : "not-allowed",
              fontSize: 13, fontWeight: 600
            }} disabled={!s.in_stock}>
              {s.in_stock ? "Buy Now" : "Sold Out"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsSection({ reviews }) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => dist[Math.round(r.rating)]++);
  const total = reviews.length;
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const sentiments = { positive: reviews.filter(r => r.sentiment === "positive").length, negative: reviews.filter(r => r.sentiment === "negative").length, neutral: reviews.filter(r => r.sentiment === "neutral").length };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary */}
      <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: 24, display: "flex", gap: 32 }}>
        <div style={{ textAlign: "center", minWidth: 100 }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: "#F1F5F9", lineHeight: 1 }}>{avg}</div>
          <StarRating rating={parseFloat(avg)} size={18} />
          <div style={{ color: "#64748B", fontSize: 12, marginTop: 6 }}>{total} reviews</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#64748B", width: 8 }}>{star}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
              <div style={{ flex: 1, background: "#0F172A", borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#F59E0B", width: `${(dist[star] / total) * 100}%`, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: "#64748B", width: 20 }}>{dist[star]}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>Sentiment</div>
          {[["positive", "#10B981", "😊"], ["neutral", "#F59E0B", "😐"], ["negative", "#EF4444", "😞"]].map(([k, c, e]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{e}</span>
              <div style={{ flex: 1, background: "#0F172A", borderRadius: 4, height: 8, overflow: "hidden", minWidth: 80 }}>
                <div style={{ height: "100%", background: c, width: `${(sentiments[k] / total) * 100}%`, borderRadius: 4 }} />
              </div>
              <span style={{ color: c, fontSize: 12, fontWeight: 700 }}>{sentiments[k]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review cards */}
      {reviews.map(r => (
        <div key={r._id} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {r.user_name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 14 }}>{r.user_name}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                  <StarRating rating={r.rating} size={13} />
                  {r.verified && <Badge color="#10B981">✓ Verified</Badge>}
                  <Badge color={r.sentiment === "positive" ? "#10B981" : r.sentiment === "negative" ? "#EF4444" : "#F59E0B"}>
                    {r.sentiment}
                  </Badge>
                </div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "#475569" }}>{r.created_at}</span>
          </div>
          <div style={{ fontWeight: 700, color: "#F1F5F9", marginBottom: 6 }}>{r.title}</div>
          <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.6, margin: "0 0 12px" }}>{r.body}</p>
          {(r.pros.length > 0 || r.cons.length > 0) && (
            <div style={{ display: "flex", gap: 16 }}>
              {r.pros.length > 0 && <div><div style={{ fontSize: 12, color: "#10B981", fontWeight: 700, marginBottom: 4 }}>✓ Pros</div>{r.pros.map(p => <div key={p} style={{ fontSize: 12, color: "#94A3B8" }}>• {p}</div>)}</div>}
              {r.cons.length > 0 && <div><div style={{ fontSize: 12, color: "#EF4444", fontWeight: 700, marginBottom: 4 }}>✗ Cons</div>{r.cons.map(c => <div key={c} style={{ fontSize: 12, color: "#94A3B8" }}>• {c}</div>)}</div>}
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#475569" }}>Helpful?</span>
            <button style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#94A3B8" }}>👍 {r.helpful.yes}</button>
            <button style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#94A3B8" }}>👎 {r.helpful.no}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertModal({ product, onClose }) {
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(Math.round(product.current_price * 0.9));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (email && targetPrice) { setSaved(true); setTimeout(onClose, 1500); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 20, padding: 32, maxWidth: 420, width: "90%", boxShadow: "0 24px 80px #0008" }} onClick={e => e.stopPropagation()}>
        {saved ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 48 }}>🔔</div>
            <div style={{ color: "#10B981", fontSize: 20, fontWeight: 700, marginTop: 12 }}>Alert Set!</div>
            <div style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>We'll notify you at {email} when price drops below {fmt(targetPrice)}</div>
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 4px", color: "#F1F5F9", fontSize: 20, fontWeight: 700 }}>🔔 Price Drop Alert</h3>
            <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 24px" }}>{product.name}</p>
            <label style={{ display: "block", marginBottom: 16 }}>
              <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 6 }}>Email Address</div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </label>
            <label style={{ display: "block", marginBottom: 24 }}>
              <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 6 }}>Alert me when price drops below</div>
              <input type="number" value={targetPrice} onChange={e => setTargetPrice(parseInt(e.target.value))}
                style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#F1F5F9", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>Current price: {fmt(product.current_price)} · All-time low: {fmt(product.lowest_price)}</div>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: "#0F172A", border: "1px solid #334155", borderRadius: 10, padding: "12px", color: "#94A3B8", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} style={{ flex: 2, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", borderRadius: 10, padding: "12px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 15 }}>Set Alert</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProductDetail({ product, onBack }) {
  const [tab, setTab] = useState("history");
  const [showAlert, setShowAlert] = useState(false);
  const savings = product.highest_price - product.current_price;

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "32px 48px" }}>
      {showAlert && <AlertModal product={product} onClose={() => setShowAlert(false)} />}
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#6366F1", cursor: "pointer", fontSize: 14, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        ← Back to products
      </button>

      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 32, marginBottom: 32 }}>
        <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #334155", aspectRatio: "4/3" }}>
          <img src={product.image_url} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6366F1", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{product.brand} · {product.category}</div>
            <h1 style={{ margin: 0, color: "#F1F5F9", fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{product.name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <StarRating rating={product.avg_rating} size={16} />
              <span style={{ color: "#F59E0B", fontWeight: 700 }}>{product.avg_rating}</span>
              <span style={{ color: "#64748B", fontSize: 13 }}>({product.review_count.toLocaleString()} reviews)</span>
            </div>
          </div>

          <div style={{ background: "#0F172A", borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: "#F1F5F9" }}>{fmt(product.current_price)}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div><div style={{ fontSize: 11, color: "#64748B" }}>All-Time Low</div><div style={{ color: "#10B981", fontWeight: 700 }}>{fmt(product.lowest_price)}</div></div>
              <div><div style={{ fontSize: 11, color: "#64748B" }}>All-Time High</div><div style={{ color: "#EF4444", fontWeight: 700 }}>{fmt(product.highest_price)}</div></div>
              <div><div style={{ fontSize: 11, color: "#64748B" }}>You Save vs High</div><div style={{ color: "#F59E0B", fontWeight: 700 }}>{fmt(savings)}</div></div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {product.tags.map(t => (
              <span key={t} style={{ background: "#6366F122", color: "#818CF8", border: "1px solid #6366F133", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>{t}</span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
            <button onClick={() => setShowAlert(true)} style={{
              flex: 1, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", borderRadius: 12,
              padding: "14px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 15
            }}>🔔 Set Price Alert</button>
            <button style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: "14px 20px", color: "#94A3B8", cursor: "pointer" }}>♡</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #334155", marginBottom: 24 }}>
        {[["history", "📈 Price History"], ["sellers", "🏪 Compare Sellers"], ["reviews", "⭐ Reviews"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background: "none", border: "none", padding: "12px 20px", cursor: "pointer",
            color: tab === k ? "#6366F1" : "#64748B", fontWeight: tab === k ? 700 : 600, fontSize: 14,
            borderBottom: tab === k ? "2px solid #6366F1" : "2px solid transparent",
            marginBottom: -1
          }}>{label}</button>
        ))}
      </div>

      {tab === "history" && <PriceHistoryChart product={product} />}
      {tab === "sellers" && <SellerComparison product={product} />}
      {tab === "reviews" && <ReviewsSection reviews={MOCK_REVIEWS} />}
    </div>
  );
}

function HomePage({ products, setSelectedProduct, search }) {
  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "40px 48px" }}>
      {/* Hero Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
        border: "1px solid #334155", borderRadius: 24, padding: "48px 56px", marginBottom: 40,
        position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, background: "radial-gradient(circle,#6366F133,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Badge color="#6366F1">LIVE TRACKING</Badge>
            <Badge color="#10B981">PRICE ALERTS</Badge>
          </div>
          <h1 style={{ margin: "0 0 12px", fontSize: 42, fontWeight: 900, color: "#F1F5F9", lineHeight: 1.1 }}>
            Track Prices.<br /><span style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Buy Smarter.</span>
          </h1>
          <p style={{ margin: 0, color: "#64748B", fontSize: 16, maxWidth: 480 }}>
            Monitor price history across all major sellers, get notified on price drops, and read verified reviews — all in one place.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 40 }}>
        {[
          ["1,200+", "Products Tracked", "#6366F1"],
          ["₹4.2Cr", "Savings Found", "#10B981"],
          ["50K+", "Price Alerts Sent", "#F59E0B"],
          ["2.5L+", "Reviews Analyzed", "#EC4899"],
        ].map(([val, label, color]) => (
          <div key={label} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 14, padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>{val}</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Products Grid */}
      <h2 style={{ color: "#F1F5F9", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        {search ? `Results for "${search}"` : "Trending Products"}
        <span style={{ fontSize: 14, color: "#64748B", fontWeight: 400, marginLeft: 10 }}>({filtered.length} products)</span>
      </h2>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>No products found for "{search}"</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {filtered.map(p => (
            <ProductCard key={p._id} product={p} onClick={() => setSelectedProduct(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertsPage() {
  const mockAlerts = [
    { id: 1, product_name: "Sony WH-1000XM5 Headphones", target_price: 21999, current_price: 24999, triggered: false, created_at: "2024-01-20" },
    { id: 2, product_name: "Apple MacBook Air M3", target_price: 109900, current_price: 114900, triggered: false, created_at: "2024-01-18" },
    { id: 3, product_name: "Nike Air Max 270", target_price: 10000, current_price: 12995, triggered: true, triggered_at: "2024-01-15", created_at: "2024-01-10" },
  ];
  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "40px 48px" }}>
      <h2 style={{ color: "#F1F5F9", fontSize: 26, fontWeight: 800, marginBottom: 24 }}>🔔 My Price Alerts</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {mockAlerts.map(a => (
          <div key={a.id} style={{ background: "#1E293B", border: `1px solid ${a.triggered ? "#10B98144" : "#334155"}`, borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#F1F5F9", marginBottom: 4 }}>{a.product_name}</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>
                Target: <b style={{ color: "#10B981" }}>{fmt(a.target_price)}</b> · Current: <b style={{ color: "#F1F5F9" }}>{fmt(a.current_price)}</b>
                · Need: <b style={{ color: "#EF4444" }}>↓{fmt(a.current_price - a.target_price)}</b>
              </div>
            </div>
            {a.triggered ? <Badge color="#10B981">✓ Triggered {a.triggered_at}</Badge> : <Badge color="#F59E0B">⏳ Watching</Badge>}
            <button style={{ background: "none", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", color: "#EF4444", cursor: "pointer", fontSize: 12 }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparePage({ products }) {
  const [sel1, setSel1] = useState(MOCK_PRODUCTS[0]);
  const [sel2, setSel2] = useState(MOCK_PRODUCTS[1]);

  const fields = [
    ["Current Price", p => fmt(p.current_price), true],
    ["Lowest Price",  p => fmt(p.lowest_price),  true],
    ["Avg Rating",    p => `${p.avg_rating} ⭐`,  false],
    ["Review Count",  p => p.review_count.toLocaleString(), false],
    ["Sellers",       p => `${p.seller_prices.length} stores`, false],
    ["Price Drop",    p => `${Math.abs(pct(p.current_price, p.highest_price))}% from high`, false],
  ];

  // Fixed 3-column layout: [product1 | label | product2]
  // Cards above use same proportions so everything lines up
  const LABEL_W = 160;

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "40px 48px" }}>
      <h2 style={{ color: "#F1F5F9", fontSize: 26, fontWeight: 800, marginBottom: 24 }}>⚖️ Compare Products</h2>

      {/* Wrapper that locks card + table to the same column widths */}
      <div style={{ display: "grid", gridTemplateColumns: `1fr ${LABEL_W}px 1fr`, gap: "0 0" }}>

        {/* ── Product card 1 ── */}
        <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "14px 0 0 0", padding: 16, borderRight: "none", borderBottom: "none" }}>
          <select value={sel1._id} onChange={e => setSel1(MOCK_PRODUCTS.find(p => p._id === e.target.value))}
            style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#F1F5F9", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}>
            {MOCK_PRODUCTS.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <img src={sel1.image_url} alt={sel1.name} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
          <div style={{ fontWeight: 700, color: "#F1F5F9", marginTop: 10, fontSize: 14 }}>{sel1.name}</div>
          <div style={{ fontSize: 12, color: "#6366F1", marginTop: 4 }}>{sel1.brand}</div>
        </div>

        {/* ── Center header spacer ── */}
        <div style={{ background: "#0F172A", border: "1px solid #334155", borderLeft: "none", borderRight: "none", borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 22 }}>⚖️</span>
        </div>

        {/* ── Product card 2 ── */}
        <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "0 14px 0 0", padding: 16, borderLeft: "none", borderBottom: "none" }}>
          <select value={sel2._id} onChange={e => setSel2(MOCK_PRODUCTS.find(p => p._id === e.target.value))}
            style={{ width: "100%", background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#F1F5F9", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}>
            {MOCK_PRODUCTS.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <img src={sel2.image_url} alt={sel2.name} style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10 }} />
          <div style={{ fontWeight: 700, color: "#F1F5F9", marginTop: 10, fontSize: 14 }}>{sel2.name}</div>
          <div style={{ fontSize: 12, color: "#6366F1", marginTop: 4 }}>{sel2.brand}</div>
        </div>

        {/* ── Comparison rows — same grid continues ── */}
        {fields.map(([label, fn, lower], i) => {
          const v1 = sel1.current_price, v2 = sel2.current_price;
          const win1 = lower ? v1 <= v2 : false;
          const win2 = lower ? v2 <= v1 : false;
          const bg   = i % 2 === 0 ? "#0F172A" : "#1E293B";
          const isLast = i === fields.length - 1;
          const leftRadius  = isLast ? "0 0 0 14px" : "0";
          const rightRadius = isLast ? "0 0 14px 0"  : "0";

          return (
            <>
              {/* Left value */}
              <div key={`l${i}`} style={{
                background: win1 ? "#10B98110" : bg,
                border: "1px solid #334155", borderTop: "none", borderRight: "none",
                borderRadius: leftRadius,
                padding: "16px 20px", textAlign: "right",
                display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
              }}>
                {win1 && <span style={{ fontSize: 14 }}>👑</span>}
                <span style={{ color: win1 ? "#10B981" : "#F1F5F9", fontWeight: win1 ? 700 : 500, fontSize: 15 }}>{fn(sel1)}</span>
              </div>

              {/* Center label */}
              <div key={`c${i}`} style={{
                background: "#0F172A", border: "1px solid #334155", borderTop: "none",
                padding: "16px 8px", textAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#64748B", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
              </div>

              {/* Right value */}
              <div key={`r${i}`} style={{
                background: win2 ? "#10B98110" : bg,
                border: "1px solid #334155", borderTop: "none", borderLeft: "none",
                borderRadius: rightRadius,
                padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ color: win2 ? "#10B981" : "#F1F5F9", fontWeight: win2 ? 700 : 500, fontSize: 15 }}>{fn(sel2)}</span>
                {win2 && <span style={{ fontSize: 14 }}>👑</span>}
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}

// ── Live Search Page ──────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";

function SourceBadge({ source }) {
  const isAmazon = source === "amazon";
  return (
    <span style={{
      background: isAmazon ? "#FF990022" : "#2874F022",
      color: isAmazon ? "#FF9900" : "#60A5FA",
      border: `1px solid ${isAmazon ? "#FF990044" : "#2874F044"}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700
    }}>
      {isAmazon ? "Amazon" : "Flipkart"}
    </span>
  );
}

function LiveSearchResultCard({ item }) {
  const hasDiscount = item.discount_pct > 0;
  const savings = item.original_price && item.price ? item.original_price - item.price : 0;

  return (
    <div style={{
      background: "linear-gradient(145deg,#1E293B,#162032)",
      border: "1px solid #334155", borderRadius: 16, overflow: "hidden",
      display: "flex", flexDirection: "column", transition: "all 0.25s",
    }}
      onMouseEnter={e => {
        const c = item.source === "amazon" ? "#FF9900" : "#2874F0";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = c;
        e.currentTarget.style.boxShadow = `0 12px 40px ${c}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "#334155";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: 200, background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} onError={e => { e.target.style.display = "none"; }} />
          : <div style={{ color: "#475569", fontSize: 40 }}>📦</div>
        }
        {hasDiscount && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "#EF4444", color: "white", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
            -{item.discount_pct}%
          </div>
        )}
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <SourceBadge source={item.source} />
        </div>
        {item.prime && (
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "#00A8E0", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>prime</div>
        )}
        {item.assured && (
          <div style={{ position: "absolute", bottom: 10, left: 10, background: "#2874F0", color: "white", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 4 }}>FK Assured</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#CBD5E1", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.title}
        </div>

        {item.rating && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarRating rating={item.rating} size={12} />
            <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>{item.rating}</span>
            {item.review_count && <span style={{ fontSize: 11, color: "#64748B" }}>({item.review_count.toLocaleString()})</span>}
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#F1F5F9" }}>{fmt(item.price)}</div>
          {item.original_price && item.original_price > item.price && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
              <span style={{ fontSize: 12, color: "#64748B", textDecoration: "line-through" }}>{fmt(item.original_price)}</span>
              <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>Save {fmt(savings)}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <a href={item.product_url} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, background: item.source === "amazon" ? "#FF9900" : "#2874F0",
            color: item.source === "amazon" ? "#000" : "#fff",
            border: "none", borderRadius: 10, padding: "10px", cursor: "pointer",
            fontWeight: 700, fontSize: 13, textAlign: "center", textDecoration: "none",
            display: "block"
          }}>
            View on {item.source === "amazon" ? "Amazon" : "Flipkart"} →
          </a>
        </div>

        {!item.in_stock && (
          <div style={{ textAlign: "center", fontSize: 11, color: "#EF4444", fontWeight: 600 }}>⚠ Out of Stock</div>
        )}
      </div>
    </div>
  );
}

function LiveSearchPage({ initialQuery, setSearch }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [inputVal, setInputVal] = useState(initialQuery || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [meta, setMeta] = useState(null);
  const [maxResults, setMaxResults] = useState(12);

  const runSearch = async (q, source = filter, max = maxResults) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setMeta(null);
    try {
      const url = `${API_BASE}/api/search/?q=${encodeURIComponent(q)}&source=${source}&max_results=${max}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setMeta({ amazon: data.amazon_count, flipkart: data.flipkart_count, cached: data.cached, total: data.total });
    } catch (err) {
      setError(err.message);
      // Fallback: show realistic mock data so UI is always demonstrable
      setResults(generateMockSearchResults(q));
      setMeta({ amazon: 6, flipkart: 6, cached: false, total: 12, mock: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
  }, []);

  const handleSearch = (e) => {
    if (e.key === "Enter" && inputVal.trim()) {
      setQuery(inputVal);
      setSearch(inputVal);
      runSearch(inputVal);
    }
  };

  // Sort results
  const sorted = [...results].sort((a, b) => {
    if (sortBy === "price_asc")  return (a.price || 0) - (b.price || 0);
    if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
    if (sortBy === "rating")     return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "discount")   return (b.discount_pct || 0) - (a.discount_pct || 0);
    return 0;
  });

  const displayed = filter === "all" ? sorted : sorted.filter(r => r.source === filter);

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "36px 48px" }}>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, maxWidth: 800 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search across Amazon & Flipkart..."
            style={{ width: "100%", background: "#1E293B", border: "1px solid #334155", borderRadius: 12, padding: "13px 16px 13px 42px", color: "#F1F5F9", fontSize: 15, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button onClick={() => { setQuery(inputVal); setSearch(inputVal); runSearch(inputVal); }}
          style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)", border: "none", borderRadius: 12, padding: "0 28px", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>
          Search
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", gap: 16 }}>
              {["Amazon", "Flipkart"].map((s, i) => (
                <div key={s} style={{
                  background: i === 0 ? "#FF990022" : "#2874F022",
                  border: `2px solid ${i === 0 ? "#FF9900" : "#2874F0"}`,
                  borderRadius: 12, padding: "12px 28px",
                  color: i === 0 ? "#FF9900" : "#60A5FA",
                  fontWeight: 700, fontSize: 14,
                  animation: "pulse 1.5s ease-in-out infinite",
                  animationDelay: `${i * 0.3}s`
                }}>
                  🔍 Searching {s}...
                </div>
              ))}
            </div>
            <div style={{ color: "#475569", fontSize: 13 }}>Scraping live prices — this takes ~5 seconds</div>
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }`}</style>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          {/* Meta bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "#94A3B8", fontSize: 14 }}>
                <b style={{ color: "#F1F5F9" }}>{displayed.length}</b> results for <b style={{ color: "#6366F1" }}>"{query}"</b>
                {meta?.mock && <span style={{ color: "#F59E0B", fontSize: 12, marginLeft: 8 }}>(demo data — backend not running)</span>}
                {meta?.cached && <span style={{ color: "#10B981", fontSize: 12, marginLeft: 8 }}>⚡ cached</span>}
              </span>
              {meta && (
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ background: "#FF990015", color: "#FF9900", border: "1px solid #FF990030", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>
                    Amazon: {meta.amazon}
                  </span>
                  <span style={{ background: "#2874F015", color: "#60A5FA", border: "1px solid #2874F030", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>
                    Flipkart: {meta.flipkart}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Source filter */}
              <div style={{ display: "flex", background: "#1E293B", borderRadius: 8, padding: 3, gap: 2, border: "1px solid #334155" }}>
                {[["all","All"],["amazon","Amazon"],["flipkart","Flipkart"]].map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)} style={{
                    background: filter === val ? (val === "amazon" ? "#FF9900" : val === "flipkart" ? "#2874F0" : "#6366F1") : "transparent",
                    color: filter === val ? "#fff" : "#64748B",
                    border: "none", borderRadius: 6, padding: "5px 12px",
                    cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s"
                  }}>{label}</button>
                ))}
              </div>

              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", color: "#94A3B8", fontSize: 12, cursor: "pointer" }}>
                <option value="default">Sort: Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Best Rated</option>
                <option value="discount">Best Discount</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 20 }}>
            {displayed.map((item, i) => (
              <LiveSearchResultCard key={`${item.source}-${i}`} item={item} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && query && !error && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>No results found</div>
          <div style={{ color: "#64748B" }}>Try a different search term</div>
        </div>
      )}

      {/* Initial prompt */}
      {!loading && !query && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🛒</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", marginBottom: 10 }}>Search Live Prices</div>
          <div style={{ color: "#64748B", fontSize: 15, marginBottom: 32 }}>Type a product name and press Enter to search Amazon & Flipkart simultaneously</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {["Sony headphones","iPhone 15","Nike shoes","Samsung TV","MacBook Air","Gaming laptop"].map(s => (
              <button key={s} onClick={() => { setInputVal(s); setQuery(s); setSearch(s); runSearch(s); }}
                style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 20, padding: "8px 20px", color: "#94A3B8", cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}
                onMouseEnter={e => { e.target.style.borderColor = "#6366F1"; e.target.style.color = "#818CF8"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#334155"; e.target.style.color = "#94A3B8"; }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data generator for when backend is offline
function generateMockSearchResults(query) {
  const products = [
    { title: `${query} - Premium Edition`, price: 24999, original_price: 32999, discount_pct: 24, rating: 4.5, review_count: 1842, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Pro Max - Latest Model`, price: 22499, original_price: 28000, discount_pct: 20, rating: 4.3, review_count: 5430, source: "flipkart", assured: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", product_url: "https://flipkart.com" },
    { title: `${query} Wireless - Best Seller`, price: 19999, original_price: null, discount_pct: 0, rating: 4.6, review_count: 3211, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Lite - Budget Choice`, price: 12995, original_price: 15995, discount_pct: 19, rating: 4.1, review_count: 8923, source: "flipkart", assured: false, in_stock: true, image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=300&q=80", product_url: "https://flipkart.com" },
    { title: `${query} Ultra - High End`, price: 54999, original_price: 64999, discount_pct: 15, rating: 4.8, review_count: 982, source: "amazon", prime: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Classic - Value Pick`, price: 8999, original_price: 11999, discount_pct: 25, rating: 4.0, review_count: 12400, source: "flipkart", assured: true, in_stock: false, image_url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&q=80", product_url: "https://flipkart.com" },
    { title: `${query} Sport Edition`, price: 16499, original_price: 18999, discount_pct: 13, rating: 4.4, review_count: 2200, source: "amazon", prime: false, in_stock: true, image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", product_url: "https://amazon.in" },
    { title: `${query} Home - Smart Series`, price: 34999, original_price: 44999, discount_pct: 22, rating: 4.7, review_count: 745, source: "flipkart", assured: true, in_stock: true, image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80", product_url: "https://flipkart.com" },
  ];
  return products;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [liveSearchQuery, setLiveSearchQuery] = useState("");

  useEffect(() => {
    document.body.style.background = "#0F172A";
    document.body.style.margin = "0";
    document.body.style.fontFamily = "'DM Sans', sans-serif";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const handleSetPage = (p) => { setPage(p); setSelectedProduct(null); };

  const handleLiveSearch = (q) => {
    setLiveSearchQuery(q);
    setSearch(q);
    setPage("livesearch");
    setSelectedProduct(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#F1F5F9" }}>
      <NavBar page={page} setPage={handleSetPage} search={search} setSearch={setSearch} onLiveSearch={handleLiveSearch} />
      {selectedProduct ? (
        <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />
      ) : page === "home" ? (
        <HomePage products={MOCK_PRODUCTS} setSelectedProduct={setSelectedProduct} search={search} />
      ) : page === "livesearch" ? (
        <LiveSearchPage initialQuery={liveSearchQuery} setSearch={setSearch} />
      ) : page === "alerts" ? (
        <AlertsPage />
      ) : page === "compare" ? (
        <ComparePage products={MOCK_PRODUCTS} />
      ) : null}
    </div>
  );
}
