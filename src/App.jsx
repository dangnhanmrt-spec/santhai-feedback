import { useState, useEffect, useMemo, useCallback } from "react";
import {
  loadFeedbacks, saveFeedback, deleteFeedback,
  loadAllowedEmails, saveAllowedEmail, deleteAllowedEmail,
  signInWithGoogle, signOut, getUser, onAuthChange, checkEmailAccess, writeLog,
} from "./supabase.js";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const REGIONS = [
  {
    id: "cantho", name: "Cần Thơ", color: "#3b82f6",
    stores: [
      { id: "mauthan", name: "Mậu Thân" },
      { id: "nvcnd1", name: "NVC ND (138Z6)" },
      { id: "d32", name: "Đ.3/2" },
      { id: "cmt8", name: "CMT8" },
      { id: "xvnt", name: "XVNT" },
      { id: "nvcnd2", name: "NVC ND (263AA)" },
      { id: "nvl", name: "NVL" },
      { id: "phamhung", name: "Phạm Hùng" },
      { id: "thotnot", name: "Thốt Nốt" },
      { id: "omon", name: "Ô Môn" },
      { id: "ngabay", name: "Ngã Bảy" },
      { id: "socttrang", name: "Sóc Trăng" },
      { id: "codo", name: "Cờ Đỏ" },
      { id: "phongdien", name: "Phong Điền" },
      { id: "vithanh", name: "Vị Thanh" },
      { id: "caitac", name: "Cái Tắc" },
      { id: "nga5", name: "Ngã 5" },
    ],
  },
  {
    id: "angiang", name: "An Giang / Kiên Giang", color: "#10b981",
    stores: [
      { id: "thd1328", name: "THĐ (1328)" },
      { id: "phamculuong", name: "Phạm Cự Lượng" },
      { id: "thanhthai", name: "Thành Thái" },
      { id: "thd2243", name: "THĐ (2243)" },
      { id: "phuahoa", name: "Phú Hoà" },
      { id: "tanchau", name: "Tân Châu" },
      { id: "anchau", name: "An Châu" },
      { id: "rachgia1", name: "Rạch Giá 1" },
      { id: "rachgia2", name: "Rạch Giá 2" },
      { id: "minhluong", name: "Minh Lương" },
      { id: "giongrieng", name: "Giồng Riềng" },
      { id: "anbien", name: "An Biên" },
      { id: "chomoi", name: "Chợ Mới" },
      { id: "chaudoc", name: "Châu Đốc" },
      { id: "caidau", name: "Cái Dầu" },
      { id: "candang", name: "Cần Đăng" },
      { id: "myluong", name: "Mỹ Luông" },
    ],
  },
  {
    id: "vinhlong", name: "Vĩnh Long / Bến Tre / Trà Vinh", color: "#8b5cf6",
    stores: [
      { id: "binhminh", name: "Bình Minh" },
      { id: "binhtan", name: "Bình Tân" },
      { id: "tpvl", name: "TP Vĩnh Long" },
      { id: "bentre", name: "Bến Tre" },
      { id: "longho", name: "Long Hồ" },
      { id: "tambinh", name: "Tam Bình" },
      { id: "traon", name: "Trà Ôn" },
      { id: "travinh", name: "Trà Vinh" },
      { id: "tieucantv", name: "Tiểu Cần" },
      { id: "batri", name: "Ba Tri" },
      { id: "canglong", name: "Càng Long" },
      { id: "cauke", name: "Cầu Kè" },
    ],
  },
  {
    id: "dongthap", name: "Đồng Tháp / Tiền Giang", color: "#f59e0b",
    stores: [
      { id: "tranphusd", name: "Trần Phú - SĐ" },
      { id: "sadec2", name: "Sa Đéc 2" },
      { id: "caolanh1", name: "Cao Lãnh 1" },
      { id: "mytho1", name: "Mỹ Tho 1" },
      { id: "mytho2", name: "Mỹ Tho 2" },
      { id: "caolanh2", name: "Cao Lãnh 2" },
      { id: "thapmoi", name: "Tháp Mười" },
      { id: "thanhbinh", name: "Thanh Bình" },
      { id: "mylong", name: "Mỹ Long" },
      { id: "caitauha", name: "Cái Tàu Hạ" },
      { id: "tanhiepdt", name: "Tân Hiệp (ĐT)" },
      { id: "laivung", name: "Lai Vung" },
      { id: "lapvo", name: "Lấp Vò" },
      { id: "mytho3", name: "Mỹ Thọ" },
    ],
  },
  {
    id: "camau", name: "Cà Mau / Bạc Liêu", color: "#ef4444",
    stores: [
      { id: "giarai", name: "Giá Rai" },
      { id: "baclieu", name: "Bạc Liêu" },
      { id: "phuoclong", name: "Phước Long" },
      { id: "tpcamau", name: "TP Cà Mau" },
    ],
  },
  {
    id: "tayninh", name: "Long An / Tây Ninh", color: "#ec4899",
    stores: [
      { id: "tanan", name: "Tân An" },
      { id: "duchoa", name: "Đức Hoà" },
      { id: "canduoc", name: "Cần Đước" },
      { id: "duchoa2", name: "Đức Hoà 2" },
    ],
  },
  {
    id: "mientrung", name: "Miền Trung", color: "#06b6d4",
    stores: [
      { id: "dinhtienhoang", name: "Đinh Tiên Hoàng (Huế)" },
    ],
  },
];

