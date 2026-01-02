import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.claims.sub));
    
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (dbUser.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    if (dbUser.bannedAt) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    (req as any).adminUser = dbUser;
    next();
  } catch (error) {
    console.error("RBAC check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function checkUserNotBanned(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user || !user.claims?.sub) {
    return next();
  }

  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.claims.sub));
    
    if (dbUser?.bannedAt) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    next();
  } catch (error) {
    console.error("Ban check error:", error);
    next();
  }
}
