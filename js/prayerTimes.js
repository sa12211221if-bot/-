// Designer OS — Prayer Times via Aladhan API (free, no key needed)
// Caches today's times in store. Geolocation auto-detect or manual city/country.

import { getState, setSetting } from './store.js';

export const PRAYER_METHODS = [
  { value: 4,  key: 'prayer_method_makkah'   }, // Umm Al-Qura
  { value: 5,  key: 'prayer_method_egypt'    },
  { value: 2,  key: 'prayer_method_isna'     },
  { value: 3,  key: 'prayer_method_mwl'      },
  { value: 1,  key: 'prayer_method_karachi'  },
  { value: 8,  key: 'prayer_method_dubai'    },
  { value: 9,  key: 'prayer_method_kuwait'   },
  { value: 10, key: 'prayer_method_qatar'    }
];

export const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const TRACKED = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']; // for "next prayer" countdown

// ============================================================
// Geolocation
// ============================================================

export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { timeout: 10000, maximumAge: 600000 }
    );
  });
}

// ============================================================
// Fetch from Aladhan
// ============================================================

async function fetchByCity(city, country, method = 4) {
  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  const json = await res.json();
  return json.data;
}

async function fetchByCoords(lat, lng, method = 4) {
  const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  const json = await res.json();
  return json.data;
}

// ============================================================
// Public API
// ============================================================

/**
 * Refresh prayer times based on current settings. Caches in store.
 * @param {boolean} force - bypass today-cache check
 */
export async function refreshPrayerTimes(force = false) {
  const s = getState();
  const cached = s.prayerTimes;
  const todayStr = new Date().toDateString();

  if (!force && cached && cached.date === todayStr) {
    return cached;
  }

  let data;
  try {
    if (s.prayerLat && s.prayerLng) {
      data = await fetchByCoords(s.prayerLat, s.prayerLng, s.prayerMethod || 4);
    } else if (s.prayerCity && s.prayerCountry) {
      data = await fetchByCity(s.prayerCity, s.prayerCountry, s.prayerMethod || 4);
    } else {
      return null;
    }
  } catch (e) {
    console.error('Prayer fetch failed:', e);
    return cached || null;
  }

  const timings = data.timings;
  const result = {
    date: todayStr,
    Fajr: timings.Fajr,
    Sunrise: timings.Sunrise,
    Dhuhr: timings.Dhuhr,
    Asr: timings.Asr,
    Maghrib: timings.Maghrib,
    Isha: timings.Isha,
    fetchedAt: Date.now(),
    method: s.prayerMethod || 4,
    location: {
      city: s.prayerCity || data?.meta?.timezone || '',
      country: s.prayerCountry || '',
      lat: s.prayerLat,
      lng: s.prayerLng
    }
  };
  await setSetting('prayerTimes', result);
  return result;
}

/**
 * Auto-detect via geolocation, then refresh.
 */
export async function autoDetectAndRefresh() {
  const loc = await detectLocation();
  await setSetting('prayerLat', loc.lat);
  await setSetting('prayerLng', loc.lng);
  return refreshPrayerTimes(true);
}

/**
 * Set city/country and refresh.
 */
export async function setLocationByCity(city, country) {
  await setSetting('prayerCity', city);
  await setSetting('prayerCountry', country);
  // Clear coords so city takes priority next time
  await setSetting('prayerLat', null);
  await setSetting('prayerLng', null);
  return refreshPrayerTimes(true);
}

/**
 * Find next prayer + minutes until it.
 * Returns: { name, time, msUntil, label } or null if not configured.
 */
export function nextPrayer() {
  const s = getState();
  const p = s.prayerTimes;
  if (!p || p.date !== new Date().toDateString()) return null;

  const now = new Date();
  const candidates = [];
  for (const name of TRACKED) {
    const time = p[name];
    if (!time) continue;
    const [hh, mm] = time.split(':').map(Number);
    const at = new Date();
    at.setHours(hh, mm, 0, 0);
    candidates.push({ name, time, at });
  }

  // Find first prayer whose time hasn't passed
  for (const c of candidates) {
    if (c.at > now) {
      return {
        name: c.name,
        time: c.time,
        at: c.at,
        msUntil: c.at - now,
        passed: false
      };
    }
  }

  // All prayers passed → next is tomorrow's Fajr
  return {
    name: 'Fajr',
    time: p.Fajr,
    at: null,
    msUntil: null,
    passed: true,
    nextDay: true
  };
}

/**
 * Format ms as "HH:mm" countdown text.
 */
export function fmtCountdown(ms) {
  if (ms == null || ms < 0) return '--:--';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Translate a prayer name to localized string.
 */
export function prayerLocaleKey(name) {
  return name.toLowerCase(); // matches i18n keys: fajr, dhuhr, asr, maghrib, isha, sunrise
}

/**
 * Schedule background refresh once per day.
 */
let refreshTimer = null;
export function startBackgroundRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  // Try once now, then every hour (will be no-op if already cached for today)
  refreshPrayerTimes().catch(() => {});
  refreshTimer = setInterval(() => {
    refreshPrayerTimes().catch(() => {});
  }, 60 * 60 * 1000);
}