const ERROR_TYPES = [
  "Sai/thiếu topping",
  "Sai món/thiếu món",
  "Thiếu dụng cụ ăn uống",
  "Sai ghi chú về để đá",
  "Chất lượng sản phẩm",
  "Vật thể lạ trong sản phẩm",
  "Tính tiền nhầm",
  "Tư vấn sai",
  "Thái độ/chất lượng phục vụ",
  "Sai định lượng",
];

// Flatten stores map
const STORE_MAP = {};
const ALL_STORES = [];
REGIONS.forEach(r => {
  r.stores.forEach(s => {
    STORE_MAP[s.id] = { ...s, regionId: r.id, regionName: r.name, regionColor: r.color };
    ALL_STORES.push({ ...s, regionId: r.id, regionName: r.name, regionColor: r.color });
  });
});

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function vnTodayISO() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
}

function fmtDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// Get ISO week start (Monday) for a date string
function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return mon.getFullYear() + "-" + String(mon.getMonth() + 1).padStart(2, "0") + "-" + String(mon.getDate()).padStart(2, "0");
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function weekLabel(weekStart) {
  const end = getWeekEnd(weekStart);
  return `${fmtDate(weekStart)} – ${fmtDate(end)}`;
}

// Alert thresholds
const ALERT_RED = 3;    // ≥3 lỗi/tuần → đỏ
const ALERT_YELLOW = 2; // 2 lỗi/tuần → vàng

function alertLevel(count) {
  if (count >= ALERT_RED) return "red";
  if (count >= ALERT_YELLOW) return "yellow";
  return "green";
}

