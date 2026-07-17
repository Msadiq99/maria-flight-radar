const checks = [
  ['frontend', 'http://127.0.0.1:5175/'],
  ['backend', 'http://127.0.0.1:8081/health'],
  [
    'radar-api',
    'http://127.0.0.1:8081/api/radar/snapshot?lat=24.7136&lon=46.6753&rangeKm=50&mode=auto',
  ],
];

async function check(name, url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json().catch(() => null);
    const suffix =
      name === 'radar-api' ? ` targets=${body?.aircraft?.length ?? 0}` : '';
    console.log(`[MARIA][CHECK] ${name}=ok${suffix}`);
  } catch (error) {
    console.error(`[MARIA][CHECK] ${name}=failed ${error.message}`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
}

for (const [name, url] of checks) await check(name, url);
