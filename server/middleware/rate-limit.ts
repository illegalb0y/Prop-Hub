import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  routeId: string;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

const globalStore: { [routeId: string]: RateLimitStore } = {};

function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0];
    return ips.trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function rateLimit(config: RateLimitConfig) {
  const { windowMs, max, routeId, message = "Too many requests, please try again later." } = config;
  const keyGenerator = config.keyGenerator || ((req: Request) => getClientIp(req));

  if (!globalStore[routeId]) {
    globalStore[routeId] = {};
  }
  const store = globalStore[routeId];

  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(store)) {
      if (store[key].resetAt < now) {
        delete store[key];
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 1, resetAt: now + windowMs };
    } else {
      store[key].count++;
    }

    res.setHeader("X-RateLimit-Limit", max.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - store[key].count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(store[key].resetAt / 1000).toString());

    if (store[key].count > max) {
      const retryAfter = Math.ceil((store[key].resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      console.log(`Rate limit exceeded: routeId=${routeId}, IP=${key}, count=${store[key].count}`);
      return res.status(429).json({ message, retryAfter });
    }

    next();
  };
}

export const authRateLimit = rateLimit({
  routeId: "auth",
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many authentication attempts, please try again later.",
});

export const projectsRateLimit = rateLimit({
  routeId: "projects-list",
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests, please slow down.",
});

export const projectDetailRateLimit = rateLimit({
  routeId: "project-detail",
  windowMs: 60 * 1000,
  max: 120,
});

export const userActionsRateLimit = rateLimit({
  routeId: "user-actions",
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    const ip = getClientIp(req);
    return user?.claims?.sub ? `user:${user.claims.sub}` : `ip:${ip}`;
  },
});

export const adminRateLimit = rateLimit({
  routeId: "admin",
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    const ip = getClientIp(req);
    return `${user?.claims?.sub || "unknown"}-${ip}`;
  },
});

export const generalApiRateLimit = rateLimit({
  routeId: "general-api",
  windowMs: 60 * 1000,
  max: 100,
});
