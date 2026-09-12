import { ACTIVE_WEATHER_STORES } from "../src/weatherStores.js";

const SUPABASE_URL = "https://stxymyjwxdtfxkvmsgmz.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoic3R4eW15and4ZHRmeGt2bXNnbXoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3Njg3ODg4MiwiZXhwIjoyMDkyNDU0ODgyfQ.dxF-84q5CSoT21b__zq8XgUfyRuSAwIov9PL269WWm4";
const SOURCE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const USER_AGENT = "SanThaiWeather/1.0 trasuasanthai.com";
const CACHE_TTL = 25 * 60 * 1000;
const pointCache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function authorize(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  if (!user?.email) return null;

  const query = new URLSearchParams({ select: "role", email: `eq.${user.email.toLowerCase()}`, limit: "1" });
  const accessResponse = await fetch(`${SUPABASE_URL}/rest/v1/allowed_emails?${query}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!accessResponse.ok) return null;
  const rows = await accessResponse.json();
  return rows?.[0]?.role ? { email: user.email, role: rows[0].role } : null;
}

function describeSymbol(code = "") {
  const value = code.toLowerCase();
  if (value.includes("thunder")) return "Mưa giông";
  if (value.includes("heavyrain")) return "Mưa lớn";
  if (value.includes("rainshowers")) return "Mưa rào";
  if (value.includes("rain")) return "Có mưa";
  if (value.includes("fog")) return "Sương mù";
  if (value.includes("cloudy")) return value.includes("partly") ? "Mây rải rác" : "Nhiều mây";
  if (value.includes("fair")) return "Ít mây";
  if (value.includes("clearsky")) return "Trời quang";
  return "Chưa xác định";
}

function iconFor(code = "") {
  const value = code.toLowerCase();
  if (value.includes("thunder")) return "⛈️";
  if (value.includes("heavyrain")) return "🌧️";
  if (value.includes("rain")) return "🌦️";
  if (value.includes("fog")) return "🌫️";
  if (value.includes("cloudy")) return "☁️";
  if (value.includes("fair")) return "🌤️";
  if (value.includes("clearsky")) return "☀️";
  return "🌡️";
}

function number(value, digits = 1) {
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
}

function vietnamDateHour(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function addDays(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function operationDate(value = new Date()) {
  const local = vietnamDateHour(value);
  return local.hour >= 21 ? addDays(local.date, 1) : local.date;
}

function parseForecast(store, payload) {
  const series = payload?.properties?.timeseries || [];
  if (!series.length) throw new Error("Nguồn thời tiết không trả dữ liệu.");

  const hours = series.slice(0, 48).map((entry) => {
    const instant = entry.data?.instant?.details || {};
    const one = entry.data?.next_1_hours || {};
    const six = entry.data?.next_6_hours || {};
    const symbol = one.summary?.symbol_code || six.summary?.symbol_code || "";
    const local = vietnamDateHour(entry.time);
    return {
      time: entry.time,
      localDate: local.date,
      localHour: local.hour,
      temp: number(instant.air_temperature),
      humidity: number(instant.relative_humidity, 0),
      wind: number(instant.wind_speed),
      gust: number(instant.wind_speed_of_gust),
      rain: number(one.details?.precipitation_amount || 0),
      rainProbability: number(one.details?.probability_of_precipitation, 0),
      symbol,
      condition: describeSymbol(symbol),
      icon: iconFor(symbol),
    };
  });

  const targetDate = operationDate();
  let operationHours = hours.filter((hour) => hour.localDate === targetDate && hour.localHour >= 8 && hour.localHour <= 21);
  if (!operationHours.length) {
    const firstAvailable = hours.find((hour) => hour.localHour >= 8 && hour.localHour <= 21);
    operationHours = firstAvailable
      ? hours.filter((hour) => hour.localDate === firstAvailable.localDate && hour.localHour >= 8 && hour.localHour <= 21)
      : hours.slice(0, 12);
  }

  const current = operationHours[0] || hours[0];
  const rainInWindow = number(operationHours.reduce((sum, hour) => sum + (hour.rain || 0), 0));
  const maxRainHour = Math.max(0, ...operationHours.map((hour) => hour.rain || 0));
  const availableProbabilities = operationHours.map((hour) => hour.rainProbability).filter((v) => v !== null);
  const rainProbability = availableProbabilities.length ? Math.max(...availableProbabilities) : null;
  const maxWind = number(Math.max(0, ...operationHours.map((hour) => Math.max(hour.wind || 0, hour.gust || 0))));
  const maxTemp = number(Math.max(...operationHours.map((hour) => hour.temp ?? -99)));
  const hasThunder = operationHours.some((hour) => hour.symbol.includes("thunder"));
  const hasRain = operationHours.some((hour) => hour.symbol.includes("rain"));

  let risk = "low";
  let reason = "Điều kiện ổn định trong khung 08–21h";
  if (hasThunder || rainInWindow >= 20 || maxRainHour >= 8 || maxWind >= 15) {
    risk = "high";
    reason = hasThunder ? "Có khả năng mưa giông trong khung 08–21h" : rainInWindow >= 20 ? "Mưa lớn trong khung 08–21h" : "Gió mạnh hoặc mưa lớn cục bộ trong khung 08–21h";
  } else if (rainInWindow >= 5 || maxRainHour >= 2 || (rainProbability !== null && rainProbability >= 65) || hasRain || maxTemp >= 35 || maxWind >= 9) {
    risk = "medium";
    reason = rainInWindow >= 5 || hasRain ? "Có mưa trong khung 08–21h" : maxTemp >= 35 ? "Nắng nóng trong khung 08–21h" : "Gió mạnh cần lưu ý trong khung 08–21h";
  }

  const operationWindow = {
    label: "08:00–21:00",
    date: current.localDate || targetDate,
    startTime: operationHours[0]?.time || null,
    endTime: operationHours.at(-1)?.time || null,
    rain: rainInWindow,
    rainProbability,
    maxWind,
    maxTemp,
  };

  return {
    id: store.id,
    name: store.n,
    region: store.r,
    address: store.a,
    mapUrl: store.m,
    plusCode: store.pc,
    coordinateSource: store.point.source,
    lat: number(store.point.lat, 5),
    lon: number(store.point.lon, 5),
    risk,
    reason,
    current,
    operationWindow,
    next6h: operationWindow,
    hourly: operationHours,
    sourceUpdatedAt: payload?.properties?.meta?.updated_at || null,
  };
}

async function fetchStoreWeather(store) {
  const key = `${store.point.lat.toFixed(4)},${store.point.lon.toFixed(4)},${operationDate()}`;
  const cached = pointCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return { ...cached.value, ...pickStore(store) };

  const url = new URL(SOURCE_URL);
  url.searchParams.set("lat", store.point.lat.toFixed(4));
  url.searchParams.set("lon", store.point.lon.toFixed(4));

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
  });
  if (!response.ok) throw new Error(`MET Norway trả mã ${response.status}`);
  const value = parseForecast(store, await response.json());
  pointCache.set(key, { cachedAt: Date.now(), value });
  return value;
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
  };
}

async function fetchInBatches(stores) {
  const results = [];
  for (let index = 0; index < stores.length; index += 8) {
    const batch = stores.slice(index, index + 8);
    const rows = await Promise.all(batch.map(async (store) => {
      try {
        return await fetchStoreWeather(store);
      } catch (error) {
        return { ...pickStore(store), risk: "unknown", error: error.message, hourly: [] };
      }
    }));
    results.push(...rows);
    if (index + 8 < stores.length) await sleep(300);
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Chỉ hỗ trợ GET." });
  }

  try {
    const identity = await authorize(req);
    if (!identity) return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc email chưa được cấp quyền." });

    const requestedRegion = String(req.query.region || "").trim().toUpperCase();
    const stores = requestedRegion
      ? ACTIVE_WEATHER_STORES.filter((store) => store.r === requestedRegion)
      : ACTIVE_WEATHER_STORES;

    const weather = await fetchInBatches(stores);
    const complete = weather.filter((row) => !row.error);
    const latestSource = complete.map((row) => row.sourceUpdatedAt).filter(Boolean).sort().at(-1) || null;

    res.setHeader("Cache-Control", "private, max-age=120");
    res.setHeader("Vary", "Authorization");
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      sourceUpdatedAt: latestSource,
      total: weather.length,
      role: identity.role,
      stores: weather,
      source: "MET Norway",
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Không thể tải dữ liệu thời tiết." });
  }
}
