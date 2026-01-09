import { RequestHandler } from "express";
import { analyticsStorage } from "../analytics-storage";
import type { InsertUserSession, InsertUserAction } from "@shared/schema";

// Хранилище активных сессий для предотвращения дублирования
const activeSessions = new Map<string, string>();

/**
 * Middleware для отслеживания пользовательских сессий и действий
 */
export const trackAnalytics: RequestHandler = async (req, res, next) => {
  try {
    // Пропускаем API-запросы админки и статические файлы
    if (req.path.startsWith("/api/admin") || req.path.startsWith("/api/csrf-token")) {
      return next();
    }

    const user = (req as any).user;
    const userId = user?.claims?.sub || null;

    // Получаем session ID из cookie или создаем новый
    const sessionId = req.cookies?.["analytics_session"] || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Устанавливаем cookie на 30 минут
    if (!req.cookies?.["analytics_session"]) {
      res.cookie("analytics_session", sessionId, {
        maxAge: 30 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
      });
    }

    // Создаем сессию, если это новая
    if (!activeSessions.has(sessionId)) {
      const userAgent = req.get("user-agent") || "";
      const ip = (req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "");

      // Простой парсинг user agent
      const deviceType = getDeviceType(userAgent);
      const browser = getBrowser(userAgent);
      const os = getOS(userAgent);

      // Получаем UTM параметры
      const utmSource = (req.query.utm_source as string) || null;
      const utmMedium = (req.query.utm_medium as string) || null;
      const utmCampaign = (req.query.utm_campaign as string) || null;

      const sessionData: InsertUserSession = {
        userId,
        sessionId,
        startedAt: new Date(),
        endedAt: null,
        ipAddress: ip,
        country: null,
        countryCode: null,
        city: null,
        region: null,
        latitude: null,
        longitude: null,
        deviceType,
        browser,
        browserVersion: null,
        os,
        osVersion: null,
        referrer: req.get("referer") || null,
        utmSource,
        utmMedium,
        utmCampaign,
      };

      // Асинхронно создаем сессию без блокировки запроса
      analyticsStorage.createSession(sessionData).catch((err) => {
        console.error("Failed to create analytics session:", err);
      });

      activeSessions.set(sessionId, sessionId);

      // Очищаем устаревшие сессии (старше 1 часа)
      setTimeout(() => {
        activeSessions.delete(sessionId);
      }, 60 * 60 * 1000);
    }

    // Отслеживаем действия на API эндпоинтах
    if (req.path.startsWith("/api/")) {
      const actionType = getActionType(req.path, req.method);
      if (actionType) {
        const actionData: InsertUserAction = {
          userId,
          sessionId,
          actionType,
          pageUrl: req.originalUrl,
          targetType: getTargetType(req.path),
          targetId: getTargetId(req.path, req.params),
          metadata: null,
        };

        // Асинхронно создаем действие
        analyticsStorage.createAction(actionData).catch((err) => {
          console.error("Failed to create analytics action:", err);
        });
      }
    }
  } catch (error) {
    // Ошибки аналитики не должны прерывать работу приложения
    console.error("Analytics tracking error:", error);
  }

  next();
};

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android")) return "mobile";
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  return "desktop";
}

function getBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("opera") || ua.includes("opr/")) return "Opera";
  return "Unknown";
}

function getOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  return "Unknown";
}

function getActionType(path: string, method: string): string | null {
  if (path.includes("/projects/") && method === "GET") return "project_view";
  if (path.includes("/favorites") && method === "POST") return "favorite_add";
  if (path.includes("/favorites") && method === "DELETE") return "favorite_remove";
  if (path.includes("/history") && method === "POST") return "project_view";
  if (path.includes("/projects") && method === "GET") return "page_view";
  if (path.includes("/developers/") && method === "GET") return "developer_view";
  if (path.includes("/banks/") && method === "GET") return "bank_view";
  return null;
}

function getTargetType(path: string): string | null {
  if (path.includes("/projects")) return "project";
  if (path.includes("/developers")) return "developer";
  if (path.includes("/banks")) return "bank";
  return null;
}

function getTargetId(path: string, params: any): string | null {
  if (params.id) return params.id;
  if (params.projectId) return params.projectId;
  const match = path.match(/\/(\d+)$/);
  return match ? match[1] : null;
}
