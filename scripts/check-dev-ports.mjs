import net from 'node:net';

const ports = [5175, 8081];

function isAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
  });
}

const results = await Promise.all(
  ports.map(async (port) => [port, await isAvailable(port)])
);
const occupied = results
  .filter(([, available]) => !available)
  .map(([port]) => port);

if (occupied.length > 0) {
  for (const port of occupied) {
    console.error(`[MARIA][PREFLIGHT] Port ${port} is already in use.`);
    console.error(
      `[MARIA][PREFLIGHT] Stop the existing process or run: lsof -nP -iTCP:${port} -sTCP:LISTEN`
    );
  }
  process.exitCode = 1;
} else {
  console.log('[MARIA][PREFLIGHT] Ports 5175 and 8081 are available.');
}
