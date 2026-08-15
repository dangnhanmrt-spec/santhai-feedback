// File này bỏ vào: api/summary.js trong repo santhai-feedback
// Sau khi commit, truy cập tại: https://santhai-feedback.vercel.app/api/summary

const SUPABASE_URL = "https://stxymyjwxdtfxkvmsgmz.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0eHlteWp3eGR0Znhrdm1zZ216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Nzg4ODIsImV4cCI6MjA5MjQ1NDg4Mn0.dxF-84q5CSoT21b__zq8XgUfyRuSAwIov9PL269WWm4";

async function supaFetch(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  try {
    const [feedbacks, stores] = await Promise.all([
      supaFetch("feedbacks", "order=feedback_date.desc"),
      supaFetch("stores", "order=name.asc"),
    ]);

    const storeMap = {};
    stores.forEach((s) => (storeMap[s.id] = s.name));

    const CRITICAL = [
      "Chất lượng sản phẩm",
      "Vật thể lạ trong sản phẩm",
      "Thái độ/chất lượng phục vụ",
    ];

    // --- Theo loại lỗi ---
    const byType = {};
    feedbacks.forEach((f) => {
      byType[f.error_type] = (byType[f.error_type] || 0) + 1;
    });

    // --- Theo cửa hàng ---
    const byStore = {};
    feedbacks.forEach((f) => {
      const name = storeMap[f.store_id] || f.store_id;
      if (!byStore[name]) byStore[name] = { total: 0, critical: 0 };
      byStore[name].total++;
      if (CRITICAL.includes(f.error_type)) byStore[name].critical++;
    });

    // --- Theo tuần (8 tuần gần nhất) ---
    const byWeek = {};
    feedbacks.forEach((f) => {
      const d = new Date(f.feedback_date);
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = mon.toISOString().slice(0, 10);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const fmt = (dt) =>
        `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const label = `${fmt(mon)}–${fmt(sun)}`;
      if (!byWeek[key]) byWeek[key] = { label, total: 0, critical: 0, types: {} };
      byWeek[key].total++;
      if (CRITICAL.includes(f.error_type)) byWeek[key].critical++;
      byWeek[key].types[f.error_type] = (byWeek[key].types[f.error_type] || 0) + 1;
    });
    const weeks = Object.entries(byWeek)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .map(([k, v]) => ({ week_start: k, ...v }));

    // --- 20 feedback gần nhất ---
    const recent = feedbacks.slice(0, 20).map((f) => ({
      date: f.feedback_date,
      store: storeMap[f.store_id] || f.store_id,
      error_type: f.error_type,
      is_critical: CRITICAL.includes(f.error_type),
      note: f.note || "",
      submitted_by: f.submitted_by || "",
    }));

    // --- Top CH mắc lỗi ---
    const topStores = Object.entries(byStore)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([name, data]) => ({ name, ...data }));

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=60");
    return res.status(200).json({
      updated_at: new Date().toISOString(),
      total_feedbacks: feedbacks.length,
      total_critical: feedbacks.filter((f) => CRITICAL.includes(f.error_type)).length,
      total_stores_with_errors: Object.keys(byStore).length,
      by_error_type: byType,
      top_stores: topStores,
      weekly_trend: weeks,
      recent_20: recent,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
