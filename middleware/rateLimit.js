// Tiny in-memory rate limiter (no extra dependency).
// Limits POST requests per IP. Good enough for a single free-tier server.
export function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map(); // ip -> { count, resetAt }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
  }, windowMs);
  timer.unref();

  return (req, res, next) => {
    if (req.method !== 'POST') return next();
    const now = Date.now();
    const ip = req.ip;
    const h = hits.get(ip);
    if (!h || h.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    h.count += 1;
    if (h.count > max) {
      res.setHeader('Retry-After', Math.ceil((h.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }
    return next();
  };
}
