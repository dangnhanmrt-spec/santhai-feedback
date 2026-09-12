import { ACTIVE_WEATHER_STORES } from "../src/weatherStores.js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/supabaseConfig.js";

const SUPER_ADMIN = "dangnhan.mrt@gmail.com";
const PRIMARY_SOURCE_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const FALLBACK_SOURCE_URL = "https://api.open-meteo.com/v1/forecast";
const USER_AGENT = "SanThaiWeather/1.0 trasuasanthai.com";
const CACHE_TTL = 25 * 60 * 1000;
const PRIMARY_RETRY_DELAY = 2 * 60 * 1000;
const PRIMARY_TIMEOUT = 20000;
const FALLBACK_TIMEOUT = 25000;
const pointCache = new Map();
let primaryUnavailableUntil = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function summarizeForecast(store, hours, metadata) {
  if (!hours.length) throw new Error("Nguồn thời tiết không trả dữ liệu theo giờ.");

  const targetDate = operationDate();
  const operationHours = hours.filter((hour) => hour.localDate === targetDate && hour.localHour >= 8 && hour.localHour <= 21);
  if (!operationHours.length) throw new Error("Nguồn thời tiết không có dữ liệu trong khung 08:00–21:00.");

  const current = operationHours[0];
  const rainInWindow = number(operationHours.reduce((sum, hour) => sum + (hour.rain || 0), 0));
  const maxRainHour = Math.max(0, ...operationHours.map((hour) => hour.rain || 0));
  const availableProbabilities = operationHours.map((hour) => hour.rainProbability).filter((value) => value !== null);
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
    date: current.localDate,
    startTime: operationHours[0].time,
    endTime: operationHours.at(-1).time,
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
    dataSource: metadata.dataSource,
    fallbackUsed: Boolean(metadata.fallbackUsed),
    sourceUpdatedAt: metadata.sourceUpdatedAt || null,
  };
}

function parseMetForecast(store, payload) {
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

  return summarizeForecast(store, hours, {
    dataSource: "MET Norway",
    sourceUpdatedAt: payload?.properties?.meta?.updated_at || null,
  });
}

function openMeteoSymbol(code, rain) {
  const value = Number(code);
  if (value >= 95) return "thunder";
  if ([65, 67, 82].includes(value) || rain >= 8) return "heavyrain";
  if (value >= 80 && value <= 82) return "rainshowers";
  if ((value >= 51 && value <= 67) || rain > 0) return "rain";
  if (value === 45 || value === 48) return "fog";
  if (value === 3) return "cloudy";
  if (value === 2) return "partlycloudy";
  if (value === 1) return "fair";
  if (value === 0) return "clearsky";
  return "cloudy";
}

function parseOpenMeteoForecast(store, payload) {
  const hourly = payload?.hourly || {};
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const hours = times.map((time, index) => {
    const isoTime = time.endsWith("Z") ? time : `${time}Z`;
    const local = vietnamDateHour(isoTime);
    const rain = number(hourly.precipitation?.[index] || 0);
    const symbol = openMeteoSymbol(hourly.weather_code?.[index], rain || 0);
    return {
      time: isoTime,
      localDate: local.date,
      localHour: local.hour,
      temp: number(hourly.temperature_2m?.[index]),
      humidity: number(hourly.relative_humidity_2m?.[index], 0),
      wind: number(hourly.wind_speed_10m?.[index]),
      gust: number(hourly.wind_gusts_10m?.[index]),
      rain,
      rainProbability: number(hourly.precipitation_probability?.[index], 0),
      symbol,
      condition: describeSymbol(symbol),
      icon: iconFor(symbol),
    };
  });

  return summarizeForecast(store, hours, {
    dataSource: "Open-Meteo · GFS",
    fallbackUsed: true,
  });
}

async function fetchMetForecast(store) {
  const url = new URL(PRIMARY_SOURCE_URL);
  url.searchParams.set("lat", store.point.lat.toFixed(4));
  url.searchParams.set("lon", store.point.lon.toFixed(4));

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(PRIMARY_TIMEOUT) : undefined,
  });
  if (!response.ok) throw new Error(`MET Norway trả mã ${response.status}`);
  return parseMetForecast(store, await response.json());
}

async function fetchOpenMeteoForecast(store) {
  const url = new URL(FALLBACK_SOURCE_URL);
  url.searchParams.set("latitude", store.point.lat.toFixed(4));
  url.searchParams.set("longitude", store.point.lon.toFixed(4));
  url.searchParams.set("hourly", "temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m");
  url.searchParams.set("forecast_hours", "48");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("models", "gfs_seamless");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(FALLBACK_TIMEOUT) : undefined,
  });
  if (!response.ok) throw new Error(`Open-Meteo trả mã ${response.status}`);
  return parseOpenMeteoForecast(store, await response.json());
}

async function fetchStoreWeather(store) {
  const key = `${store.point.lat.toFixed(4)},${store.point.lon.toFixed(4)},${operationDate()}`;
  const cached = pointCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return { ...cached.value, ...pickStore(store) };

  let value;
  let primaryError = null;
  if (Date.now() >= primaryUnavailableUntil) {
    try {
      value = await fetchMetForecast(store);
    } catch (error) {
      primaryError = error;
      primaryUnavailableUntil = Date.now() + PRIMARY_RETRY_DELAY;
    }
  }

  if (!value) {
    try {
      value = await fetchOpenMeteoForecast(store);
    } catch (fallbackError) {
      const primaryMessage = primaryError?.message || "đang trong thời gian chờ thử lại";
      throw new Error(`Không thể tải dự báo. MET Norway: ${primaryMessage}; Open-Meteo: ${fallbackError.message}`);
    }
  }

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
    const sourceCounts = complete.reduce((counts, row) => {
      const source = row.dataSource || "Không xác định";
      counts[source] = (counts[source] || 0) + 1;
      return counts;
    }, {});

    res.setHeader("Cache-Control", "private, max-age=120");
    res.setHeader("Vary", "Authorization");
    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      sourceUpdatedAt: latestSource,
      total: weather.length,
      role: identity.role,
      stores: weather,
      source: "MET Norway",
      fallbackSource: "Open-Meteo · GFS",
      sourceCounts,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Không thể tải dữ liệu thời tiết." });
  }
}
