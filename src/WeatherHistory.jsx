import { useEffect, useMemo, useState } from "react";
import { getSession, supabase } from "./supabase.js";

function vietnamDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function displayDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(`${value}T12:00:00+07:00`));
}

function metric(value, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function StoreHistory({ store, expanded, onToggle }) {
  const wet = store.hadRain;
  const tone = store.error ? "#94a3b8" : wet ? "#38bdf8" : "#4ade80";
  return (
    <article className="history-store" style={{ borderColor: `${tone}55` }}>
      <button className="history-store-main" onClick={onToggle} aria-expanded={expanded}>
        <div className="history-store-name">
          <div><span style={{ background: tone }} /><strong>{store.name}</strong><em style={{ color: tone }}>{store.error ? "Thiếu dữ liệu" : wet ? "Có mưa" : "Không mưa"}</em></div>
          <small>{store.region} · {store.address}</small>
        </div>
        <div className="history-metric"><span>Mưa 08–21h</span><strong style={{ color: wet ? "#7dd3fc" : "#e2e8f0" }}>{metric(store.rainTotal, " mm")}</strong></div>
        <div className="history-metric"><span>Số giờ có mưa</span><strong>{store.error ? "—" : `${store.rainHours}/14 giờ`}</strong></div>
        <div className="history-metric"><span>Mưa cao nhất</span><strong>{store.error ? "—" : `${store.peakRain} mm · ${store.peakRainHour}`}</strong></div>
        <b className="history-toggle">{expanded ? "−" : "+"}</b>
      </button>
      {expanded && (
        <div className="history-detail">
          {store.error ? <div className="history-inline-error">{store.error}</div> : <>
            <div className="history-hours">
              {store.hourly.map((hour) => (
                <div className={`history-hour ${hour.rain > 0 ? "wet" : ""}`} key={hour.time}>
                  <span>{String(hour.localHour).padStart(2, "0")}:00</span>
                  <b>{hour.icon}</b>
                  <strong>{metric(hour.temp, "°")}</strong>
                  <em>{metric(hour.rain, " mm")}</em>
                </div>
              ))}
            </div>
            <div className="history-detail-footer">
              <span>Giờ ghi nhận có mưa: {store.rainHourLabels.length ? store.rainHourLabels.join(", ") : "Không có"}</span>
              <span>Ô dữ liệu: {store.sourceGrid.lat}, {store.sourceGrid.lon}</span>
              <a href={store.mapUrl} target="_blank" rel="noreferrer">Mở Google Maps ↗</a>
            </div>
          </>}
        </div>
      )}
    </article>
  );
}

export default function WeatherHistory() {
  const yesterday = addDays(vietnamDate(), -1);
  const [date, setDate] = useState(yesterday);
  const [loadedDate, setLoadedDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [rainFilter, setRainFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [meta, setMeta] = useState(null);

  async function loadHistory() {
    setLoading(true);
    setError("");
    setExpanded(null);
    try {
      let session = await getSession();
      let token = session?.access_token;
      if (!token) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const path = `/api/weather-history?date=${encodeURIComponent(date)}`;
      let response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) {
        const { data } = await supabase.auth.refreshSession();
        session = data?.session;
        token = session?.access_token;
        if (token) response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải lịch sử thời tiết.");
      setRows(payload.stores || []);
      setLoadedDate(payload.date);
      setMeta(payload);
    } catch (err) {
      setRows([]);
      setMeta(null);
      setError(err?.message || "Không thể tải lịch sử thời tiết.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  const regions = useMemo(() => [...new Set(rows.map((row) => row.region))].sort((a, b) => a.localeCompare(b, "vi")), [rows]);
  const completeRows = useMemo(() => rows.filter((row) => !row.error), [rows]);
  const summary = useMemo(() => ({
    total: rows.length,
    wet: completeRows.filter((row) => row.hadRain).length,
    rainHours: completeRows.reduce((sum, row) => sum + row.rainHours, 0),
    peak: completeRows.reduce((best, row) => !best || row.peakRain > best.peakRain ? row : best, null),
  }), [rows, completeRows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return rows
      .filter((row) => region === "all" || row.region === region)
      .filter((row) => rainFilter === "all" || (rainFilter === "rain" ? row.hadRain : !row.hadRain && !row.error))
      .filter((row) => !needle || `${row.name} ${row.region} ${row.address}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(needle))
      .sort((a, b) => Number(Boolean(b.hadRain)) - Number(Boolean(a.hadRain)) || (b.rainTotal || 0) - (a.rainTotal || 0) || a.region.localeCompare(b.region, "vi") || a.name.localeCompare(b.name, "vi"));
  }, [rows, region, rainFilter, search]);

  function exportCsv() {
    const headers = ["Ngày", "Cửa hàng", "Tỉnh/TP", "Địa chỉ", "Có mưa", "Tổng mưa 08-21h (mm)", "Số giờ mưa", "Các giờ có mưa", "Mưa cao nhất (mm)", "Giờ mưa cao nhất", "Nhiệt độ cao nhất (°C)", "Gió mạnh nhất (m/s)", "Nguồn", "Mô hình", "Loại dữ liệu"];
    const lines = [headers, ...filtered.filter((row) => !row.error).map((row) => [
      loadedDate, row.name, row.region, row.address, row.hadRain ? "Có" : "Không", row.rainTotal, row.rainHours,
      row.rainHourLabels.join(", "), row.peakRain, row.peakRainHour, row.maxTemp, row.maxWind,
      meta?.source, meta?.model, "Tái phân tích lịch sử",
    ])].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `santhai-lich-su-mua-${loadedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="history-page">
      <style>{`
        .history-page{display:flex;flex-direction:column;gap:16px}.history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.history-head h2{font-size:22px;margin:0 0 5px;color:#f8fafc}.history-head p{font-size:12px;margin:0;color:#64748b}.history-actions{display:flex;gap:8px;align-items:center}.history-actions input,.history-filter input,.history-filter select{box-sizing:border-box;background:#101b2c;border:1px solid rgba(255,255,255,.09);border-radius:8px;color:#dbeafe;padding:9px 11px;font:400 12px Lexend,sans-serif;outline:none}.history-button{border:1px solid rgba(125,211,252,.28);background:rgba(56,189,248,.09);color:#7dd3fc;border-radius:9px;padding:9px 13px;font:500 12px Lexend,sans-serif;cursor:pointer;white-space:nowrap}.history-button.secondary{color:#cbd5e1;border-color:rgba(203,213,225,.18);background:rgba(255,255,255,.035)}.history-button:disabled{opacity:.5;cursor:default}.history-notice{border:1px solid rgba(56,189,248,.16);background:rgba(14,165,233,.055);border-radius:11px;padding:10px 13px;color:#7890a8;font-size:11px;line-height:1.55}.history-notice strong{color:#7dd3fc}.history-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.history-summary>div{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 16px}.history-summary span{display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.07em}.history-summary strong{display:block;font-size:24px;color:#e2e8f0;margin-top:5px}.history-filter{display:grid;grid-template-columns:minmax(220px,1fr) 210px 170px;gap:9px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:10px}.history-list{display:flex;flex-direction:column;gap:8px}.history-store{background:rgba(255,255,255,.03);border:1px solid;border-radius:12px;overflow:hidden}.history-store-main{width:100%;display:grid;grid-template-columns:minmax(280px,1.5fr) 130px 120px 170px 20px;gap:12px;align-items:center;padding:13px 15px;background:transparent;border:0;color:inherit;text-align:left;font-family:inherit;cursor:pointer}.history-store-name>div{display:flex;align-items:center;gap:8px}.history-store-name>div>span{width:8px;height:8px;border-radius:50%;box-shadow:0 0 10px currentColor}.history-store-name strong{font-size:14px;color:#e2e8f0}.history-store-name em{font-style:normal;font-size:9px;text-transform:uppercase;background:rgba(255,255,255,.05);padding:3px 7px;border-radius:99px}.history-store-name small{display:block;color:#526275;font-size:10px;margin:5px 0 0 16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.history-metric span{display:block;font-size:9px;color:#526275;text-transform:uppercase}.history-metric strong{display:block;margin-top:3px;font-size:12px;color:#e2e8f0}.history-toggle{font-size:19px;color:#64748b}.history-detail{border-top:1px solid rgba(255,255,255,.06);padding:12px 15px 14px;background:rgba(2,6,23,.2)}.history-hours{display:grid;grid-template-columns:repeat(14,minmax(58px,1fr));gap:5px;overflow-x:auto;padding-bottom:4px}.history-hour{min-width:55px;background:rgba(255,255,255,.035);border:1px solid transparent;border-radius:8px;padding:7px 5px;text-align:center;display:flex;flex-direction:column;gap:4px}.history-hour.wet{background:rgba(14,165,233,.08);border-color:rgba(56,189,248,.2)}.history-hour span{font-size:9px;color:#64748b}.history-hour b{font-size:17px}.history-hour strong{font-size:11px;color:#e2e8f0}.history-hour em{font-size:9px;color:#7dd3fc;font-style:normal}.history-detail-footer{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:10px;color:#526275}.history-detail-footer a{color:#7dd3fc;text-decoration:none}.history-loading,.history-error,.history-empty{padding:36px 18px;text-align:center;border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(255,255,255,.025);color:#64748b;font-size:13px}.history-error{color:#fda4af;border-color:rgba(244,63,94,.25)}.history-source{text-align:right;color:#3f5064;font-size:10px}.history-source a{color:#526a84}@media(max-width:1000px){.history-summary{grid-template-columns:repeat(2,1fr)}.history-store-main{grid-template-columns:minmax(220px,1fr) repeat(2,120px) 20px}.history-store-main>.history-metric:nth-of-type(4){grid-column:2/4}.history-filter{grid-template-columns:1fr 1fr}.history-filter input{grid-column:1/-1}}@media(max-width:650px){.history-head{flex-direction:column}.history-actions{width:100%;flex-wrap:wrap}.history-actions input{flex:1}.history-summary{grid-template-columns:repeat(2,1fr)}.history-filter{grid-template-columns:1fr}.history-filter input{grid-column:auto}.history-store-main{grid-template-columns:1fr auto 20px}.history-store-main>.history-metric{grid-column:auto}.history-store-main>.history-metric:nth-of-type(3),.history-store-main>.history-metric:nth-of-type(4){display:none}.history-store-name small{white-space:normal}.history-notice{font-size:10px}}
      `}</style>

      <div className="history-head">
        <div><h2>Lịch sử thời tiết</h2><p>{loadedDate ? `${displayDate(loadedDate)} · khung hoạt động 08:00–21:00` : "Tra cứu thời tiết của ngày đã kết thúc"}</p></div>
        <div className="history-actions">
          <input type="date" min="2017-01-01" max={yesterday} value={date} onChange={(event) => setDate(event.target.value)} aria-label="Ngày lịch sử" />
          <button className="history-button" onClick={loadHistory} disabled={loading}>{loading ? "Đang tải…" : "Xem dữ liệu"}</button>
          <button className="history-button secondary" onClick={exportCsv} disabled={!filtered.length || loading}>Xuất CSV</button>
        </div>
      </div>

      <div className="history-notice"><strong>Nguồn độc lập với dữ liệu dự báo trên web.</strong> Đây là dữ liệu tái phân tích lịch sử ECMWF IFS theo ô khí tượng khoảng 9 km, không phải số đo trực tiếp tại cửa hàng. Plus Code và dữ liệu feedback chỉ được đọc, không bị chỉnh sửa.</div>

      <div className="history-summary">
        <div><span>Tổng cửa hàng</span><strong>{rows.length || "—"}</strong></div>
        <div><span>Cửa hàng có mưa</span><strong style={{ color: "#7dd3fc" }}>{summary.wet}</strong></div>
        <div><span>Tổng lượt giờ mưa</span><strong>{summary.rainHours}</strong></div>
        <div><span>Mưa giờ cao nhất</span><strong style={{ color: "#fbbf24" }}>{summary.peak ? `${summary.peak.peakRain} mm` : "—"}</strong></div>
      </div>

      <div className="history-filter">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm cửa hàng, tỉnh hoặc địa chỉ…" aria-label="Tìm cửa hàng" />
        <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Lọc tỉnh"><option value="all">Tất cả tỉnh ({rows.length})</option>{regions.map((item) => <option value={item} key={item}>{item}</option>)}</select>
        <select value={rainFilter} onChange={(event) => setRainFilter(event.target.value)} aria-label="Lọc tình trạng mưa"><option value="all">Tất cả tình trạng</option><option value="rain">Có mưa</option><option value="dry">Không mưa</option></select>
      </div>

      {loading && <div className="history-loading">Đang truy xuất dữ liệu lịch sử từ nguồn khí tượng…</div>}
      {!loading && error && <div className="history-error">{error}<br/><button className="history-button" style={{ marginTop: 12 }} onClick={loadHistory}>Thử lại</button></div>}
      {!loading && !error && <div className="history-list">{filtered.map((store) => <StoreHistory key={store.id} store={store} expanded={expanded === store.id} onToggle={() => setExpanded(expanded === store.id ? null : store.id)} />)}{!filtered.length && <div className="history-empty">Không có cửa hàng phù hợp bộ lọc.</div>}</div>}

      <div className="history-source">Nguồn: <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">Open-Meteo Historical Weather</a> · Mô hình ECMWF IFS · dữ liệu tái phân tích theo giờ.</div>
    </section>
  );
}
