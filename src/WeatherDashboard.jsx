import { useEffect, useMemo, useState } from "react";
import { getSession } from "./supabase.js";

const COLORS = {
  high: { label: "Nguy cơ cao", color: "#fb7185", bg: "rgba(244,63,94,.13)", border: "rgba(244,63,94,.35)" },
  medium: { label: "Cần lưu ý", color: "#fbbf24", bg: "rgba(245,158,11,.13)", border: "rgba(245,158,11,.35)" },
  low: { label: "Ổn định", color: "#4ade80", bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.3)" },
  unknown: { label: "Thiếu dữ liệu", color: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.24)" },
};
const ORDER = { high: 0, medium: 1, low: 2, unknown: 3 };

function vnTime(value, options = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...options }).format(new Date(value));
}

function Metric({ label, value, tone = "#e2e8f0" }) {
  return (
    <div className="weather-metric">
      <span>{label}</span>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  );
}

function SummaryCard({ label, value, tone, note }) {
  return (
    <div className="weather-summary-card">
      <div className="weather-summary-label">{label}</div>
      <div className="weather-summary-value" style={{ color: tone }}>{value}</div>
      <div className="weather-summary-note">{note}</div>
    </div>
  );
}

function StoreCard({ store, expanded, onToggle }) {
  const tone = COLORS[store.risk] || COLORS.unknown;
  const current = store.current || {};
  const next = store.operationWindow || store.next6h || {};
  return (
    <article className="weather-store-card" style={{ borderColor: tone.border }}>
      <button className="weather-store-main" onClick={onToggle} aria-expanded={expanded}>
        <div className="weather-store-identity">
          <div className="weather-store-title-row">
            <span className="weather-status-dot" style={{ background: tone.color }} />
            <h3>{store.name}</h3>
            <span className="weather-risk" style={{ color: tone.color, background: tone.bg }}>{tone.label}</span>
          </div>
          <div className="weather-store-region">{store.region} · {store.reason || "Chưa có nhận định"}</div>
        </div>
        <div className="weather-current">
          <span className="weather-icon">{current.icon || "🌡️"}</span>
          <div><strong>{current.temp === null || current.temp === undefined ? "—" : current.temp + "°"}</strong><span>{current.condition || "Chưa có dữ liệu"}{current.time ? ` · ${vnTime(current.time, { hour: "2-digit", minute: "2-digit" })}` : ""}</span></div>
        </div>
        <div className="weather-row-metrics">
          <Metric label="Mưa 08–21h" value={next.rain === null || next.rain === undefined ? "—" : next.rain + " mm"} tone={next.rain >= 5 ? "#fbbf24" : "#e2e8f0"} />
          <Metric label="Nhiệt cao nhất" value={next.maxTemp === null || next.maxTemp === undefined ? "—" : next.maxTemp + "°C"} tone={next.maxTemp >= 35 ? "#fbbf24" : "#e2e8f0"} />
          <Metric label="Gió mạnh nhất" value={next.maxWind === null || next.maxWind === undefined ? "—" : next.maxWind + " m/s"} />
        </div>
        <span className="weather-chevron">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="weather-detail">
          {store.error ? (
            <div className="weather-error-inline">{store.error}</div>
          ) : (
            <>
              <div className="weather-window-caption">Dự báo theo giờ · {next.startTime ? `${vnTime(next.startTime, { weekday: "short", day: "2-digit", month: "2-digit" })} · 08:00–21:00` : "08:00–21:00"}</div>
              <div className="weather-hour-strip">
                {(store.hourly || []).map((hour) => (
                  <div className="weather-hour" key={hour.time}>
                    <span>{vnTime(hour.time, { hour: "2-digit", minute: "2-digit" })}</span>
                    <b>{hour.icon}</b>
                    <strong>{hour.temp === null ? "—" : hour.temp + "°"}</strong>
                    <em>{hour.rain ? hour.rain + " mm" : "0 mm"}</em>
                  </div>
                ))}
              </div>
              <div className="weather-store-footer">
                <span>{store.address}</span>
                <a href={store.mapUrl} target="_blank" rel="noreferrer">Mở Google Maps ↗</a>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function WeatherDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [region, setRegion] = useState("all");
  const [risk, setRisk] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  async function loadWeather(background = false) {
    background ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const session = await getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const response = await fetch("/api/weather", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải thời tiết.");
      setRows(payload.stores || []);
      setUpdatedAt(payload.generatedAt);
    } catch (err) {
      setError(err?.message || "Không thể tải dữ liệu thời tiết.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWeather(false);
    const timer = window.setInterval(() => loadWeather(true), 30 * 60 * 1000);
    const onVisible = () => document.visibilityState === "visible" && loadWeather(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const regions = useMemo(() => [...new Set(rows.map((row) => row.region))].sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  const counts = useMemo(() => ({
    total: rows.length,
    high: rows.filter((row) => row.risk === "high").length,
    medium: rows.filter((row) => row.risk === "medium").length,
    low: rows.filter((row) => row.risk === "low").length,
    unknown: rows.filter((row) => row.risk === "unknown").length,
  }), [rows]);
  const forecastStart = rows.find((row) => row.operationWindow?.startTime)?.operationWindow?.startTime;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rows
      .filter((row) => region === "all" || row.region === region)
      .filter((row) => risk === "all" || row.risk === risk)
      .filter((row) => {
        if (!needle) return true;
        const haystack = `${row.name} ${row.region} ${row.address}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return haystack.includes(needle);
      })
      .sort((a, b) => (ORDER[a.risk] ?? 9) - (ORDER[b.risk] ?? 9) || a.region.localeCompare(b.region, "vi") || a.name.localeCompare(b.name, "vi"));
  }, [rows, region, risk, search]);

  return (
    <section className="weather-page">
      <style>{`
        .weather-page{display:flex;flex-direction:column;gap:16px}
        .weather-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
        .weather-title h2{font-size:22px;margin:0 0 5px;color:#f8fafc}
        .weather-title p{font-size:12px;margin:0;color:#64748b}
        .weather-refresh{border:1px solid rgba(125,211,252,.28);background:rgba(56,189,248,.09);color:#7dd3fc;border-radius:9px;padding:9px 13px;font:500 12px Lexend,sans-serif;cursor:pointer}
        .weather-refresh:disabled{opacity:.55;cursor:default}
        .weather-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .weather-summary-card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px}
        .weather-summary-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.08em}
        .weather-summary-value{font-size:27px;font-weight:700;margin:3px 0 1px}
        .weather-summary-note{font-size:11px;color:#475569}
        .weather-filters{display:grid;grid-template-columns:minmax(220px,1fr) 210px 170px;gap:9px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px}
        .weather-filters input,.weather-filters select{width:100%;box-sizing:border-box;background:#101b2c;border:1px solid rgba(255,255,255,.09);border-radius:8px;color:#dbeafe;padding:9px 11px;font:400 12px Lexend,sans-serif;outline:none}
        .weather-filters input:focus,.weather-filters select:focus{border-color:rgba(56,189,248,.55)}
        .weather-list{display:flex;flex-direction:column;gap:8px}
        .weather-store-card{background:rgba(255,255,255,.03);border:1px solid;border-radius:12px;overflow:hidden}
        .weather-store-main{width:100%;display:grid;grid-template-columns:minmax(230px,1.4fr) 150px minmax(330px,1fr) 24px;gap:14px;align-items:center;padding:13px 15px;background:transparent;border:0;color:inherit;text-align:left;font-family:inherit;cursor:pointer}
        .weather-store-title-row{display:flex;align-items:center;gap:8px;min-width:0}
        .weather-store-title-row h3{font-size:14px;margin:0;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .weather-status-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 12px currentColor}
        .weather-risk{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-radius:99px;padding:3px 7px;white-space:nowrap}
        .weather-store-region{font-size:10px;color:#64748b;margin:5px 0 0 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .weather-current{display:flex;align-items:center;gap:9px}
        .weather-icon{font-size:25px}
        .weather-current div{display:flex;flex-direction:column}.weather-current strong{font-size:19px;color:#f8fafc}.weather-current span{font-size:10px;color:#64748b}
        .weather-row-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .weather-metric{display:flex;flex-direction:column;gap:3px}.weather-metric span{font-size:9px;color:#526275;text-transform:uppercase}.weather-metric strong{font-size:12px;font-weight:600}
        .weather-chevron{color:#64748b;font-size:19px;text-align:right}
        .weather-detail{border-top:1px solid rgba(255,255,255,.06);padding:12px 15px 14px;background:rgba(2,6,23,.2)}
        .weather-window-caption{margin:0 0 8px;font-size:10px;color:#64748b}
        .weather-hour-strip{display:grid;grid-template-columns:repeat(14,minmax(58px,1fr));gap:5px;overflow-x:auto;padding-bottom:4px}
        .weather-hour{min-width:55px;background:rgba(255,255,255,.035);border-radius:8px;padding:7px 5px;text-align:center;display:flex;flex-direction:column;gap:4px}
        .weather-hour span{font-size:9px;color:#64748b}.weather-hour b{font-size:17px}.weather-hour strong{font-size:11px;color:#e2e8f0}.weather-hour em{font-size:9px;color:#7dd3fc;font-style:normal}
        .weather-store-footer{display:flex;justify-content:space-between;gap:16px;margin-top:10px;font-size:10px;color:#526275}.weather-store-footer a{color:#7dd3fc;text-decoration:none;white-space:nowrap}
        .weather-empty,.weather-loading,.weather-error{padding:36px 18px;text-align:center;border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(255,255,255,.025);color:#64748b;font-size:13px}
        .weather-error{color:#fda4af;border-color:rgba(244,63,94,.25)}.weather-error-inline{font-size:12px;color:#fda4af}
        .weather-source{text-align:right;color:#3f5064;font-size:10px}.weather-source a{color:#526a84}
        @media(max-width:900px){.weather-summary{grid-template-columns:repeat(2,1fr)}.weather-filters{grid-template-columns:1fr 1fr}.weather-filters input{grid-column:1/-1}.weather-store-main{grid-template-columns:minmax(200px,1fr) 130px 24px}.weather-row-metrics{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.05);padding-top:10px}}
        @media(max-width:600px){.weather-toolbar{align-items:stretch;flex-direction:column}.weather-refresh{align-self:flex-start}.weather-filters{grid-template-columns:1fr}.weather-filters input{grid-column:auto}.weather-store-main{grid-template-columns:1fr auto 20px;gap:9px;padding:12px}.weather-current{justify-content:flex-end}.weather-store-title-row{flex-wrap:wrap}.weather-store-region{white-space:normal}.weather-row-metrics{grid-template-columns:repeat(3,1fr)}.weather-summary-card{padding:12px}.weather-summary-value{font-size:23px}}
      `}</style>

      <div className="weather-toolbar">
        <div className="weather-title">
          <h2>Thời tiết cửa hàng</h2>
          <p>{updatedAt ? `Khung 08:00–21:00${forecastStart ? ` ngày ${vnTime(forecastStart, { weekday: "short", day: "2-digit", month: "2-digit" })}` : ""} · cập nhật lúc ${vnTime(updatedAt, { hour: "2-digit", minute: "2-digit" })} · tự làm mới mỗi 30 phút` : "Dự báo khung 08:00–21:00 theo tọa độ Plus Code của từng cửa hàng"}</p>
        </div>
        <button className="weather-refresh" onClick={() => loadWeather(true)} disabled={loading || refreshing}>
          {refreshing ? "Đang cập nhật…" : "↻ Cập nhật"}
        </button>
      </div>

      <div className="weather-summary">
        <SummaryCard label="Tổng cửa hàng" value={counts.total || "—"} tone="#e2e8f0" note={counts.unknown ? counts.unknown + " CH thiếu dữ liệu" : "Đã nhận dữ liệu"} />
        <SummaryCard label="Nguy cơ cao" value={counts.high} tone="#fb7185" note="Ưu tiên kiểm tra" />
        <SummaryCard label="Cần lưu ý" value={counts.medium} tone="#fbbf24" note="Mưa, gió hoặc nắng nóng" />
        <SummaryCard label="Ổn định" value={counts.low} tone="#4ade80" note="Chưa có rủi ro lớn" />
      </div>

      <div className="weather-filters">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cửa hàng, tỉnh hoặc địa chỉ…" aria-label="Tìm cửa hàng" />
        <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Lọc tỉnh">
          <option value="all">Tất cả tỉnh ({rows.length})</option>
          {regions.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        <select value={risk} onChange={(event) => setRisk(event.target.value)} aria-label="Lọc mức cảnh báo">
          <option value="all">Tất cả mức cảnh báo</option>
          <option value="high">Nguy cơ cao</option>
          <option value="medium">Cần lưu ý</option>
          <option value="low">Ổn định</option>
          <option value="unknown">Thiếu dữ liệu</option>
        </select>
      </div>

      {loading && <div className="weather-loading">Đang tổng hợp dự báo cho toàn hệ thống…</div>}
      {!loading && error && <div className="weather-error">{error}<br/><button className="weather-refresh" style={{ marginTop: 12 }} onClick={() => loadWeather(false)}>Thử lại</button></div>}
      {!loading && !error && (
        <div className="weather-list">
          {filtered.map((store) => <StoreCard key={store.id} store={store} expanded={expanded === store.id} onToggle={() => setExpanded(expanded === store.id ? null : store.id)} />)}
          {!filtered.length && <div className="weather-empty">Không có cửa hàng phù hợp bộ lọc.</div>}
        </div>
      )}

      <div className="weather-source">Dữ liệu từ <a href="https://api.met.no/" target="_blank" rel="noreferrer">MET Norway</a>. Dự báo mang tính tham khảo theo ô lưới khí tượng.</div>
    </section>
  );
}
