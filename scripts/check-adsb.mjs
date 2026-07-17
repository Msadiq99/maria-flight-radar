const baseUrl = process.env.LOCAL_ADSB_BASE_URL || 'http://127.0.0.1:8080';
const path = process.env.LOCAL_ADSB_AIRCRAFT_PATH || '/data/aircraft.json';
const configuredUrl = new URL(path, baseUrl);
const urls = [
  ...new Set([
    configuredUrl.href,
    'http://127.0.0.1:8080/data/aircraft.json',
    'http://127.0.0.1:30005/data/aircraft.json',
    'http://127.0.0.1:8080/aircraft.json',
  ]),
];

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const body = await response.json();
    if (!body || !Array.isArray(body.aircraft)) return null;
    const withPosition = body.aircraft.filter(
      (aircraft) =>
        Number.isFinite(Number(aircraft.lat)) &&
        Number.isFinite(Number(aircraft.lon))
    );
    const ages = body.aircraft
      .map((aircraft) => Number(aircraft.seen_pos ?? aircraft.seen))
      .filter(Number.isFinite);
    return {
      url,
      format: url.includes('30005') ? 'dump1090/readsb' : 'readsb/dump1090',
      count: body.aircraft.length,
      withPosition: withPosition.length,
      latestAge: ages.length ? Math.min(...ages) : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let result = null;
for (const url of urls) {
  console.log('[MARIA][ADSB] checking=' + url);
  result = await check(url);
  if (result) break;
}

if (!result) {
  console.log('[MARIA][ADSB] receiver not found');
  console.log('[MARIA][ADSB] MARIA will use deterministic simulation fallback');
} else {
  console.log('[MARIA][ADSB] reachable=yes');
  console.log('[MARIA][ADSB] format=' + result.format);
  console.log('[MARIA][ADSB] aircraft=' + result.count);
  console.log('[MARIA][ADSB] with-position=' + result.withPosition);
  console.log(
    '[MARIA][ADSB] latest-age=' +
      (result.latestAge === null ? '—' : result.latestAge + 's')
  );
}
