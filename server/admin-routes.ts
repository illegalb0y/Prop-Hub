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
import { analyticsStorage } from "./analytics-storage"; 

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
      const status = (req.query.status as "active" | "deleted" | "all") || "active";
      const sortBy = (req.query.sortBy as "name" | "createdAt" | "updatedAt") || "updatedAt";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";
      const projects = await adminStorage.getProjectsForAdmin(page, limit, search, status, sortBy, sortOrder);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/admin/projects/bulk-delete", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      const result = await adminStorage.bulkDeleteProjects(ids);
      await createAuditLog(req, "project_bulk_delete", "project", ids.join(","), { ids, result });
      res.json(result);
    } catch (error) {
      console.error("Error bulk deleting projects:", error);
      res.status(500).json({ message: "Failed to bulk delete projects" });
    }
  });

  app.post("/api/admin/projects/bulk-restore", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      const result = await adminStorage.bulkRestoreProjects(ids);
      await createAuditLog(req, "project_bulk_restore", "project", ids.join(","), { ids, result });
      res.json(result);
    } catch (error) {
      console.error("Error bulk restoring projects:", error);
      res.status(500).json({ message: "Failed to bulk restore projects" });
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
        website: z.string().optional().nullable(),
        coverImageUrl: z.string().optional().nullable(),
        priceFrom: z.number().optional().nullable(),
        currency: z.string().default("USD"),
        completionDate: z.string().datetime().optional().nullable(),
        bankIds: z.array(z.number()).optional(),
      });

      const data = projectSchema.parse(req.body);
      const { bankIds, ...projectData } = data;
      const project = await adminStorage.createProject(projectData);

      // Установить связи с банками если указаны
      if (bankIds && bankIds.length > 0) {
        await adminStorage.setProjectBanks(project.id, bankIds);
      }

      await createAuditLog(req, "project_create", "project", project.id.toString(), { name: data.name, bankIds });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
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
        website: z.string().optional().nullable(),
        coverImageUrl: z.string().optional().nullable(),
        priceFrom: z.number().optional().nullable(),
        currency: z.string().optional(),
        completionDate: z.string().datetime().optional().nullable(),
        bankIds: z.array(z.number()).optional(),
      });

      const data = projectSchema.parse(req.body);
      const { bankIds, ...projectData } = data;

      const existingProject = await storage.getProject(id);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }

      const updated = await adminStorage.updateProject(id, projectData);

      // Обновить связи с банками если указаны
      if (bankIds !== undefined) {
        await adminStorage.setProjectBanks(id, bankIds);
      }

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
        entityType: "projects",
        status: "processing",
        createdByAdminId: adminUser.id,
      });

      await createAuditLog(req, "csv_import_start", "import_job", importJob.id, { filename: req.file.originalname, entityType: "projects" });

      processCSVImport(req.file.buffer, importJob.id, adminUser.id);

      res.status(202).json({ importJobId: importJob.id, message: "Import started" });
    } catch (error) {
      console.error("Error starting project import:", error);
      res.status(500).json({ message: "Failed to start project import" });
    }
  });

  app.post("/api/admin/banks/import", isAuthenticated, isAdmin, adminRateLimit, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const adminUser = (req as any).adminUser;

      const importJob = await adminStorage.createImportJob({
        filename: req.file.originalname,
        entityType: "banks",
        status: "processing",
        createdByAdminId: adminUser.id,
      });

      await createAuditLog(req, "csv_import_start", "import_job", importJob.id, { filename: req.file.originalname, entityType: "banks" });

      processBankCSVImport(req.file.buffer, importJob.id, adminUser.id);

      res.status(202).json({ importJobId: importJob.id, message: "Import started" });
    } catch (error) {
      console.error("Error starting bank import:", error);
      res.status(500).json({ message: "Failed to start bank import" });
    }
  });

  async function processBankCSVImport(buffer: Buffer, jobId: string, adminId: string) {
    let totalRows = 0;
    let insertedCount = 0;
    let failedCount = 0;
    const createdRecordIds: number[] = [];

    try {
      const csvContent = buffer.toString("utf-8");
      const records: any[] = await new Promise((resolve, reject) => {
        parse(csvContent, { columns: true, skip_empty_lines: true }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      totalRows = records.length;

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          if (!row.name) {
            throw new Error("Missing bank name");
          }

          const createdBank = await adminStorage.createBank({
            name: row.name.trim(),
            logoUrl: row.logoUrl?.trim() || row.logo_url?.trim() || null,
            description: row.description?.trim() || null,
          });

          // Обработка developerIds если указаны
          if (row.developerIds || row.developer_ids) {
            const developerIdsStr = row.developerIds?.trim() || row.developer_ids?.trim();
            if (developerIdsStr) {
              const developerIds = developerIdsStr
                .split(',')
                .map((id: string) => parseInt(id.trim()))
                .filter((id: number) => !isNaN(id));

              if (developerIds.length > 0) {
                await adminStorage.setBankDevelopers(createdBank.id, developerIds);
              }
            }
          }

          createdRecordIds.push(createdBank.id);
          insertedCount++;
        } catch (error: any) {
          failedCount++;
          await adminStorage.createImportJobError({
            importJobId: jobId,
            rowNumber: (i + 2).toString(),
            errorMessage: error.message,
            rawRowJson: row,
          });
        }
      }

      await adminStorage.updateImportJob(jobId, {
        status: "completed",
        totalRows: totalRows.toString(),
        insertedCount: insertedCount.toString(),
        failedCount: failedCount.toString(),
        createdRecordIds,
        completedAt: new Date(),
      });

    } catch (error: any) {
      console.error("Bank CSV import failed:", error);
      await adminStorage.updateImportJob(jobId, {
        status: "failed",
        totalRows: totalRows.toString(),
        insertedCount: insertedCount.toString(),
        failedCount: (totalRows - insertedCount).toString(),
        createdRecordIds,
        completedAt: new Date(),
      });
    }
  }

  app.get("/api/admin/imports", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const { search, entityType, status } = req.query;

      const filters = {
        search: search as string | undefined,
        entityType: entityType as string | undefined,
        status: status as string | undefined,
      };

      const imports = await adminStorage.getImportJobs(page, limit, filters);
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

  app.post("/api/admin/imports/:id/undo", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const result = await adminStorage.undoImport(jobId);

      await createAuditLog(req, "csv_import_undo", "import_job", jobId, { undoneCount: result.undoneCount });

      res.json({ 
        message: `Successfully undid import. ${result.undoneCount} record(s) removed.`,
        undoneCount: result.undoneCount,
      });
    } catch (error: any) {
      console.error("Error undoing import:", error);
      res.status(400).json({ message: error.message || "Failed to undo import" });
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
      const status = (req.query.status as "active" | "deleted" | "all") || "active";
      const sortBy = (req.query.sortBy as "name" | "createdAt" | "updatedAt") || "name";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";
      const developers = await adminStorage.getDevelopers(page, limit, search, status, sortBy, sortOrder);
      res.json(developers);
    } catch (error) {
      console.error("Error fetching developers:", error);
      res.status(500).json({ message: "Failed to fetch developers" });
    }
  });

  app.post("/api/admin/developers/bulk-delete", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      const result = await adminStorage.bulkDeleteDevelopers(ids);
      await createAuditLog(req, "developer_bulk_delete", "developer", ids.join(","), { ids, result });
      res.json(result);
    } catch (error) {
      console.error("Error bulk deleting developers:", error);
      res.status(500).json({ message: "Failed to bulk delete developers" });
    }
  });

  app.post("/api/admin/developers/bulk-restore", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      const result = await adminStorage.bulkRestoreDevelopers(ids);
      await createAuditLog(req, "developer_bulk_restore", "developer", ids.join(","), { ids, result });
      res.json(result);
    } catch (error) {
      console.error("Error bulk restoring developers:", error);
      res.status(500).json({ message: "Failed to bulk restore developers" });
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
      await adminStorage.softDeleteDeveloper(id);
      await createAuditLog(req, "developer_delete", "developer", id.toString());
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting developer:", error);
      res.status(500).json({ message: "Failed to delete developer" });
    }
  });

  app.post("/api/admin/developers/:id/restore", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await adminStorage.restoreDeveloper(id);
      await createAuditLog(req, "developer_restore", "developer", id.toString());
      res.status(200).json({ message: "Developer restored" });
    } catch (error) {
      console.error("Error restoring developer:", error);
      res.status(500).json({ message: "Failed to restore developer" });
    }
  });

  app.post("/api/admin/developers/import", isAuthenticated, isAdmin, adminRateLimit, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const adminUser = (req as any).adminUser;

      const importJob = await adminStorage.createImportJob({
        filename: req.file.originalname,
        entityType: "developers",
        status: "processing",
        createdByAdminId: adminUser.id,
      });

      await createAuditLog(req, "csv_import_start", "import_job", importJob.id, { filename: req.file.originalname, entityType: "developers" });

      processDeveloperCSVImport(req.file.buffer, importJob.id, adminUser.id);

      res.status(202).json({ importJobId: importJob.id, message: "Import started" });
    } catch (error) {
      console.error("Error starting developer import:", error);
      res.status(500).json({ message: "Failed to start developer import" });
    }
  });

  async function processDeveloperCSVImport(buffer: Buffer, jobId: string, adminId: string) {
    let totalRows = 0;
    let insertedCount = 0;
    let failedCount = 0;
    const createdRecordIds: number[] = [];

    try {
      const csvContent = buffer.toString("utf-8");
      const records: any[] = await new Promise((resolve, reject) => {
        parse(csvContent, { columns: true, skip_empty_lines: true }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      totalRows = records.length;

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        try {
          if (!row.name) {
            throw new Error("Missing developer name");
          }

          const createdDeveloper = await adminStorage.createDeveloper({
            name: row.name.trim(),
            logoUrl: row.logoUrl?.trim() || row.logo_url?.trim() || null,
            description: row.description?.trim() || null,
          });

          createdRecordIds.push(createdDeveloper.id);
          insertedCount++;
        } catch (error: any) {
          failedCount++;
          await adminStorage.createImportJobError({
            importJobId: jobId,
            rowNumber: (i + 2).toString(),
            errorMessage: error.message,
            rawRowJson: row,
          });
        }
      }

      await adminStorage.updateImportJob(jobId, {
        status: "completed",
        totalRows: totalRows.toString(),
        insertedCount: insertedCount.toString(),
        failedCount: failedCount.toString(),
        createdRecordIds,
        completedAt: new Date(),
      });

    } catch (error: any) {
      console.error("Developer CSV import failed:", error);
      await adminStorage.updateImportJob(jobId, {
        status: "failed",
        totalRows: totalRows.toString(),
        insertedCount: insertedCount.toString(),
        failedCount: (totalRows - insertedCount).toString(),
        createdRecordIds,
        completedAt: new Date(),
      });
    }
  }

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
      const status = (req.query.status as "active" | "deleted" | "all") || "active";
      const sortBy = (req.query.sortBy as "name" | "createdAt" | "updatedAt") || "name";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";
      const banks = await adminStorage.getBanks(page, limit, search, status, sortBy, sortOrder);
      res.json(banks);
    } catch (error) {
      console.error("Error fetching banks:", error);
      res.status(500).json({ message: "Failed to fetch banks" });
    }
  });

  // Get developers for a specific bank
  app.get("/api/admin/banks/:id/developers", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      const developers = await adminStorage.getBankDevelopers(id);
      res.json(developers);
    } catch (error) {
      console.error("Error fetching bank developers:", error);
      res.status(500).json({ message: "Failed to fetch bank developers" });
    }
  });

  app.post("/api/admin/banks/bulk-delete", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      const result = await adminStorage.bulkDeleteBanks(ids);
      await createAuditLog(req, "bank_bulk_delete", "bank", ids.join(","), { ids, result });
      res.json(result);
    } catch (error) {
      console.error("Error bulk deleting banks:", error);
      res.status(500).json({ message: "Failed to bulk delete banks" });
    }
  });

  app.post("/api/admin/banks/bulk-restore", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { ids } = z.object({ ids: z.array(z.number()) }).parse(req.body);
      const result = await adminStorage.bulkRestoreBanks(ids);
      await createAuditLog(req, "bank_bulk_restore", "bank", ids.join(","), { ids, result });
      res.json(result);
    } catch (error) {
      console.error("Error bulk restoring banks:", error);
      res.status(500).json({ message: "Failed to bulk restore banks" });
    }
  });

  app.post("/api/admin/banks", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const bankSchema = z.object({
        name: z.string().min(1),
        logoUrl: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        developerIds: z.array(z.number()).optional(),
      });
      const data = bankSchema.parse(req.body);
      const { developerIds, ...bankData } = data;
      const bank = await adminStorage.createBank(bankData);

      // Установить связи с застройщиками если указаны
      if (developerIds && developerIds.length > 0) {
        await adminStorage.setBankDevelopers(bank.id, developerIds);
      }

      await createAuditLog(req, "bank_create", "bank", bank.id.toString(), { name: data.name, developerIds });
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
        developerIds: z.array(z.number()).optional(),
      });
      const data = bankSchema.parse(req.body);
      const { developerIds, ...bankData } = data;
      const bank = await adminStorage.updateBank(id, bankData);

      // Обновить связи с застройщиками если указаны
      if (developerIds !== undefined) {
        await adminStorage.setBankDevelopers(id, developerIds);
      }

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
      await adminStorage.softDeleteBank(id);
      await createAuditLog(req, "bank_delete", "bank", id.toString());
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bank:", error);
      res.status(500).json({ message: "Failed to delete bank" });
    }
  });

  app.post("/api/admin/banks/:id/restore", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = idParamSchema.parse(req.params);
      await adminStorage.restoreBank(id);
      await createAuditLog(req, "bank_restore", "bank", id.toString());
      res.status(200).json({ message: "Bank restored" });
    } catch (error) {
      console.error("Error restoring bank:", error);
      res.status(500).json({ message: "Failed to restore bank" });
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

  // Product Analytics Routes
  const analyticsRangeSchema = z.object({
    period: z.enum(["day", "week", "month", "quarter", "year"]).optional().default("month"),
    userType: z.enum(["all", "authenticated", "anonymous"]).optional().default("all"),
  });

  function getDateRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }

    return { startDate, endDate };
  }

  app.get("/api/admin/analytics/overview", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const overview = await analyticsStorage.getOverview(range, userType);
      res.json(overview);
    } catch (error) {
      console.error("Error fetching analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get("/api/admin/analytics/dau-mau", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const data = await analyticsStorage.getDAUMAU(range, userType);
      res.json(data);
    } catch (error) {
      console.error("Error fetching DAU/MAU:", error);
      res.status(500).json({ message: "Failed to fetch DAU/MAU data" });
    }
  });

  app.get("/api/admin/analytics/retention", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const cohorts = await analyticsStorage.getRetentionCohorts(range, userType);
      res.json(cohorts);
    } catch (error) {
      console.error("Error fetching retention cohorts:", error);
      res.status(500).json({ message: "Failed to fetch retention data" });
    }
  });

  app.get("/api/admin/analytics/funnel", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const funnel = await analyticsStorage.getConversionFunnel(range, userType);
      res.json(funnel);
    } catch (error) {
      console.error("Error fetching conversion funnel:", error);
      res.status(500).json({ message: "Failed to fetch conversion funnel" });
    }
  });

  app.get("/api/admin/analytics/geo", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const geo = await analyticsStorage.getGeoDistribution(range, userType);
      res.json(geo);
    } catch (error) {
      console.error("Error fetching geo distribution:", error);
      res.status(500).json({ message: "Failed to fetch geo data" });
    }
  });

  app.get("/api/admin/analytics/devices", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const devices = await analyticsStorage.getDeviceDistribution(range, userType);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching device distribution:", error);
      res.status(500).json({ message: "Failed to fetch device data" });
    }
  });

  app.get("/api/admin/analytics/browsers", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const browsers = await analyticsStorage.getBrowserDistribution(range, userType);
      res.json(browsers);
    } catch (error) {
      console.error("Error fetching browser distribution:", error);
      res.status(500).json({ message: "Failed to fetch browser data" });
    }
  });

  app.get("/api/admin/analytics/os", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const os = await analyticsStorage.getOSDistribution(range, userType);
      res.json(os);
    } catch (error) {
      console.error("Error fetching OS distribution:", error);
      res.status(500).json({ message: "Failed to fetch OS data" });
    }
  });

  app.get("/api/admin/analytics/traffic-sources", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period, userType } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);
      const sources = await analyticsStorage.getTrafficSources(range, userType);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching traffic sources:", error);
      res.status(500).json({ message: "Failed to fetch traffic sources" });
    }
  });

  app.post("/api/admin/analytics/seed", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      await analyticsStorage.seedAnalyticsData();
      res.json({ message: "Analytics data seeded successfully" });
    } catch (error) {
      console.error("Error seeding analytics data:", error);
      res.status(500).json({ message: "Failed to seed analytics data" });
    }
  });

  app.get("/api/admin/analytics/export", isAuthenticated, isAdmin, adminRateLimit, async (req: Request, res: Response) => {
    try {
      const { period } = analyticsRangeSchema.parse(req.query);
      const range = getDateRange(period);

      const [overview, dauMau, geo, devices, browsers, os, sources] = await Promise.all([
        analyticsStorage.getOverview(range),
        analyticsStorage.getDAUMAU(range),
        analyticsStorage.getGeoDistribution(range),
        analyticsStorage.getDeviceDistribution(range),
        analyticsStorage.getBrowserDistribution(range),
        analyticsStorage.getOSDistribution(range),
        analyticsStorage.getTrafficSources(range),
      ]);

      res.json({
        period,
        exportDate: new Date().toISOString(),
        overview,
        dauMau,
        geo,
        devices,
        browsers,
        os,
        sources,
      });
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Failed to export analytics" });
    }
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
  const createdRecordIds: number[] = [];

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
        const developerField = row.developer || row.developer_name || "";
        const developerName = developerField.toString().toLowerCase().trim();
        const developer = developerMap.get(developerName);
        if (!developer) {
          throw new Error(`Developer not found: ${developerField}`);
        }

        // Ищем город
        const cityField = row.city || row.city_name || "";
        const cityName = cityField.toString().toLowerCase().trim();
        const city = cityMap.get(cityName);
        if (!city) {
          throw new Error(`City not found: ${cityField}`);
        }

        // Ищем район
        const districtField = row.district || row.district_name || "";
        const districtName = districtField.toString().toLowerCase().trim();
        const district = districtMap.get(districtName);
        if (!district) {
          throw new Error(`District not found: ${districtField}`);
        }

        // Проверяем, что район принадлежит указанному городу
        if (district.cityId !== city.id) {
          throw new Error(`District ${row.district} does not belong to city ${row.city}`);
        }

        // Парсим дату сдачи
        let completionDate: Date | null = null;
        const rawCompletionDate = row.completion_date || row.completionDate;
        if (rawCompletionDate) {
          const dateStr = rawCompletionDate.trim();
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
              throw new Error(`Invalid completion date format: ${rawCompletionDate}`);
            }
          }
        }

        // Парсим цену
        let priceFrom: number | null = null;
        const rawPriceFrom = row.price_from || row.priceFrom;
        if (rawPriceFrom) {
          const price = parseFloat(rawPriceFrom.toString().replace(/[^\d.]/g, ''));
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
          latitude: (row.latitude || row.lat) ? parseFloat(row.latitude || row.lat) : null,
          longitude: (row.longitude || row.lng || row.lon) ? parseFloat(row.longitude || row.lng || row.lon) : null,
          address: row.address?.trim() || null,
          shortDescription: (row.short_description || row.shortDescription)?.trim() || null,
          description: row.description?.trim() || null,
          website: row.website?.trim() || null,
          priceFrom,
          currency: row.currency?.trim() || "USD",
          completionDate,
          coverImageUrl: (row.cover_image_url || row.coverImageUrl || row.logo_url || row.logoUrl)?.trim() || null,
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

        createdRecordIds.push(createdProject.id);
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
      createdRecordIds,
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
      createdRecordIds,
      completedAt: new Date(),
    });
  }
}