/* ═══════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════ */
const S = {
  app: {
    fontFamily: "'Lexend', sans-serif",
    minHeight: "100vh",
    background: "linear-gradient(160deg,#080e1a 0%,#0d1625 60%,#091320 100%)",
    color: "#dde6f0",
  },
  header: {
    background: "rgba(13,22,37,0.95)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    padding: "0 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  logo: {
    fontSize: 18, fontWeight: 700,
    background: "linear-gradient(135deg,#38bdf8,#818cf8)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    letterSpacing: "-0.3px",
  },
  nav: { display: "flex", gap: 4 },
  tabBtn: (active) => ({
    padding: "6px 16px",
    borderRadius: 8,
    border: "none",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: "'Lexend',sans-serif",
    transition: "all 0.15s",
    background: active ? "rgba(56,189,248,0.15)" : "transparent",
    color: active ? "#38bdf8" : "#7a8fa5",
    borderBottom: active ? "2px solid #38bdf8" : "2px solid transparent",
  }),
  content: { maxWidth: 1400, margin: "0 auto", padding: "24px 20px" },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: "20px 24px",
    marginBottom: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#e0e7ef", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 },
  inp: {
    width: "100%", padding: "9px 13px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#e0e7ef", fontSize: 13,
    outline: "none", boxSizing: "border-box",
    fontFamily: "'Lexend',sans-serif",
  },
  sel: {
    width: "100%", padding: "9px 13px",
    background: "#0f1c2e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#e0e7ef", fontSize: 13,
    outline: "none", boxSizing: "border-box",
    fontFamily: "'Lexend',sans-serif",
    cursor: "pointer",
  },
  lbl: { fontSize: 11, fontWeight: 600, color: "#7a8fa5", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5, display: "block" },
  btnPrimary: {
    padding: "9px 20px",
    background: "linear-gradient(135deg,#38bdf8,#6366f1)",
    border: "none", borderRadius: 8, color: "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Lexend',sans-serif",
  },
  btnDanger: {
    padding: "6px 12px",
    background: "rgba(239,68,68,0.15)", color: "#f87171",
    border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6,
    fontSize: 12, cursor: "pointer", fontFamily: "'Lexend',sans-serif",
  },
  btnGhost: {
    padding: "6px 12px",
    background: "rgba(255,255,255,0.05)", color: "#94a3b8",
    border: "1px solid rgba(255,255,255,0.09)", borderRadius: 6,
    fontSize: 12, cursor: "pointer", fontFamily: "'Lexend',sans-serif",
  },
};

/* ═══════════════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════════════ */
function AlertBadge({ count }) {
  const level = alertLevel(count);
  const cfg = {
    red: { bg: "rgba(239,68,68,0.18)", color: "#f87171", border: "rgba(239,68,68,0.35)", icon: "🔴" },
    yellow: { bg: "rgba(234,179,8,0.15)", color: "#facc15", border: "rgba(234,179,8,0.3)", icon: "🟡" },
    green: { bg: "rgba(34,197,94,0.1)", color: "#4ade80", border: "rgba(34,197,94,0.25)", icon: "🟢" },
  }[level];

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 12,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 700,
    }}>
      {cfg.icon} {count}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════════ */
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin() {
    setLoading(true); setErr("");
    const { error } = await signInWithGoogle();
    if (error) { setErr("Đăng nhập thất bại: " + (error.message || error)); setLoading(false); }
  }

  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: "48px 40px", textAlign: "center",
        maxWidth: 380, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>📋</div>
        <h1 style={{
          fontSize: 22, fontWeight: 700, margin: "8px 0 4px",
          background: "linear-gradient(135deg,#38bdf8,#818cf8)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>SanThai Feedback</h1>
        <p style={{ fontSize: 13, color: "#7a8fa5", marginBottom: 28 }}>
          Hệ thống quản lý phản hồi khách hàng
        </p>
        <button onClick={handleLogin} disabled={loading} style={{
          ...S.btnPrimary, width: "100%", padding: "13px",
          fontSize: 14, opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Đang chuyển hướng..." : "🔑 Đăng nhập bằng Google"}
        </button>
        {err && <div style={{ color: "#f87171", fontSize: 12, marginTop: 12 }}>{err}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ACCESS DENIED SCREEN
   ═══════════════════════════════════════════════════ */
function AccessDenied({ user, onSignOut }) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await onSignOut();
    window.location.replace(window.location.origin);
  }

  async function handleSwitch() {
    setLoading(true);
    await onSignOut();
    window.location.replace(window.location.origin);
  }

  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: 20, padding: "40px", textAlign: "center", maxWidth: 400,
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ color: "#f87171", marginBottom: 8 }}>Không có quyền truy cập</h2>
        <p style={{ color: "#7a8fa5", fontSize: 13, marginBottom: 28 }}>
          Email <strong style={{ color: "#dde6f0" }}>{user?.email}</strong> chưa được cấp quyền.<br />
          Vui lòng liên hệ Admin.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleSignOut}
            disabled={loading}
            style={{
              ...S.btnGhost,
              padding: "10px 20px", fontSize: 13,
              opacity: loading ? 0.6 : 1,
            }}
          >
            🚪 Đăng xuất
          </button>
          <button
            onClick={handleSwitch}
            disabled={loading}
            style={{
              ...S.btnPrimary,
              padding: "10px 20px", fontSize: 13,
              opacity: loading ? 0.6 : 1,
            }}
          >
            🔄 Đổi tài khoản Google
          </button>
        </div>
        {loading && <div style={{ color: "#7a8fa5", fontSize: 12, marginTop: 12 }}>Đang xử lý...</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════ */
function Dashboard({ feedbacks }) {
  const thisWeekStart = getWeekStart(vnTodayISO());

  const stats = useMemo(() => {
    const thisWeek = feedbacks.filter(f => getWeekStart(f.date) === thisWeekStart);
    const lastWeek = feedbacks.filter(f => {
      const ws = getWeekStart(f.date);
      const d = new Date(thisWeekStart + "T00:00:00");
      d.setDate(d.getDate() - 7);
      const lws = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      return ws === lws;
    });

    // Stores with ≥3 errors this week
    const storeCounts = {};
    thisWeek.forEach(f => { storeCounts[f.storeId] = (storeCounts[f.storeId] || 0) + 1; });
    const redStores = Object.entries(storeCounts).filter(([, c]) => c >= ALERT_RED).map(([id, c]) => ({ store: STORE_MAP[id], count: c }));
    const yellowStores = Object.entries(storeCounts).filter(([, c]) => c === ALERT_YELLOW).map(([id, c]) => ({ store: STORE_MAP[id], count: c }));

    // Error type breakdown this week
    const errCounts = {};
    thisWeek.forEach(f => { errCounts[f.errorType] = (errCounts[f.errorType] || 0) + 1; });
    const topErrors = Object.entries(errCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Region breakdown this week
    const regionCounts = {};
    thisWeek.forEach(f => {
      const store = STORE_MAP[f.storeId];
      if (store) regionCounts[store.regionId] = (regionCounts[store.regionId] || 0) + 1;
    });

    return { thisWeek, lastWeek, redStores, yellowStores, storeCounts, topErrors, regionCounts };
  }, [feedbacks, thisWeekStart]);

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div style={{ ...S.card, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#e0e7ef" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#7a8fa5", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#556677", marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e7ef", marginBottom: 4 }}>📊 Tổng quan</div>
        <div style={{ fontSize: 13, color: "#7a8fa5" }}>Tuần hiện tại: {weekLabel(thisWeekStart)}</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard icon="📝" label="Feedback tuần này" value={stats.thisWeek.length} sub={`Tuần trước: ${stats.lastWeek.length}`} />
        <StatCard icon="🔴" label="CH cảnh báo đỏ" value={stats.redStores.length} color={stats.redStores.length > 0 ? "#f87171" : "#4ade80"} sub="≥3 lỗi/tuần" />
        <StatCard icon="🟡" label="CH cảnh báo vàng" value={stats.yellowStores.length} color={stats.yellowStores.length > 0 ? "#facc15" : "#4ade80"} sub="2 lỗi/tuần" />
        <StatCard icon="🏪" label="Tổng cửa hàng" value={ALL_STORES.length} sub="72 cửa hàng" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Red alert stores */}
        <div style={S.card}>
          <div style={S.cardTitle}>🚨 Cửa hàng cảnh báo đỏ tuần này</div>
          {stats.redStores.length === 0 ? (
            <div style={{ color: "#4ade80", fontSize: 13 }}>✅ Không có cửa hàng nào bị cảnh báo đỏ</div>
          ) : (
            stats.redStores.sort((a, b) => b.count - a.count).map(({ store, count }) => (
              <div key={store?.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", marginBottom: 8,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10, borderLeft: "4px solid #ef4444",
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{store?.name || store?.id}</div>
                  <div style={{ fontSize: 11, color: "#7a8fa5" }}>{store?.regionName}</div>
                </div>
                <AlertBadge count={count} />
              </div>
            ))
          )}
        </div>

        {/* Top errors */}
        <div style={S.card}>
          <div style={S.cardTitle}>📋 Lỗi phổ biến nhất tuần này</div>
          {stats.topErrors.length === 0 ? (
            <div style={{ color: "#7a8fa5", fontSize: 13 }}>Chưa có dữ liệu</div>
          ) : (
            stats.topErrors.map(([type, count], i) => {
              const max = stats.topErrors[0][1];
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "#c0ccd8" }}>{i + 1}. {type}</span>
                    <span style={{ fontWeight: 700, color: "#38bdf8" }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "linear-gradient(90deg,#38bdf8,#6366f1)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Yellow stores */}
      {stats.yellowStores.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>⚠️ Cửa hàng cảnh báo vàng tuần này</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {stats.yellowStores.map(({ store, count }) => (
              <div key={store?.id} style={{
                padding: "8px 14px",
                background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)",
                borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, color: "#fde68a" }}>{store?.name}</span>
                <AlertBadge count={count} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TIMELINE TAB — Matrix hàng=CH, cột=tuần
   ═══════════════════════════════════════════════════ */
function Timeline({ feedbacks }) {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [numWeeks, setNumWeeks] = useState(6);

  const weeks = useMemo(() => {
    const todayStart = getWeekStart(vnTodayISO());
    const result = [];
    for (let i = numWeeks - 1; i >= 0; i--) {
      const d = new Date(todayStart + "T00:00:00");
      d.setDate(d.getDate() - i * 7);
      const ws = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      result.push(ws);
    }
    return result;
  }, [numWeeks]);

  // Build count matrix: storeId -> weekStart -> count
  const matrix = useMemo(() => {
    const m = {};
    feedbacks.forEach(f => {
      if (!m[f.storeId]) m[f.storeId] = {};
      const ws = getWeekStart(f.date);
      m[f.storeId][ws] = (m[f.storeId][ws] || 0) + 1;
    });
    return m;
  }, [feedbacks]);

  const displayRegions = selectedRegion === "all" ? REGIONS : REGIONS.filter(r => r.id === selectedRegion);

  const cellStyle = (count) => {
    const level = alertLevel(count);
    return {
      red: { bg: "rgba(239,68,68,0.25)", color: "#f87171", border: "rgba(239,68,68,0.4)", fw: 700 },
      yellow: { bg: "rgba(234,179,8,0.18)", color: "#facc15", border: "rgba(234,179,8,0.3)", fw: 600 },
      green: { bg: "rgba(34,197,94,0.08)", color: "#4ade80", border: "rgba(34,197,94,0.15)", fw: 400 },
    }[level];
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e7ef" }}>📅 Timeline theo tuần</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select style={{ ...S.sel, width: "auto" }} value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
            <option value="all">Tất cả khu vực</option>
            {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select style={{ ...S.sel, width: "auto" }} value={numWeeks} onChange={e => setNumWeeks(Number(e.target.value))}>
            <option value={4}>4 tuần</option>
            <option value={6}>6 tuần</option>
            <option value={8}>8 tuần</option>
            <option value={12}>12 tuần</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { color: "#4ade80", label: "0–1 lỗi" },
          { color: "#facc15", label: "2 lỗi ⚠️" },
          { color: "#f87171", label: "≥3 lỗi 🚨" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color, opacity: 0.6 }} />
            {label}
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 14px", color: "#7a8fa5", fontWeight: 600, width: 180, background: "rgba(13,22,37,0.9)", position: "sticky", left: 0, zIndex: 2 }}>
                Cửa hàng
              </th>
              {weeks.map(ws => (
                <th key={ws} style={{
                  padding: "8px 10px", color: ws === getWeekStart(vnTodayISO()) ? "#38bdf8" : "#7a8fa5",
                  fontWeight: ws === getWeekStart(vnTodayISO()) ? 700 : 500,
                  whiteSpace: "nowrap", textAlign: "center", minWidth: 100,
                  borderBottom: ws === getWeekStart(vnTodayISO()) ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div>{fmtDate(ws)}</div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>–{fmtDate(getWeekEnd(ws))}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRegions.map(region => (
              <>
                <tr key={"region-" + region.id}>
                  <td colSpan={weeks.length + 1} style={{
                    padding: "10px 14px", fontWeight: 700, fontSize: 12,
                    color: region.color, letterSpacing: "0.5px",
                    background: `${region.color}15`, borderTop: `2px solid ${region.color}30`,
                    position: "sticky", left: 0,
                  }}>
                    ▸ {region.name}
                  </td>
                </tr>
                {region.stores.map(store => {
                  const storeData = matrix[store.id] || {};
                  const hasAnyData = weeks.some(ws => storeData[ws] > 0);
                  return (
                    <tr key={store.id} style={{
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      background: hasAnyData ? "rgba(255,255,255,0.01)" : "transparent",
                    }}>
                      <td style={{
                        padding: "7px 14px", color: "#c0ccd8", fontWeight: 500,
                        background: "rgba(8,14,26,0.95)", position: "sticky", left: 0, zIndex: 1,
                        borderLeft: `3px solid ${region.color}40`,
                      }}>
                        {store.name}
                      </td>
                      {weeks.map(ws => {
                        const count = storeData[ws] || 0;
                        const cfg = cellStyle(count);
                        return (
                          <td key={ws} style={{ padding: "5px 8px", textAlign: "center" }}>
                            {count > 0 ? (
                              <div style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 32, height: 26, borderRadius: 6,
                                background: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                fontWeight: cfg.fw, fontSize: 13,
                              }}>
                                {count}
                              </div>
                            ) : (
                              <div style={{ width: 32, height: 26, margin: "auto", borderRadius: 6, background: "rgba(255,255,255,0.02)" }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INPUT TAB
   ═══════════════════════════════════════════════════ */
function InputFeedback({ feedbacks, onSave, onDelete, user, userRole }) {
  const emptyForm = { storeId: "", errorType: "", date: vnTodayISO(), note: "" };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStore, setFilterStore] = useState("");
  const [filterWeek, setFilterWeek] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Weeks for filter
  const availableWeeks = useMemo(() => {
    const ws = new Set(feedbacks.map(f => getWeekStart(f.date)));
    return Array.from(ws).sort().reverse();
  }, [feedbacks]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...feedbacks];
    if (filterStore) list = list.filter(f => f.storeId === filterStore);
    if (filterWeek !== "all") list = list.filter(f => getWeekStart(f.date) === filterWeek);
    list.sort((a, b) => {
      if (sortBy === "date") return b.date.localeCompare(a.date);
      if (sortBy === "store") return (STORE_MAP[a.storeId]?.name || "").localeCompare(STORE_MAP[b.storeId]?.name || "");
      return a.errorType.localeCompare(b.errorType);
    });
    return list;
  }, [feedbacks, filterStore, filterWeek, sortBy]);

  function validate() {
    const e = {};
    if (!form.storeId) e.storeId = "Chọn cửa hàng";
    if (!form.errorType) e.errorType = "Chọn loại lỗi";
    if (!form.date) e.date = "Chọn ngày";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const fb = {
        id: editId || uid(),
        storeId: form.storeId,
        errorType: form.errorType,
        date: form.date,
        note: form.note,
        submittedBy: user?.email || "unknown",
      };
      await onSave(fb);
      setForm(emptyForm);
      setEditId(null);
      setErrors({});
    } catch (err) {
      alert("Lỗi khi lưu: " + (err?.message || "Không xác định. Vui lòng thử lại."));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(fb) {
    setForm({ storeId: fb.storeId, errorType: fb.errorType, date: fb.date, note: fb.note });
    setEditId(fb.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() { setForm(emptyForm); setEditId(null); setErrors({}); }

  const thisWeekStart = getWeekStart(vnTodayISO());

  return (
    <div>
      {/* Form */}
      <div style={S.card}>
        <div style={S.cardTitle}>{editId ? "✏️ Chỉnh sửa feedback" : "➕ Nhập feedback mới"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          {/* Region + Store selector */}
          <div>
            <label style={S.lbl}>Cửa hàng *</label>
            <select style={S.sel} value={form.storeId} onChange={e => setForm({ ...form, storeId: e.target.value })}>
              <option value="">-- Chọn cửa hàng --</option>
              {REGIONS.map(r => (
                <optgroup key={r.id} label={r.name}>
                  {r.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
            {errors.storeId && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{errors.storeId}</div>}
          </div>

          <div>
            <label style={S.lbl}>Loại lỗi *</label>
            <select style={S.sel} value={form.errorType} onChange={e => setForm({ ...form, errorType: e.target.value })}>
              <option value="">-- Chọn loại lỗi --</option>
              {ERROR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.errorType && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{errors.errorType}</div>}
          </div>

          <div>
            <label style={S.lbl}>Ngày bị feedback *</label>
            <input type="date" style={S.inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            {errors.date && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{errors.date}</div>}
          </div>

          <div>
            <label style={S.lbl}>Ghi chú</label>
            <input style={S.inp} value={form.note} placeholder="Mô tả chi tiết (tuỳ chọn)" onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu..." : editId ? "💾 Cập nhật" : "➕ Thêm feedback"}
          </button>
          {editId && <button style={S.btnGhost} onClick={cancelEdit}>Hủy</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...S.card, padding: "12px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...S.sel, width: "auto" }} value={filterStore} onChange={e => setFilterStore(e.target.value)}>
          <option value="">Tất cả cửa hàng</option>
          {REGIONS.map(r => (
            <optgroup key={r.id} label={r.name}>
              {r.stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select style={{ ...S.sel, width: "auto" }} value={filterWeek} onChange={e => setFilterWeek(e.target.value)}>
          <option value="all">Tất cả tuần</option>
          {availableWeeks.map(ws => (
            <option key={ws} value={ws}>
              {ws === thisWeekStart ? "⭐ " : ""}{weekLabel(ws)}
            </option>
          ))}
        </select>
        <select style={{ ...S.sel, width: "auto" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date">Mới nhất</option>
          <option value="store">Cửa hàng</option>
          <option value="error">Loại lỗi</option>
        </select>
        <span style={{ fontSize: 12, color: "#556677", marginLeft: "auto" }}>{filtered.length} records</span>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#556677", fontSize: 14 }}>
            Chưa có feedback nào. Bắt đầu nhập ở trên!
          </div>
        ) : (
          filtered.map(fb => {
            const store = STORE_MAP[fb.storeId];
            const ws = getWeekStart(fb.date);
            const weekFbs = feedbacks.filter(f => f.storeId === fb.storeId && getWeekStart(f.date) === ws);
            const weekCount = weekFbs.length;
            return (
              <div key={fb.id} style={{
                background: "rgba(255,255,255,0.025)",
                border: `1px solid ${alertLevel(weekCount) === "red" ? "rgba(239,68,68,0.25)" : alertLevel(weekCount) === "yellow" ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 10, padding: "12px 18px",
                borderLeft: `4px solid ${store?.regionColor || "#38bdf8"}`,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10,
                      background: `${store?.regionColor || "#38bdf8"}20`,
                      color: store?.regionColor || "#38bdf8",
                      fontSize: 11, fontWeight: 600,
                    }}>{store?.regionName}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#e0e7ef" }}>{store?.name || fb.storeId}</span>
                    <AlertBadge count={weekCount} />
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#7a8fa5", flexWrap: "wrap" }}>
                    <span>⚠️ {fb.errorType}</span>
                    <span>📅 {fmtDate(fb.date)}</span>
                    {fb.note && <span>📝 {fb.note}</span>}
                    <span>👤 {fb.submittedBy}</span>
                  </div>
                </div>
                {userRole === "admin" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={S.btnGhost} onClick={() => startEdit(fb)}>Sửa</button>
                    <button style={S.btnDanger} onClick={() => setConfirmDelete(fb)}>Xóa</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setConfirmDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#0f1c2e", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%",
          }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f87171", marginBottom: 10 }}>Xóa feedback?</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>
              {STORE_MAP[confirmDelete.storeId]?.name} — {confirmDelete.errorType}
            </div>
            <div style={{ fontSize: 12, color: "#556677", marginBottom: 20 }}>📅 {fmtDate(confirmDelete.date)}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={S.btnGhost} onClick={() => setConfirmDelete(null)}>Hủy</button>
              <button style={S.btnDanger} onClick={async () => { await onDelete(confirmDelete.id); setConfirmDelete(null); }}>
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADMIN TAB
   ═══════════════════════════════════════════════════ */
function AdminPanel({ user }) {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAllowedEmails().then(setEmails);
  }, []);

  async function addEmail() {
    if (!newEmail.trim() || !newEmail.includes("@")) return;
    setLoading(true);
    await saveAllowedEmail(newEmail.trim(), newRole);
    await writeLog(user?.email, user?.displayName, "create", "email", newEmail.trim(), `role: ${newRole}`);
    const list = await loadAllowedEmails();
    setEmails(list);
    setNewEmail("");
    setLoading(false);
  }

  async function removeEmail(email) {
    await deleteAllowedEmail(email);
    await writeLog(user?.email, user?.displayName, "delete", "email", email, "");
    const list = await loadAllowedEmails();
    setEmails(list);
  }

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e7ef", marginBottom: 20 }}>⚙️ Quản lý quyền truy cập</div>

      <div style={S.card}>
        <div style={S.cardTitle}>➕ Thêm email được phép</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            style={{ ...S.inp, flex: 2, minWidth: 220 }}
            placeholder="email@example.com"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addEmail()}
          />
          <select style={{ ...S.sel, flex: 1, minWidth: 120 }} value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="viewer">Viewer (chỉ xem)</option>
            <option value="admin">Admin (full)</option>
          </select>
          <button style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={addEmail} disabled={loading}>
            Thêm
          </button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>📋 Danh sách email ({emails.length})</div>
        {emails.length === 0 ? (
          <div style={{ color: "#556677", fontSize: 13 }}>Chưa có email nào. Bắt đầu thêm ở trên.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {emails.map(e => (
              <div key={e.email} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontSize: 14, color: "#dde6f0" }}>{e.email}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 8,
                      background: e.role === "admin" ? "rgba(99,102,241,0.2)" : "rgba(56,189,248,0.15)",
                      color: e.role === "admin" ? "#a5b4fc" : "#7dd3fc",
                      fontSize: 11, fontWeight: 600,
                    }}>{e.role === "admin" ? "🔑 Admin" : "👁 Viewer"}</span>
                  </div>
                </div>
                {e.email !== user?.email && (
                  <button style={S.btnDanger} onClick={() => removeEmail(e.email)}>Xóa</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SQL Schema hint */}
      <div style={{ ...S.card, borderColor: "rgba(99,102,241,0.2)" }}>
        <div style={S.cardTitle}>🗄️ Supabase SQL Schema</div>
        <pre style={{
          background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "14px 16px",
          fontSize: 11, color: "#94a3b8", overflowX: "auto", lineHeight: 1.6,
        }}>{`-- Chạy trong Supabase SQL Editor:

create table allowed_emails (
  email text primary key,
  role text not null default 'viewer',
  created_at timestamptz default now()
);

create table feedbacks (
  id text primary key,
  store_id text not null,
  error_type text not null,
  feedback_date date not null,
  note text default '',
  submitted_by text default '',
  created_at timestamptz default now()
);

create table audit_log (
  id bigserial primary key,
  user_email text,
  user_name text,
  action text,
  target_type text,
  target_name text,
  detail text,
  created_at timestamptz default now()
);`}</pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(undefined); // undefined=loading, null=not logged in
  const [userRole, setUserRole] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [dbStatus, setDbStatus] = useState("local");

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(async (event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        const role = await checkEmailAccess(u.email);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    });
    // Also check current user
    getUser().then(async u => {
      if (u !== undefined) {
        setUser(u || null);
        if (u) {
          const role = await checkEmailAccess(u.email);
          setUserRole(role);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load feedbacks
  useEffect(() => {
    if (!user || !userRole) return;
    loadFeedbacks().then(list => {
      setFeedbacks(list);
      setDbStatus(list.length > 0 ? "local" : "local");
    });
  }, [user, userRole]);

  const handleSave = useCallback(async (fb) => {
    const result = await saveFeedback(fb);
    if (result) setDbStatus("supabase");
    await writeLog(user?.email, user?.displayName || user?.email, fb.id ? "update" : "create", "feedback",
      STORE_MAP[fb.storeId]?.name || fb.storeId, `${fb.errorType} | ${fb.date}`);
    const list = await loadFeedbacks();
    setFeedbacks(list);
  }, [user]);

  const handleDelete = useCallback(async (id) => {
    const fb = feedbacks.find(f => f.id === id);
    await deleteFeedback(id);
    await writeLog(user?.email, user?.displayName || user?.email, "delete", "feedback",
      STORE_MAP[fb?.storeId]?.name || fb?.storeId, `${fb?.errorType} | ${fb?.date}`);
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  }, [feedbacks, user]);

  // Loading
  if (user === undefined) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ color: "#7a8fa5", fontSize: 14 }}>Đang tải...</div>
      </div>
    );
  }

  // Not logged in
  if (!user) return <LoginScreen />;

  // Access check
  if (!userRole) return <AccessDenied user={user} onSignOut={signOut} />;

  const TABS = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "timeline", label: "📅 Timeline" },
    { id: "input", label: "➕ Nhập feedback" },
    ...(userRole === "admin" ? [{ id: "admin", label: "⚙️ Quản lý" }] : []),
  ];

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <header style={S.header}>
        <div style={S.logo}>📋 SanThai Feedback</div>
        <nav style={S.nav}>
          {TABS.map(t => (
            <button key={t.id} style={S.tabBtn(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#556677", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ color: "#7a8fa5" }}>{user.email}</span>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 6,
              background: userRole === "admin" ? "rgba(99,102,241,0.2)" : "rgba(56,189,248,0.1)",
              color: userRole === "admin" ? "#a5b4fc" : "#7dd3fc",
            }}>{userRole === "admin" ? "Admin" : "Viewer"}</span>
          </div>
          <button onClick={signOut} style={{ ...S.btnGhost, fontSize: 11 }}>Đăng xuất</button>
        </div>
      </header>

      <div style={S.content}>
        {tab === "dashboard" && <Dashboard feedbacks={feedbacks} />}
        {tab === "timeline" && <Timeline feedbacks={feedbacks} />}
        {tab === "input" && (
          <InputFeedback
            feedbacks={feedbacks}
            onSave={handleSave}
            onDelete={handleDelete}
            user={user}
            userRole={userRole}
          />
        )}
        {tab === "admin" && userRole === "admin" && <AdminPanel user={user} />}

        <div style={{
          textAlign: "center", marginTop: 40, paddingTop: 16,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          fontSize: 11, color: "#3a4d60",
        }}>
          © 2026 SanThai Feedback Manager
          <span style={{ marginLeft: 8, color: dbStatus === "supabase" ? "#22c55e" : "#f59e0b" }}>
            ● {dbStatus === "supabase" ? "Cloud" : "Local"}
          </span>
        </div>
      </div>
    </div>
  );
}
