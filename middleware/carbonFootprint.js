import { co2 } from '@tgwf/co2';

// Measures how much data every API request / response transfers and estimates the
// CO2 it causes, using the Sustainable Web Design model from CO2.js.
//
// .env settings (all optional):
//   GREEN_HOST=true     set to "true" if your server runs on a green (renewable) host
//   CARBON_LOG=false    set to "false" to stop the one-line log per request
//
// Totals are kept in memory and can be read by an admin at GET /api/carbon.
// They reset when the server restarts.

const estimator = new co2({ model: 'swd' });

// .env is read when a request comes in (not when this file is imported),
// because dotenv.config() in index.js runs after the imports
const isGreenHost = () => process.env.GREEN_HOST === 'true';
const logEnabled = () => process.env.CARBON_LOG !== 'false';

const stats = {
  since: new Date(),
  requests: 0,
  requestBytes: 0,
  responseBytes: 0,
  gramsCO2: 0,
};
const byRoute = new Map(); // "GET /api/circulars" -> { requests, bytes, gramsCO2 }

const byteLength = (chunk, encoding) => {
  if (!chunk || typeof chunk === 'function') return 0;
  if (typeof chunk === 'string') {
    return Buffer.byteLength(chunk, typeof encoding === 'string' ? encoding : 'utf8');
  }
  return chunk.length ?? 0; // Buffer / Uint8Array
};

// Request line + headers + body (the body size comes from the Content-Length header,
// so it does not matter whether the body parser has run yet)
function requestBytesOf(req) {
  let bytes = Buffer.byteLength(`${req.method} ${req.originalUrl} HTTP/${req.httpVersion}\r\n`);
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    bytes += Buffer.byteLength(req.rawHeaders[i]) + Buffer.byteLength(req.rawHeaders[i + 1]) + 4; // "key: value\r\n"
  }
  return bytes + (Number(req.headers['content-length']) || 0);
}

const formatBytes = (b) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

export function carbonFootprint(req, res, next) {
  // Lets the browser report the real size of our responses to the frontend widget
  // (without this, cross-origin requests show up as 0 bytes there)
  res.setHeader('Timing-Allow-Origin', '*');

  const requestBytes = requestBytesOf(req);
  let bodyBytes = 0;
  let routeKey = 'unmatched';

  const originalWrite = res.write;
  const originalEnd = res.end;

  res.write = function (chunk, encoding) {
    bodyBytes += byteLength(chunk, encoding);
    return originalWrite.apply(this, arguments);
  };

  res.end = function (chunk, encoding) {
    bodyBytes += byteLength(chunk, encoding);
    // the matched route is only known while the handler is running
    if (req.route) routeKey = `${req.method} ${req.baseUrl || ''}${req.route.path}`;
    return originalEnd.apply(this, arguments);
  };

  // "close" fires after the response was sent, or if the client disconnected
  let counted = false;
  res.on('close', () => {
    if (counted) return;
    counted = true;

    const headerBytes = typeof res._header === 'string' ? Buffer.byteLength(res._header) : 0;
    const responseBytes = headerBytes + bodyBytes;
    const totalBytes = requestBytes + responseBytes;
    const grams = estimator.perByte(totalBytes, isGreenHost());

    stats.requests += 1;
    stats.requestBytes += requestBytes;
    stats.responseBytes += responseBytes;
    stats.gramsCO2 += grams;

    const entry = byRoute.get(routeKey) || { requests: 0, bytes: 0, gramsCO2: 0 };
    entry.requests += 1;
    entry.bytes += totalBytes;
    entry.gramsCO2 += grams;
    byRoute.set(routeKey, entry);

    if (logEnabled()) {
      console.log(
        `[carbon] ${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ` +
          `${formatBytes(totalBytes)} -> ${grams.toFixed(6)} g CO2e`
      );
    }
  });

  next();
}

// GET /api/carbon  (admin only, see index.js)
export function getCarbonStats(req, res) {
  const totalBytes = stats.requestBytes + stats.responseBytes;

  const topRoutes = [...byRoute.entries()]
    .map(([route, v]) => ({ route, ...v }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  return res.status(200).json({
    model: 'Sustainable Web Design (CO2.js)',
    greenHost: isGreenHost(),
    since: stats.since,
    requests: stats.requests,
    requestBytes: stats.requestBytes,
    responseBytes: stats.responseBytes,
    totalBytes,
    totalReadable: formatBytes(totalBytes),
    gramsCO2: stats.gramsCO2,
    averageGramsPerRequest: stats.requests ? stats.gramsCO2 / stats.requests : 0,
    topRoutes,
    note: 'Counts API traffic only (not the frontend files), and resets when the server restarts.',
  });
}
