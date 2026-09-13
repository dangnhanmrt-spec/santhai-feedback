import { ACTIVE_WEATHER_STORES } from "../src/weatherStores.js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/supabaseConfig.js";

const SUPER_ADMIN = "dangnhan.mrt@gmail.com";
const HISTORY_SOURCE_URL = "https://archive-api.open-meteo.com/v1/archive";
const HISTORY_MODEL = "ecmwf_ifs";
const USER_AGENT = "SanThaiWeatherHistory/1.0 trasuasanthai.com";
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const FIRST_SUPPORTED_DATE = "2017-01-01";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT = 45000;
const BATCH_SIZE = 18;
const historyCache = new Map();

async function authorize(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  if (!user?.email) return null;

  const email = user.email.toLowerCase().trim();
  if (email === SUPER_ADMIN) return { email: user.email, role: "super_admin" };

  const query = new URLSearchParams({ select: "role", email: `eq.${email}`, limit: "1" });
  const accessResponse = await fetch(`${SUPABASE_URL}/rest/v1/allowed_emails?${query}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!accessResponse.ok) return null;
  const rows = await accessResponse.json();
  return rows?.[0]?.role ? { email: user.email, role: rows[0].role } : null;
}

function dateInVietnam(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function validateHistoryDate(value, today = dateInVietnam()) {
  const date = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ngày tra cứu không hợp lệ.");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("Ngày tra cứu không tồn tại.");
  if (date < FIRST_SUPPORTED_DATE) throw new Error(`Dữ liệu thử nghiệm hỗ trợ từ ${FIRST_SUPPORTED_DATE}.`);
  if (date >= today) throw new Error("Lịch sử chỉ cho phép xem ngày đã kết thúc tại Việt Nam.");
  return date;
}

function number(value, digits = 1) {
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
}

function conditionFor(code, rain) {
  const value = Number(code);
  if (value >= 95) return { label: "Mưa giông", icon: "⛈️" };
  if ([65, 67, 82].includes(value) || rain >= 8) return { label: "Mưa lớn", icon: "🌧️" };
  if (value >= 80 && value <= 82) return { label: "Mưa rào", icon: "🌦️" };
  if ((value >= 51 && value <= 67) || rain > 0) return { label: "Có mưa", icon: "🌦️" };
  if (value === 45 || value === 48) return { label: "Sương mù", icon: "🌫️" };
  if (value === 3) return { label: "Nhiều mây", icon: "☁️" };
  if (value === 2) return { label: "Mây rải rác", icon: "⛅" };
  if (value === 1) return { label: "Ít mây", icon: "🌤️" };
  if (value === 0) return { label: "Trời quang", icon: "☀️" };
  return { label: "Không xác định", icon: "🌡️" };
}

function pickStore(store) {
  return {
    id: store.id,
    name: store.n,
    region: store.r,
    address: store.a,
    mapUrl: store.m,
    plusCode: store.pc,
    coordinateSource: store.point.source,
    requestedLat: number(store.point.lat, 5),
    requestedLon: number(store.point.lon, 5),
  };
}

export function summarizeHistory(store, payload, date) {
  const hourly = payload?.hourly || {};
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  if (!times.length) throw new Error("Nguồn lịch sử không trả dữ liệu theo giờ.");

  const hours = times.map((time, index) => {
    const localHour = Number(String(time).slice(11, 13));
    const rain = number(hourly.rain?.[index] ?? hourly.precipitation?.[index] ?? 0);
    const condition = conditionFor(hourly.weather_code?.[index], rain || 0);
    return {
      time,
      localHour,
      rain,
      temp: number(hourly.temperature_2m?.[index]),
      wind: number(hourly.wind_speed_10m?.[index]),
      gust: number(hourly.wind_gusts_10m?.[index]),
      condition: condition.label,
      icon: condition.icon,
    };
  }).filter((hour) => hour.localHour >= 8 && hour.localHour <= 21);

  if (hours.length !== 14) throw new Error("Nguồn lịch sử chưa trả đủ 14 mốc giờ từ 08:00 đến 21:00.");

  const wetHours = hours.filter((hour) => (hour.rain || 0) > 0);
  const peak = hours.reduce((best, hour) => (hour.rain || 0) > (best.rain || 0) ? hour : best, hours[0]);
  const maxTemp = Math.max(...hours.map((hour) => hour.temp).filter(Number.isFinite));
  const maxWind = Math.max(...hours.flatMap((hour) => [hour.wind, hour.gust]).filter(Number.isFinite));

  return {
    ...pickStore(store),
    date,
    hadRain: wetHours.length > 0,
    rainTotal: number(hours.reduce((sum, hour) => sum + (hour.rain || 0), 0)),
    rainHours: wetHours.length,
    rainHourLabels: wetHours.map((hour) => `${String(hour.localHour).padStart(2, "0")}:00`),
    peakRain: number(peak.rain || 0),
    peakRainHour: `${String(peak.localHour).padStart(2, "0")}:00`,
    maxTemp: Number.isFinite(maxTemp) ? number(maxTemp) : null,
    maxWind: Number.isFinite(maxWind) ? number(maxWind) : null,
    hourly: hours,
    sourceGrid: {
      lat: number(payload?.latitude, 5),
      lon: number(payload?.longitude, 5),
      elevation: number(payload?.elevation, 0),
    },
  };
}

async function fetchHistoryBatch(stores, date) {
  const url = new URL(HISTORY_SOURCE_URL);
  url.searchParams.set("latitude", stores.map((store) => store.point.lat.toFixed(4)).join(","));
  url.searchParams.set("longitude", stores.map((store) => store.point.lon.toFixed(4)).join(","));
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  url.searchParams.set("hourly", "temperature_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m");
  url.searchParams.set("timezone", TIME_ZONE);
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("models", HISTORY_MODEL);

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(REQUEST_TIMEOUT) : undefined,
  });
  if (!response.ok) throw new Error(`Open-Meteo Historical trả mã ${response.status}`);
  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : [payload];

  return stores.map((store, index) => {
    try {
      return summarizeHistory(store, items[index], date);
    } catch (error) {
      return { ...pickStore(store), date, error: error.message, hourly: [] };
    }
  });
}

async function fetchHistory(stores, date) {
  const batches = [];
  for (let index = 0; index < stores.length; index += BATCH_SIZE) batches.push(stores.slice(index, index + BATCH_SIZE));
  const results = await Promise.all(batches.map(async (batch) => {
    try {
      return await fetchHistoryBatch(batch, date);
    } catch (error) {
      return batch.map((store) => ({ ...pickStore(store), date, error: error.message, hourly: [] }));
    }
  }));
  return results.flat();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Chỉ hỗ trợ GET." });
  }

  try {
    const identity = await authorize(req);
    if (!identity) return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc email chưa được cấp quyền." });

    const today = dateInVietnam();
    const date = validateHistoryDate(req.query.date || addDays(today, -1), today);
    const requestedRegion = String(req.query.region || "").trim().toUpperCase();
    const requestedStore = String(req.query.store || "").trim();
    const stores = ACTIVE_WEATHER_STORES
      .filter((store) => !requestedRegion || store.r === requestedRegion)
      .filter((store) => !requestedStore || store.id === requestedStore);
    if (!stores.length) return res.status(404).json({ error: "Không tìm thấy cửa hàng phù hợp." });

    const cacheKey = `${date}|${requestedRegion}|${requestedStore}`;
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("Vary", "Authorization");
      return res.status(200).json({ ...cached.value, cached: true, role: identity.role });
    }

    const storesWithHistory = await fetchHistory(stores, date);
    const complete = storesWithHistory.filter((row) => !row.error);
    const value = {
      generatedAt: new Date().toISOString(),
      date,
      total: storesWithHistory.length,
      complete: complete.length,
      stores: storesWithHistory,
      source: "Open-Meteo Historical Weather",
      model: "ECMWF IFS",
      resolution: "9 km",
      dataType: "historical_reanalysis",
      timeZone: TIME_ZONE,
      operationWindow: "08:00–21:00",
      notice: "Dữ liệu tái phân tích theo ô khí tượng, không phải số đo trực tiếp tại cửa hàng.",
    };
    historyCache.set(cacheKey, { cachedAt: Date.now(), value });

    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Vary", "Authorization");
    return res.status(200).json({ ...value, cached: false, role: identity.role });
  } catch (error) {
    const message = error?.message || "Không thể tải lịch sử thời tiết.";
    const status = message.includes("Ngày") || message.includes("hỗ trợ") || message.includes("Lịch sử") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
}
