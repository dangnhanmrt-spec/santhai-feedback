import { useState, useEffect, useMemo, useCallback } from "react";
import {
  loadFeedbacks, saveFeedback, deleteFeedback,
  loadAllowedEmails, saveAllowedEmail, deleteAllowedEmail,
  loadStores, addStore, toggleStoreActive,
  loadAuditLog,
  signInWithGoogle, signOut, getSession, onAuthChange, checkEmailAccess, writeLog,
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

// Loại lỗi nghiêm trọng — 1 lỗi/tuần là đã cảnh báo đỏ ngay
const CRITICAL_TYPES = [
  "Chất lượng sản phẩm",
  "Vật thể lạ trong sản phẩm",
  "Thái độ/chất lượng phục vụ",
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

// Enrich store từ DB với thông tin region
function enrichStore(s) {
  if (!s) return s;
  const reg = REGIONS.find(r => r.id === s.region_id) || { name: s.region_id, color: "#38bdf8" };
  return { ...s, regionName: reg.name, regionColor: reg.color };
}

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
const SUPER_ADMIN = "dangnhan.mrt@gmail.com"; // Quyền cao nhất — không ai xóa được

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
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    minHeight: 60,
    position: "sticky",
    top: 0,
    zIndex: 50,
    gap: 8,
  },
  logo: {
    fontSize: 18, fontWeight: 700,
    background: "linear-gradient(135deg,#38bdf8,#818cf8)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    letterSpacing: "-0.3px",
  },
  nav: { display: "flex", gap: 4, flexWrap: "wrap" },
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
function AccessDenied({ user, authError, onSignOut }) {
  // SYNC logout — không dùng async để tránh treo
  function hardReset() {
    try { onSignOut(); } catch (e) {}
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    window.location.replace(window.location.origin);
  }

  function switchAccount() {
    try { onSignOut(); } catch (e) {}
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    setTimeout(() => signInWithGoogle(), 300);
  }

  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: 20, padding: "40px", textAlign: "center", maxWidth: 420,
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ color: "#f87171", marginBottom: 8 }}>Không có quyền truy cập</h2>
        <p style={{ color: "#7a8fa5", fontSize: 13, marginBottom: 24 }}>
          Email <strong style={{ color: "#dde6f0" }}>{user?.email}</strong> chưa được cấp quyền.<br />
          Vui lòng liên hệ Admin.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={hardReset}
            style={{ ...S.btnGhost, padding: "10px 20px", fontSize: 13 }}>
            🚪 Đăng xuất
          </button>
          <button onClick={switchAccount}
            style={{ ...S.btnPrimary, padding: "10px 20px", fontSize: 13 }}>
            🔄 Đổi tài khoản Google
          </button>
        </div>
        {authError && (
          <div style={{ color: "#f87171", fontSize: 11, marginTop: 14, padding: "8px 12px",
            background: "rgba(239,68,68,0.08)", borderRadius: 8, textAlign: "left" }}>
            Lỗi: {authError}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════ */
function Dashboard({ feedbacks, stores }) {
  const todayWeekStart = getWeekStart(vnTodayISO());
  const [selectedWeek, setSelectedWeek] = useState(todayWeekStart);
  const [chartWeeks, setChartWeeks] = useState(6);

  // Tạo danh sách tuần có data để chọn (12 tuần gần nhất)
  const availableWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(todayWeekStart + "T00:00:00");
      d.setDate(d.getDate() - i * 7);
      const ws = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      weeks.push(ws);
    }
    return weeks;
  }, [todayWeekStart]);

  const dynamicStoreMap = useMemo(() => {
    const m = {};
    stores.forEach(s => { m[s.id] = enrichStore(s); });
    return m;
  }, [stores]);

  // Stats cho tuần đang chọn
  const stats = useMemo(() => {
    const selWeek = feedbacks.filter(f => getWeekStart(f.date) === selectedWeek);
    // Tuần trước tuần đang chọn
    const d = new Date(selectedWeek + "T00:00:00");
    d.setDate(d.getDate() - 7);
    const prevWs = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const prevWeek = feedbacks.filter(f => getWeekStart(f.date) === prevWs);

    const storeCounts = {};
    selWeek.forEach(f => { storeCounts[f.storeId] = (storeCounts[f.storeId] || 0) + 1; });
    const redStores = Object.entries(storeCounts).filter(([, c]) => c >= ALERT_RED).map(([id, c]) => ({ store: dynamicStoreMap[id], count: c }));
    const yellowStores = Object.entries(storeCounts).filter(([, c]) => c === ALERT_YELLOW).map(([id, c]) => ({ store: dynamicStoreMap[id], count: c }));

    const errCounts = {};
    selWeek.forEach(f => { errCounts[f.errorType] = (errCounts[f.errorType] || 0) + 1; });
    const topErrors = Object.entries(errCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const criticalAlerts = [];
    selWeek.forEach(f => {
      if (CRITICAL_TYPES.includes(f.errorType)) {
        const store = dynamicStoreMap[f.storeId];
        criticalAlerts.push({ store, errorType: f.errorType, date: f.date, id: f.id });
      }
    });

    return { selWeek, prevWeek, redStores, yellowStores, storeCounts, topErrors, criticalAlerts };
  }, [feedbacks, selectedWeek, dynamicStoreMap]);

  // Dữ liệu biểu đồ xu hướng theo số tuần được chọn
  const chartData = useMemo(() => {
    const result = [];
    for (let i = chartWeeks - 1; i >= 0; i--) {
      const d = new Date(todayWeekStart + "T00:00:00");
      d.setDate(d.getDate() - i * 7);
      const ws = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const wFbs = feedbacks.filter(f => getWeekStart(f.date) === ws);
      const critical = wFbs.filter(f => CRITICAL_TYPES.includes(f.errorType)).length;
      const label = "T" + (d.getDate()) + "/" + (d.getMonth() + 1);
      result.push({ ws, label, total: wFbs.length, critical });
    }
    return result;
  }, [feedbacks, chartWeeks, todayWeekStart]);

  const chartMax = useMemo(() => Math.max(...chartData.map(d => d.total), 1), [chartData]);

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div style={{ ...S.card, flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#e0e7ef" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#7a8fa5", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#556677", marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const isCurrentWeek = selectedWeek === todayWeekStart;

  return (
    <div>
      {/* Header + bộ chọn tuần */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e7ef", marginBottom: 2 }}>📊 Tổng quan</div>
          <div style={{ fontSize: 13, color: "#7a8fa5" }}>{weekLabel(selectedWeek)}{isCurrentWeek ? " (tuần hiện tại)" : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              const idx = availableWeeks.indexOf(selectedWeek);
              if (idx < availableWeeks.length - 1) setSelectedWeek(availableWeeks[idx + 1]);
            }}
            disabled={availableWeeks.indexOf(selectedWeek) >= availableWeeks.length - 1}
            style={{ ...S.btnGhost, padding: "5px 10px", fontSize: 16, opacity: availableWeeks.indexOf(selectedWeek) >= availableWeeks.length - 1 ? 0.3 : 1 }}
          >‹</button>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            style={{ ...S.sel, fontSize: 13, minWidth: 180 }}
          >
            {availableWeeks.map(ws => (
              <option key={ws} value={ws}>
                {weekLabel(ws)}{ws === todayWeekStart ? " (hiện tại)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const idx = availableWeeks.indexOf(selectedWeek);
              if (idx > 0) setSelectedWeek(availableWeeks[idx - 1]);
            }}
            disabled={availableWeeks.indexOf(selectedWeek) <= 0}
            style={{ ...S.btnGhost, padding: "5px 10px", fontSize: 16, opacity: availableWeeks.indexOf(selectedWeek) <= 0 ? 0.3 : 1 }}
          >›</button>
          {!isCurrentWeek && (
            <button onClick={() => setSelectedWeek(todayWeekStart)} style={{ ...S.btnPrimary, fontSize: 12, padding: "5px 12px" }}>
              Tuần này
            </button>
          )}
        </div>
      </div>

      {/* CRITICAL ALERT BANNER */}
      {stats.criticalAlerts.length > 0 && (
        <div style={{
          background: "rgba(239,68,68,0.08)",
          border: "2px solid rgba(239,68,68,0.4)",
          borderRadius: 14, padding: "16px 20px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>💀</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f87171" }}>
                CẢNH BÁO NGHIÊM TRỌNG — {stats.criticalAlerts.length} lỗi{isCurrentWeek ? " tuần này" : " tuần " + weekLabel(selectedWeek)}
              </div>
              <div style={{ fontSize: 12, color: "#fca5a5" }}>Chất lượng SP · Vật thể lạ · Thái độ phục vụ</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.criticalAlerts.map((a, i) => (
              <div key={a.id || i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(239,68,68,0.08)", borderRadius: 8, padding: "8px 12px",
                flexWrap: "wrap", gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>💀</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#fde8e8" }}>{a.store?.name || a.store?.id}</span>
                  <span style={{ fontSize: 11, color: "#7a8fa5" }}>{a.store?.regionName}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>{a.errorType}</span>
                  <span style={{ fontSize: 11, color: "#7a8fa5" }}>{fmtDate(a.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard icon="📝" label="Tổng feedback" value={stats.selWeek.length}
          sub={`Tuần trước: ${stats.prevWeek.length}${stats.prevWeek.length > 0 ? (stats.selWeek.length > stats.prevWeek.length ? " ▲" : stats.selWeek.length < stats.prevWeek.length ? " ▼" : " =") : ""}`} />
        <StatCard icon="💀" label="Lỗi nghiêm trọng" value={stats.criticalAlerts.length}
          color={stats.criticalAlerts.length > 0 ? "#f87171" : "#4ade80"} sub="≥1 là cảnh báo" />
        <StatCard icon="🔴" label="CH cảnh báo đỏ" value={stats.redStores.length}
          color={stats.redStores.length > 0 ? "#f87171" : "#4ade80"} sub="≥3 lỗi/tuần" />
        <StatCard icon="🟡" label="CH cảnh báo vàng" value={stats.yellowStores.length}
          color={stats.yellowStores.length > 0 ? "#facc15" : "#4ade80"} sub="2 lỗi/tuần" />
      </div>

      {/* Biểu đồ xu hướng */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
          <div style={S.cardTitle}>📈 Xu hướng lỗi theo tuần</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[4, 6, 8, 12].map(n => (
              <button key={n} onClick={() => setChartWeeks(n)} style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                border: "none", fontFamily: "inherit",
                background: chartWeeks === n ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)",
                color: chartWeeks === n ? "#38bdf8" : "#7a8fa5",
              }}>{n} tuần</button>
            ))}
          </div>
        </div>

        {/* Chart bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, padding: "0 4px" }}>
          {chartData.map((d, i) => {
            const isSelected = d.ws === selectedWeek;
            const totalH = chartMax > 0 ? Math.round((d.total / chartMax) * 120) : 0;
            const critH = d.total > 0 ? Math.round((d.critical / d.total) * totalH) : 0;
            return (
              <div
                key={d.ws}
                onClick={() => setSelectedWeek(d.ws)}
                title={`${weekLabel(d.ws)}: ${d.total} lỗi (${d.critical} nghiêm trọng)`}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: 4 }}
              >
                {d.total > 0 && (
                  <div style={{ fontSize: 10, color: isSelected ? "#38bdf8" : "#556677", fontWeight: isSelected ? 700 : 400 }}>{d.total}</div>
                )}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 120 }}>
                  <div style={{ width: "100%", borderRadius: "3px 3px 0 0", overflow: "hidden", minHeight: d.total > 0 ? 4 : 0 }}>
                    {/* Critical part (red, top) */}
                    {critH > 0 && <div style={{ height: critH, background: "#ef4444", width: "100%" }} />}
                    {/* Normal part (blue, bottom) */}
                    {(totalH - critH) > 0 && <div style={{
                      height: totalH - critH, width: "100%",
                      background: isSelected ? "#38bdf8" : "rgba(56,189,248,0.4)",
                    }} />}
                    {d.total === 0 && <div style={{ height: 2, background: "rgba(255,255,255,0.06)", width: "100%" }} />}
                  </div>
                </div>
                <div style={{
                  fontSize: 9, color: isSelected ? "#38bdf8" : "#3a4d60",
                  fontWeight: isSelected ? 700 : 400, textAlign: "center", lineHeight: 1.2,
                  borderTop: isSelected ? "2px solid #38bdf8" : "2px solid transparent",
                  paddingTop: 2, width: "100%",
                }}>{d.label}</div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#556677" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "rgba(56,189,248,0.5)", marginRight: 4, verticalAlign: "middle" }} />Lỗi thông thường</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: "#ef4444", marginRight: 4, verticalAlign: "middle" }} />Lỗi nghiêm trọng</span>
          <span style={{ color: "#38bdf8" }}>• Click cột để xem chi tiết tuần đó</span>
        </div>
      </div>

      {/* 2 cột: red alert + top errors */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={S.card}>
          <div style={S.cardTitle}>🚨 Cửa hàng cảnh báo đỏ</div>
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

        <div style={S.card}>
          <div style={S.cardTitle}>📋 Lỗi phổ biến nhất</div>
          {stats.topErrors.length === 0 ? (
            <div style={{ color: "#7a8fa5", fontSize: 13 }}>Chưa có dữ liệu</div>
          ) : (
            stats.topErrors.map(([type, count], i) => {
              const max = stats.topErrors[0][1];
              const isCritical = CRITICAL_TYPES.includes(type);
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, alignItems: "center" }}>
                    <span style={{ color: isCritical ? "#fca5a5" : "#c0ccd8", display: "flex", alignItems: "center", gap: 4 }}>
                      {isCritical && <span>💀</span>}{i + 1}. {type}
                    </span>
                    <span style={{ fontWeight: 700, color: isCritical ? "#f87171" : "#38bdf8" }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: isCritical ? "linear-gradient(90deg,#ef4444,#dc2626)" : "linear-gradient(90deg,#38bdf8,#6366f1)", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {stats.yellowStores.length > 0 && (
        <div style={{ ...S.card, marginTop: 16 }}>
          <div style={S.cardTitle}>⚠️ Cửa hàng cảnh báo vàng</div>
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
function Timeline({ feedbacks, stores }) {
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

  // Nếu stores từ DB chưa load → dùng REGIONS hardcode làm fallback
  const useDbStores = stores.length > 0;
  const activeStores = useDbStores ? stores.filter(s => s.active !== false) : ALL_STORES;
  const dynRegions = useDbStores
    ? REGIONS.map(r => ({ ...r, stores: activeStores.filter(s => s.region_id === r.id) })).filter(r => r.stores.length > 0)
    : REGIONS;
  const displayRegions = selectedRegion === "all" ? dynRegions : dynRegions.filter(r => r.id === selectedRegion);

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
            {dynRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
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
function InputFeedback({ feedbacks, stores, onSave, onDelete, user, userRole }) {
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
      if (sortBy === "store") { const nameA = stores.find(s=>s.id===a.storeId)?.name || STORE_MAP[a.storeId]?.name || a.storeId; const nameB = stores.find(s=>s.id===b.storeId)?.name || STORE_MAP[b.storeId]?.name || b.storeId; return nameA.localeCompare(nameB); }
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
              {REGIONS.map(r => {
                const rs = stores.length > 0
                  ? stores.filter(s => s.region_id === r.id && s.active !== false)
                  : r.stores;
                if (!rs.length) return null;
                return (
                  <optgroup key={r.id} label={r.name}>
                    {rs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                );
              })}
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
          {REGIONS.map(r => {
            const rs = stores.length > 0
              ? stores.filter(s => s.region_id === r.id && s.active !== false)
              : r.stores;
            if (!rs.length) return null;
            return (
              <optgroup key={r.id} label={r.name}>
                {rs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            );
          })}
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
            // Tra từ DB stores trước, fallback về STORE_MAP hardcode
            const dbStore = stores.find(s => s.id === fb.storeId);
            const reg = dbStore ? REGIONS.find(r => r.id === dbStore.region_id) : null;
            const store = dbStore
              ? { name: dbStore.name, regionName: reg?.name || dbStore.region_id, regionColor: reg?.color || "#38bdf8" }
              : STORE_MAP[fb.storeId];
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
function AdminPanel({ user, userRole, stores, onStoresChanged }) {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("viewer");
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = user?.email === SUPER_ADMIN;

  useEffect(() => {
    loadAllowedEmails().then(setEmails);
  }, []);

  async function addEmail() {
    if (!newEmail.trim() || !newEmail.includes("@")) return;
    // Admin thường không được thêm admin
    if (!isSuperAdmin && newRole === "admin") return;
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

  // Kiểm tra có được phép xóa email này không
  function canDelete(targetEmail, targetRole) {
    if (targetEmail === SUPER_ADMIN) return false;         // Không ai xóa Super Admin
    if (targetEmail === user?.email) return false;          // Không tự xóa mình
    if (isSuperAdmin) return true;                         // Super Admin xóa được tất cả
    if (targetRole === "admin") return false;               // Admin không xóa admin khác
    return true;                                           // Admin xóa được viewer
  }

  const roleLabel = (role, email) => {
    if (email === SUPER_ADMIN) return { label: "👑 Super Admin", bg: "rgba(234,179,8,0.2)", color: "#facc15" };
    if (role === "admin") return { label: "🔑 Admin", bg: "rgba(99,102,241,0.2)", color: "#a5b4fc" };
    return { label: "👁 Viewer", bg: "rgba(56,189,248,0.15)", color: "#7dd3fc" };
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#e0e7ef", marginBottom: 20 }}>⚙️ Quản lý quyền truy cập</div>

      {/* Phân quyền hiện tại */}
      <div style={{ ...S.card, borderColor: "rgba(234,179,8,0.2)", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#7a8fa5", lineHeight: 1.8 }}>
          <strong style={{ color: "#facc15" }}>👑 Super Admin</strong> — Thêm/xóa tất cả, bao gồm Admin<br/>
          <strong style={{ color: "#a5b4fc" }}>🔑 Admin</strong> — Thêm/xóa Viewer, không thêm/xóa Admin<br/>
          <strong style={{ color: "#7dd3fc" }}>👁 Viewer</strong> — Chỉ xem dữ liệu, không chỉnh sửa
        </div>
      </div>

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
            {isSuperAdmin && <option value="admin">Admin</option>}
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
            {emails.map(e => {
              const rl = roleLabel(e.role, e.email);
              const deletable = canDelete(e.email, e.role);
              return (
                <div key={e.email} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "rgba(255,255,255,0.025)",
                  border: e.email === SUPER_ADMIN ? "1px solid rgba(234,179,8,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#dde6f0" }}>{e.email}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 8, background: rl.bg, color: rl.color, fontSize: 11, fontWeight: 600 }}>
                        {rl.label}
                      </span>
                    </div>
                  </div>
                  {deletable ? (
                    <button style={S.btnDanger} onClick={() => removeEmail(e.email)}>Xóa</button>
                  ) : (
                    <span style={{ fontSize: 11, color: "#3a4d60" }}>
                      {e.email === SUPER_ADMIN ? "🔒 Không thể xóa" : e.email === user?.email ? "" : "🔒"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Store Manager — chỉ Super Admin */}
      <StoreManager onStoresChanged={onStoresChanged} user={user} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   AUDIT LOG
   ═══════════════════════════════════════════════════ */
function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(30);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadAuditLog(limit);
      setLogs(data || []);
    } catch(e) { console.warn("[AuditLog]", e); }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [limit]);

  const actionLabel = (action) => ({
    create: { label: "Thêm", color: "#4ade80" },
    update: { label: "Sửa", color: "#38bdf8" },
    delete: { label: "Xóa", color: "#f87171" },
    hide:   { label: "Ẩn",  color: "#facc15" },
    show:   { label: "Hiện", color: "#a78bfa" },
  }[action] || { label: action, color: "#7a8fa5" });

  function fmtTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  return (
    <div style={S.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={S.cardTitle}>📋 Lịch sử thao tác</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ ...S.sel, width: "auto", fontSize: 12 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={30}>30 gần nhất</option>
            <option value={50}>50 gần nhất</option>
            <option value={100}>100 gần nhất</option>
          </select>
          <button onClick={refresh} disabled={loading} style={{ ...S.btnGhost, fontSize: 11, padding: "4px 10px" }}>
            🔄 Tải lại
          </button>
        </div>
      </div>

      {loading && <div style={{ color: "#7a8fa5", fontSize: 13 }}>Đang tải...</div>}
      {!loading && logs.length === 0 && <div style={{ color: "#556677", fontSize: 13 }}>Chưa có lịch sử thao tác.</div>}

      {!loading && logs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {logs.map(log => {
            const act = actionLabel(log.action);
            return (
              <div key={log.id} style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 1fr 90px",
                gap: 8, alignItems: "center",
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
                fontSize: 12,
              }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 6, textAlign: "center",
                  background: `${act.color}20`, color: act.color, fontWeight: 600, fontSize: 11,
                }}>
                  {act.label}
                </span>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ color: "#dde6f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.target_name || "—"}
                  </div>
                  <div style={{ color: "#556677", fontSize: 10 }}>{log.detail || ""}</div>
                </div>
                <div style={{ color: "#7a8fa5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {log.user_email}
                </div>
                <div style={{ color: "#3a4d60", textAlign: "right" }}>{fmtTime(log.created_at)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STORE MANAGER
   ═══════════════════════════════════════════════════ */
function StoreManager({ onStoresChanged, user }) {
  const [localStores, setLocalStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState(REGIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadStores();
      setLocalStores(data || []);
    } catch (e) { console.warn("[StoreManager] loadStores:", e); }
    setLoading(false);
    try { onStoresChanged(); } catch(e) {}
  }

  useEffect(() => { refresh(); }, []);

  const filtered = localStores.filter(s => {
    if (filter === "active") return s.active !== false;
    if (filter === "hidden") return s.active === false;
    return true;
  });

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const base = newName.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[\u0111]/g, "d").replace(/[^a-z0-9]+/g, "_");
      const id = base + "_" + Date.now().toString(36);
      await addStore(id, newName.trim(), newRegion);
      await writeLog(user?.email, user?.email, "create", "store", newName.trim(), `region:${newRegion}`);
      setNewName("");
      await refresh();
    } catch (err) { alert("Lỗi: " + err.message); }
    finally { setSaving(false); }
  }

  async function handleToggle(s) {
    await toggleStoreActive(s.id, s.active === false);
    await writeLog(user?.email, user?.email, s.active===false?"show":"hide", "store", s.name, "");
    await refresh();
  }

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>🏪 Quản lý cửa hàng ({localStores.length})</div>

      {/* Reload */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button onClick={refresh} disabled={loading} style={{ ...S.btnGhost, fontSize: 11, padding: "4px 10px" }}>
          🔄 Tải lại
        </button>
      </div>

      {/* Thêm mới */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#7a8fa5", marginBottom: 8 }}>Thêm cửa hàng mới</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...S.inp, flex: 2, minWidth: 180 }} placeholder="Tên cửa hàng..."
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <select style={{ ...S.sel, flex: 1, minWidth: 160 }} value={newRegion} onChange={e => setNewRegion(e.target.value)}>
            {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleAdd} disabled={saving || loading}>Thêm</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["all","Tất cả"],["active","Đang hoạt động"],["hidden","Đã ẩn"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: "4px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            border: "none", fontFamily: "inherit",
            background: filter === v ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.05)",
            color: filter === v ? "#38bdf8" : "#7a8fa5",
          }}>
            {l} ({localStores.filter(s => v==="all"?true:v==="active"?s.active!==false:s.active===false).length})
          </button>
        ))}
      </div>

      {/* Danh sách */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
        {loading && <div style={{ color: "#7a8fa5", fontSize: 13 }}>Đang tải danh sách cửa hàng...</div>}
        {!loading && filtered.length === 0 && <div style={{ color: "#556677", fontSize: 13 }}>Không có cửa hàng nào.</div>}
        {filtered.map(s => {
          const reg = REGIONS.find(r => r.id === s.region_id);
          const isHidden = s.active === false;
          return (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: 8, flexWrap: "wrap", gap: 6,
              background: isHidden ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)",
              border: isHidden ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.08)",
              opacity: isHidden ? 0.6 : 1,
            }}>
              <div>
                <span style={{ fontSize: 13, color: isHidden ? "#556677" : "#dde6f0" }}>{s.name}</span>
                <span style={{ fontSize: 11, color: "#3a4d60", marginLeft: 8 }}>{reg?.name || s.region_id}</span>
                {isHidden && <span style={{ fontSize: 10, color: "#ef4444", marginLeft: 6 }}>● Ẩn</span>}
              </div>
              <button onClick={() => handleToggle(s)} style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                border: "none", fontFamily: "inherit",
                background: isHidden ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: isHidden ? "#4ade80" : "#f87171",
              }}>
                {isHidden ? "Hiện lại" : "Ẩn"}
              </button>
            </div>
          );
        })}
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
  const [stores, setStores] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [dbStatus, setDbStatus] = useState("local");

  const [authError, setAuthError] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Auth: chỉ render UI khi đã check XONG cả session + role
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const session = await getSession();
        if (!mounted) return;

        const u = session?.user || null;

        if (!u) {
          setUser(null); setUserRole(null); setAuthChecking(false);
          return;
        }

        // Có user → check role
        const role = await checkEmailAccess(u.email);
        if (!mounted) return;

        // Set CẢ HAI cùng lúc để không flash màn AccessDenied
        setUser(u);
        setUserRole(role);
        if (role === null) setAuthError(`Email ${u.email} không có trong danh sách cho phép.`);
        setAuthChecking(false);
      } catch (err) {
        console.error("[checkAuth]", err);
        if (mounted) {
          setAuthError("Lỗi kết nối: " + (err?.message || "unknown"));
          setUser(null); setUserRole(null); setAuthChecking(false);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = onAuthChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setUser(null); setUserRole(null); setAuthError(null);
        return;
      }
      if (event === "SIGNED_IN") {
        // Chạy lại check
        checkAuth();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load feedbacks + stores
  useEffect(() => {
    if (!user || !userRole) return;
    Promise.all([loadFeedbacks(), loadStores()]).then(([fbs, sts]) => {
      setFeedbacks(fbs);
      setStores(sts);
      setDbStatus("supabase");
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

  // Đang check auth — chờ xong mới render
  if (authChecking) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ color: "#7a8fa5", fontSize: 14 }}>Đang tải...</div>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!user) return <LoginScreen />;

  // Đã đăng nhập nhưng không có quyền
  if (!userRole) return <AccessDenied user={user} authError={authError} onSignOut={signOut} />;

  const TABS = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "timeline", label: "📅 Timeline" },
    { id: "input", label: "➕ Nhập feedback" },
    ...(userRole === "admin" ? [{ id: "history", label: "📋 Lịch sử" }] : []),
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
        {tab === "dashboard" && <Dashboard feedbacks={feedbacks} stores={stores} />}
        {tab === "timeline" && <Timeline feedbacks={feedbacks} stores={stores} />}
        {tab === "input" && (
          <InputFeedback
            feedbacks={feedbacks}
            stores={stores}
            onSave={handleSave}
            onDelete={handleDelete}
            user={user}
            userRole={userRole}
          />
        )}
        {tab === "history" && userRole === "admin" && <AuditLog />}
        {tab === "admin" && userRole === "admin" && <AdminPanel user={user} userRole={userRole} stores={stores} onStoresChanged={() => loadStores().then(setStores)} />}

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
