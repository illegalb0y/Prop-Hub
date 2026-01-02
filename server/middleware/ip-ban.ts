import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { ipBans } from "@shared/schema";
import { eq, isNull, or, gt } from "drizzle-orm";

let bannedIpsCache: Set<string> = new Set();
let lastCacheUpdate = 0;
const CACHE_TTL = 60 * 1000;

async function refreshBannedIpsCache() {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL) {
    return;
  }

  try {
    const bans = await db.select().from(ipBans).where(
      or(isNull(ipBans.expiresAt), gt(ipBans.expiresAt, new Date()))
    );
    bannedIpsCache = new Set(bans.map(ban => ban.ip));
    lastCacheUpdate = now;
  } catch (error) {
    console.error("Failed to refresh banned IPs cache:", error);
  }
}

export async function checkIpBan(req: Request, res: Response, next: NextFunction) {
  await refreshBannedIpsCache();

  const clientIp = req.ip || req.socket.remoteAddress || "";
  
  if (bannedIpsCache.has(clientIp)) {
    console.log(`Blocked banned IP: ${clientIp}, path=${req.path}`);
    return res.status(403).json({ message: "Access denied" });
  }

  next();
}

export function invalidateIpBanCache() {
  lastCacheUpdate = 0;
}
