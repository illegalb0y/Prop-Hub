import { Express, Request, Response } from "express";
import { isAuthenticated } from "./replit_integrations/auth";
import { isAdmin } from "./middleware/rbac";
import { adminRateLimit } from "./middleware/rate-limit";
import { adminStorage } from "./admin-storage";
import { storage } from "./storage";
import { invalidateIpBanCache } from "./middleware/ip-ban";
import { paginationSchema, idParamSchema, ipBanSchema, userBanSchema, userActivityFiltersSchema } from "./middleware/validation";
import { z } from "zod";
import multer from "multer";
import { parse } from "csv-parse";
import { Readable } from "stream";
import { developers, cities, districts, banks } from "@shared/schema";
import { db } from "./db"; 

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

async function createAuditLog(req: Request, actionType: string, targetType?: string, targetId?: string, metadata?: any) {
  const adminUser = (req as any).adminUser;
  const ip = req.ip || req.socket.remoteAddress || "";
  
  await adminStorage.createAuditLog({
    adminId: adminUser.id,
    actionType,
    targetType,
    targetId,
    ip,
    metadataJson: metadata,
  });
}

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/dashboard", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const stats = await adminStorage.getDashboardStats();
      const recentAuditLogs = await adminStorage.getAuditLogs(1, 10);
      res.json({ ...stats, recentAuditLogs: recentAuditLogs.data });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/admin/projects", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit, search } = paginationSchema.parse(req.query);
      const projects = await adminStorage.getProjectsForAdmin(page, limit, search);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/admin/projects", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const projectSchema = z.object({
        name: z.string().min(1),
        developerId: z.number(),
        cityId: z.number(),
        districtId: z.number(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        address: z.string().optional().nullable(),
        shortDescription: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        priceFrom: z.number().optional().nullable(),
        currency: z.string().default("USD"),
        completionDate: z.string().datetime().optional().nullable(), // Добавить эту строку
        coverImageUrl: z.string().optional().nullable(), // Добавить эту строку
      });


  app.patch("/api/admin/projects/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const projectSchema = z.object({
        name: z.string().min(1).optional(),
        developerId: z.number().optional(),
        cityId: z.number().optional(),
        districtId: z.number().optional(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        address: z.string().optional().nullable(),
        shortDescription: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        priceFrom: z.number().optional().nullable(),
        currency: z.string().optional(),
        completionDate: z.string().datetime().optional().nullable(), // Добавить эту строку
        coverImageUrl: z.string().optional().nullable(), // Добавить эту строку
      });

      const data = projectSchema.parse(req.body);
      
      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      const updated = await adminStorage.updateProject(id, data);
      await createAuditLog(req, "project_update", "project", id.toString(), data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/admin/projects/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      await adminStorage.softDeleteProject(id);
      await createAuditLog(req, "project_delete", "project", id.toString(), { name: project.name });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post("/api/admin/projects/:id/restore", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      
      await adminStorage.restoreProject(id);
      await createAuditLog(req, "project_restore", "project", id.toString());
      
      res.status(200).json({ message: "Project restored" });
    } catch (error) {
      console.error("Error restoring project:", error);
      res.status(500).json({ message: "Failed to restore project" });
    }
  });

  app.post("/api/admin/projects/import", isAuthenticated, isAdmin, adminRateLimit, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const adminUser = (req as any).adminUser;
      
      const importJob = await adminStorage.createImportJob({
        filename: req.file.originalname,
        status: "processing",
        createdByAdminId: adminUser.id,
      });

      await createAuditLog(req, "csv_import_start", "import_job", importJob.id, { filename: req.file.originalname });

      processCSVImport(req.file.buffer, importJob.id, adminUser.id);

      res.status(202).json({ importJobId: importJob.id, message: "Import started" });
    } catch (error) {
      console.error("Error starting import:", error);
      res.status(500).json({ message: "Failed to start import" });
    }
  });

  app.get("/api/admin/imports", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const imports = await adminStorage.getImportJobs(page, limit);
      res.json(imports);
    } catch (error) {
      console.error("Error fetching imports:", error);
      res.status(500).json({ message: "Failed to fetch imports" });
    }
  });

  app.get("/api/admin/imports/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const job = await adminStorage.getImportJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Import job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching import:", error);
      res.status(500).json({ message: "Failed to fetch import" });
    }
  });

  app.get("/api/admin/imports/:id/errors", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const errors = await adminStorage.getImportJobErrors(req.params.id);
      res.json(errors);
    } catch (error) {
      console.error("Error fetching import errors:", error);
      res.status(500).json({ message: "Failed to fetch import errors" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit, search } = paginationSchema.parse(req.query);
      const users = await adminStorage.getUsers(page, limit, search);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      // Handle the case where the ID is somehow an object (unlikely for :id but good for safety)
      const id = req.params.id;
      if (id === "[object Object]") {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await adminStorage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/admin/users/:id/ban", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { reason } = userBanSchema.parse(req.body);
      const user = await adminStorage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await adminStorage.banUser(req.params.id, reason);
      await createAuditLog(req, "user_ban", "user", req.params.id, { email: user.email, reason });
      
      res.json({ message: "User banned successfully" });
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({ message: "Failed to ban user" });
    }
  });

  app.post("/api/admin/users/:id/unban", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const user = await adminStorage.getUser(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await adminStorage.unbanUser(req.params.id);
      await createAuditLog(req, "user_unban", "user", req.params.id, { email: user.email });
      
      res.json({ message: "User unbanned successfully" });
    } catch (error) {
      console.error("Error unbanning user:", error);
      res.status(500).json({ message: "Failed to unban user" });
    }
  });

  app.post("/api/admin/users/:id/role", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const roleSchema = z.object({ role: z.enum(["user", "admin"]) });
      const { role } = roleSchema.parse(req.body);
      
      await adminStorage.setUserRole(req.params.id, role);
      await createAuditLog(req, "user_role_change", "user", req.params.id, { newRole: role });
      
      res.json({ message: "User role updated" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get("/api/admin/ip-bans", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const bans = await adminStorage.getIpBans(page, limit);
      res.json(bans);
    } catch (error) {
      console.error("Error fetching IP bans:", error);
      res.status(500).json({ message: "Failed to fetch IP bans" });
    }
  });

  app.post("/api/admin/ip-bans", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const data = ipBanSchema.parse(req.body);
      const adminUser = (req as any).adminUser;
      
      const ban = await adminStorage.createIpBan({
        ...data,
        createdByAdminId: adminUser.id,
      });
      
      invalidateIpBanCache();
      await createAuditLog(req, "ip_ban_add", "ip_ban", ban.id, { ip: data.ip, reason: data.reason });
      
      res.status(201).json(ban);
    } catch (error) {
      console.error("Error creating IP ban:", error);
      res.status(500).json({ message: "Failed to create IP ban" });
    }
  });

  app.delete("/api/admin/ip-bans/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      await adminStorage.deleteIpBan(req.params.id);
      invalidateIpBanCache();
      await createAuditLog(req, "ip_ban_remove", "ip_ban", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting IP ban:", error);
      res.status(500).json({ message: "Failed to delete IP ban" });
    }
  });

  app.get("/api/admin/audit-logs", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const filters = userActivityFiltersSchema.parse(req.query);
      const logs = await adminStorage.getAuditLogs(filters.page, filters.limit, {
        userId: filters.userId,
        actionType: filters.actionType,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Developers CRUD
  app.get("/api/admin/developers", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit, search } = paginationSchema.parse(req.query);
      const developers = await adminStorage.getDevelopers(page, limit, search);
      res.json(developers);
    } catch (error) {
      console.error("Error fetching developers:", error);
      res.status(500).json({ message: "Failed to fetch developers" });
    }
  });

  app.post("/api/admin/developers", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const developerSchema = z.object({
        name: z.string().min(1),
        logoUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      });
      const data = developerSchema.parse(req.body);
      const developer = await adminStorage.createDeveloper(data);
      await createAuditLog(req, "developer_create", "developer", developer.id.toString(), { name: data.name });
      res.status(201).json(developer);
    } catch (error) {
      console.error("Error creating developer:", error);
      res.status(500).json({ message: "Failed to create developer" });
    }
  });

  app.patch("/api/admin/developers/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const developerSchema = z.object({
        name: z.string().min(1).optional(),
        logoUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      });
      const data = developerSchema.parse(req.body);
      const developer = await adminStorage.updateDeveloper(id, data);
      await createAuditLog(req, "developer_update", "developer", id.toString(), data);
      res.json(developer);
    } catch (error) {
      console.error("Error updating developer:", error);
      res.status(500).json({ message: "Failed to update developer" });
    }
  });

  app.delete("/api/admin/developers/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await adminStorage.deleteDeveloper(id);
      await createAuditLog(req, "developer_delete", "developer", id.toString());
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting developer:", error);
      res.status(500).json({ message: "Failed to delete developer" });
    }
  });

  app.get("/api/admin/developers/export", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const developers = await adminStorage.getAllDevelopersForExport();
      const csv = convertToCSV(developers, ["id", "name", "logoUrl", "description"]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=developers.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting developers:", error);
      res.status(500).json({ message: "Failed to export developers" });
    }
  });

  // Banks CRUD
  app.get("/api/admin/banks", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit, search } = paginationSchema.parse(req.query);
      const banks = await adminStorage.getBanks(page, limit, search);
      res.json(banks);
    } catch (error) {
      console.error("Error fetching banks:", error);
      res.status(500).json({ message: "Failed to fetch banks" });
    }
  });

  app.post("/api/admin/banks", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const bankSchema = z.object({
        name: z.string().min(1),
        logoUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      });
      const data = bankSchema.parse(req.body);
      const bank = await adminStorage.createBank(data);
      await createAuditLog(req, "bank_create", "bank", bank.id.toString(), { name: data.name });
      res.status(201).json(bank);
    } catch (error) {
      console.error("Error creating bank:", error);
      res.status(500).json({ message: "Failed to create bank" });
    }
  });

  app.patch("/api/admin/banks/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const bankSchema = z.object({
        name: z.string().min(1).optional(),
        logoUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      });
      const data = bankSchema.parse(req.body);
      const bank = await adminStorage.updateBank(id, data);
      await createAuditLog(req, "bank_update", "bank", id.toString(), data);
      res.json(bank);
    } catch (error) {
      console.error("Error updating bank:", error);
      res.status(500).json({ message: "Failed to update bank" });
    }
  });

  app.delete("/api/admin/banks/:id", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await adminStorage.deleteBank(id);
      await createAuditLog(req, "bank_delete", "bank", id.toString());
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bank:", error);
      res.status(500).json({ message: "Failed to delete bank" });
    }
  });

  app.get("/api/admin/banks/export", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const banks = await adminStorage.getAllBanksForExport();
      const csv = convertToCSV(banks, ["id", "name", "logoUrl", "description"]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=banks.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting banks:", error);
      res.status(500).json({ message: "Failed to export banks" });
    }
  });

  // Projects export
  app.get("/api/admin/projects/export", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const projects = await adminStorage.getAllProjectsForExport();
      const csv = convertToCSV(projects, ["id", "name", "developerName", "cityName", "districtName", "address", "priceFrom", "currency", "shortDescription", "completionDate", "coverImageUrl"]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=projects.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting projects:", error);
      res.status(500).json({ message: "Failed to export projects" });
    }
  });

  // Sessions management
  app.get("/api/admin/sessions", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit, search } = paginationSchema.parse(req.query);
      const sessions = await adminStorage.getSessions(page, limit, search);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.delete("/api/admin/sessions/:sid", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { sid } = req.params;
      await adminStorage.deleteSession(sid);
      await createAuditLog(req, "session_terminate", "session", sid);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  app.get("/api/admin/security/stats", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const stats = await adminStorage.getSecurityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching security stats:", error);
      res.status(500).json({ message: "Failed to fetch security stats" });
    }
  });

  // Security analytics
  app.get("/api/admin/security/analytics", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const analytics = await adminStorage.getSecurityAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching security analytics:", error);
      res.status(500).json({ message: "Failed to fetch security analytics" });
    }
  });

  app.get("/api/admin/sessions/analytics", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const analytics = await adminStorage.getSessionAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching session analytics:", error);
      res.status(500).json({ message: "Failed to fetch session analytics" });
    }
  });
  });
}

function convertToCSV(data: any[], columns: string[]): string {
  const header = columns.join(",");
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col];
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

async function processCSVImport(buffer: Buffer, jobId: string, adminId: string) {
  let totalRows = 0;
  let insertedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  try {
    const csvString = buffer.toString("utf-8");
    const records: any[] = [];

    const parser = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for await (const record of parser) {
      records.push(record);
    }

    totalRows = records.length;

    // Предварительно загружаем все справочники для быстрого поиска
    const allDevelopers = await db.select().from(developers);
    const allCities = await db.select().from(cities);
    const allDistricts = await db.select().from(districts);
    const allBanks = await db.select().from(banks);

    // Создаем мапы для быстрого поиска по имени
    const developerMap = new Map(allDevelopers.map(d => [d.name.toLowerCase(), d]));
    const cityMap = new Map(allCities.map(c => [c.name.toLowerCase(), c]));
    const districtMap = new Map(allDistricts.map(d => [d.name.toLowerCase(), d]));
    const bankMap = new Map(allBanks.map(b => [b.name.toLowerCase(), b]));

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Проверяем обязательные поля
        if (!row.name || !row.developer || !row.city || !row.district) {
          throw new Error("Missing required fields: name, developer, city, district");
        }

        // Ищем застройщика
        const developer = developerMap.get(row.developer.toLowerCase().trim());
        if (!developer) {
          throw new Error(`Developer not found: ${row.developer}`);
        }

        // Ищем город
        const city = cityMap.get(row.city.toLowerCase().trim());
        if (!city) {
          throw new Error(`City not found: ${row.city}`);
        }

        // Ищем район
        const district = districtMap.get(row.district.toLowerCase().trim());
        if (!district) {
          throw new Error(`District not found: ${row.district}`);
        }

        // Проверяем, что район принадлежит указанному городу
        if (district.cityId !== city.id) {
          throw new Error(`District ${row.district} does not belong to city ${row.city}`);
        }

        // Парсим дату сдачи
        let completionDate: Date | null = null;
        if (row.completion_date) {
          const dateStr = row.completion_date.trim();
          if (dateStr) {
            // Поддерживаем форматы YYYY-MM-DD и MM/DD/YYYY
            if (dateStr.includes('/')) {
              // MM/DD/YYYY формат
              const [month, day, year] = dateStr.split('/');
              completionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (dateStr.includes('-')) {
              // YYYY-MM-DD формат
              completionDate = new Date(dateStr);
            }

            if (completionDate && isNaN(completionDate.getTime())) {
              throw new Error(`Invalid completion date format: ${row.completion_date}`);
            }
          }
        }

        // Парсим цену
        let priceFrom: number | null = null;
        if (row.price_from) {
          const price = parseFloat(row.price_from.toString().replace(/[^\d.]/g, ''));
          if (!isNaN(price)) {
            priceFrom = Math.round(price);
          }
        }

        // Создаем проект
        const projectData = {
          name: row.name.trim(),
          developerId: developer.id,
          cityId: city.id,
          districtId: district.id,
          latitude: row.latitude ? parseFloat(row.latitude) : null,
          longitude: row.longitude ? parseFloat(row.longitude) : null,
          address: row.address?.trim() || null,
          shortDescription: row.short_description?.trim() || null,
          description: row.description?.trim() || null,
          priceFrom,
          currency: row.currency?.trim() || "USD",
          completionDate,
          coverImageUrl: row.cover_image_url?.trim() || null,
        };

        // Проверяем координаты
        if (projectData.latitude !== null && projectData.longitude !== null) {
          if (projectData.latitude < -90 || projectData.latitude > 90) {
            throw new Error(`Invalid latitude: ${projectData.latitude}`);
          }
          if (projectData.longitude < -180 || projectData.longitude > 180) {
            throw new Error(`Invalid longitude: ${projectData.longitude}`);
          }
        }

        // Создаем проект в базе данных
        const createdProject = await storage.createProject(projectData as any);

        // Обрабатываем банки, если указаны
        if (row.banks && typeof row.banks === 'string') {
          const bankNames = row.banks.split(',').map(name => name.trim().toLowerCase());
          for (const bankName of bankNames) {
            if (bankName) {
              const bank = bankMap.get(bankName);
              if (bank) {
                await storage.addProjectBank(createdProject.id, bank.id);
              } else {
                console.warn(`Bank not found for project ${createdProject.id}: ${bankName}`);
              }
            }
          }
        }

        insertedCount++;

      } catch (error: any) {
        failedCount++;
        await adminStorage.createImportJobError({
          importJobId: jobId,
          rowNumber: (i + 2).toString(), // +2 because of header row and 0-based index
          errorMessage: error.message,
          rawRowJson: row,
        });
        console.error(`Error processing row ${i + 2}:`, error.message);
      }
    }

    await adminStorage.updateImportJob(jobId, {
      status: "completed",
      totalRows: totalRows.toString(),
      insertedCount: insertedCount.toString(),
      updatedCount: updatedCount.toString(),
      failedCount: failedCount.toString(),
      completedAt: new Date(),
    });

    console.log(`CSV import completed: ${insertedCount} inserted, ${failedCount} failed out of ${totalRows} total rows`);

  } catch (error: any) {
    console.error("CSV import failed:", error);
    await adminStorage.updateImportJob(jobId, {
      status: "failed",
      totalRows: totalRows.toString(),
      insertedCount: insertedCount.toString(),
      failedCount: (totalRows - insertedCount).toString(),
      completedAt: new Date(),
    });
  }
}

