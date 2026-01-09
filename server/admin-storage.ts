import { db } from "./db";
import {
  users, projects, ipBans, importJobs, importJobErrors, auditLogs, sessions,
  developers, banks, cities, districts, developerBanks, projectBanks,
  type User, type IpBan, type ImportJob, type ImportJobError, type AuditLog,
  type InsertIpBan, type InsertImportJob, type InsertImportJobError, type InsertAuditLog,
  type Developer, type InsertDeveloper, type Bank, type InsertBank,
} from "@shared/schema";
import { eq, isNull, or, gt, ilike, desc, sql, and, asc, inArray } from "drizzle-orm";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AdminStorage {
  async getUsers(page: number, limit: number, search?: string): Promise<PaginatedResult<User>> {
    const offset = (page - 1) * limit;

    let query = db.select().from(users);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(users);

    if (search) {
      const condition = or(
        ilike(users.email, `%${search}%`),
        ilike(users.firstName, `%${search}%`),
        ilike(users.lastName, `%${search}%`)
      );
      query = query.where(condition) as typeof query;
      countQuery = countQuery.where(condition) as typeof countQuery;
    }

    const [data, [{ count }]] = await Promise.all([
      query.orderBy(desc(users.createdAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async banUser(id: string, reason?: string): Promise<void> {
    await db.update(users).set({
      bannedAt: new Date(),
      bannedReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(users.id, id));
  }

  async unbanUser(id: string): Promise<void> {
    await db.update(users).set({
      bannedAt: null,
      bannedReason: null,
      updatedAt: new Date(),
    }).where(eq(users.id, id));
  }

  async setUserRole(id: string, role: string): Promise<void> {
    await db.update(users).set({
      role,
      updatedAt: new Date(),
    }).where(eq(users.id, id));
  }

  async getIpBans(page: number, limit: number): Promise<PaginatedResult<IpBan>> {
    const offset = (page - 1) * limit;

    const [data, [{ count }]] = await Promise.all([
      db.select().from(ipBans).orderBy(desc(ipBans.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(ipBans),
    ]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async createIpBan(ban: InsertIpBan): Promise<IpBan> {
    const [created] = await db.insert(ipBans).values(ban).returning();
    return created;
  }

  async deleteIpBan(id: string): Promise<void> {
    await db.delete(ipBans).where(eq(ipBans.id, id));
  }

  async isIpBanned(ip: string): Promise<boolean> {
    const [ban] = await db.select().from(ipBans).where(
      and(
        eq(ipBans.ip, ip),
        or(isNull(ipBans.expiresAt), gt(ipBans.expiresAt, new Date()))
      )
    );
    return !!ban;
  }

  async softDeleteProject(id: number): Promise<void> {
    await db.update(projects).set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(projects.id, id));
  }

  async restoreProject(id: number): Promise<void> {
    await db.update(projects).set({
      deletedAt: null,
      updatedAt: new Date(),
    }).where(eq(projects.id, id));
  }

  async createImportJob(job: InsertImportJob): Promise<ImportJob> {
    const [created] = await db.insert(importJobs).values(job).returning();
    return created;
  }

  async updateImportJob(id: string, data: Partial<ImportJob>): Promise<void> {
    await db.update(importJobs).set(data).where(eq(importJobs.id, id));
  }

  async getImportJob(id: string): Promise<ImportJob | undefined> {
    const [job] = await db.select().from(importJobs).where(eq(importJobs.id, id));
    return job;
  }

  async getImportJobs(
    page: number,
    limit: number,
    filters?: {
      search?: string;
      entityType?: string;
      status?: string;
    }
  ): Promise<PaginatedResult<ImportJob>> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (filters?.search) {
      conditions.push(ilike(importJobs.filename, `%${filters.search}%`));
    }

    if (filters?.entityType) {
      conditions.push(eq(importJobs.entityType, filters.entityType));
    }

    if (filters?.status) {
      conditions.push(eq(importJobs.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      db.select().from(importJobs)
        .where(whereClause)
        .orderBy(desc(importJobs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(importJobs).where(whereClause),
    ]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async createImportJobError(error: InsertImportJobError): Promise<void> {
    await db.insert(importJobErrors).values(error);
  }

  async getImportJobErrors(jobId: string): Promise<ImportJobError[]> {
    return db.select().from(importJobErrors).where(eq(importJobErrors.importJobId, jobId));
  }

  async undoImport(jobId: string): Promise<{ undoneCount: number }> {
    const job = await this.getImportJob(jobId);
    if (!job) {
      throw new Error("Import job not found");
    }
    if (job.undoneAt) {
      throw new Error("Import has already been undone");
    }
    if (!job.createdRecordIds || !Array.isArray(job.createdRecordIds) || job.createdRecordIds.length === 0) {
      throw new Error("No records to undo for this import");
    }

    const entityType = job.entityType || "projects";
    const recordIds = job.createdRecordIds as number[];
    let undoneCount = 0;

    for (const id of recordIds) {
      try {
        if (entityType === "projects") {
          await this.softDeleteProject(id);
        } else if (entityType === "developers") {
          await this.softDeleteDeveloper(id);
        } else if (entityType === "banks") {
          await this.softDeleteBank(id);
        }
        undoneCount++;
      } catch (error) {
        console.error(`Failed to undo record ${id}:`, error);
      }
    }

    await this.updateImportJob(jobId, {
      undoneAt: new Date(),
      status: "undone",
    });

    return { undoneCount };
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(page: number, limit: number, filters?: { userId?: string; actionType?: string }): Promise<PaginatedResult<AuditLog>> {
    const offset = (page - 1) * limit;

    let query = db.select().from(auditLogs);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);

    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.adminId, filters.userId));
    }
    if (filters?.actionType) {
      conditions.push(eq(auditLogs.actionType, filters.actionType));
    }

    if (conditions.length > 0) {
      const whereClause = and(...conditions);
      query = query.where(whereClause) as typeof query;
      countQuery = countQuery.where(whereClause) as typeof countQuery;
    }

    const [data, [{ count }]] = await Promise.all([
      query.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
      countQuery,
    ]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async getDashboardStats() {
    const [
      [{ userCount }],
      [{ projectCount }],
      [{ bannedUserCount }],
      [{ ipBanCount }],
      [{ developerCount }],
      [{ bankCount }],
      recentImports,
    ] = await Promise.all([
      db.select({ userCount: sql<number>`count(*)::int` }).from(users),
      db.select({ projectCount: sql<number>`count(*)::int` }).from(projects).where(isNull(projects.deletedAt)),
      db.select({ bannedUserCount: sql<number>`count(*)::int` }).from(users).where(sql`${users.bannedAt} IS NOT NULL`),
      db.select({ ipBanCount: sql<number>`count(*)::int` }).from(ipBans),
      db.select({ developerCount: sql<number>`count(*)::int` }).from(developers),
      db.select({ bankCount: sql<number>`count(*)::int` }).from(banks),
      db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(5),
    ]);

    return {
      userCount,
      projectCount,
      bannedUserCount,
      ipBanCount,
      developerCount,
      bankCount,
      recentImports,
    };
  }

  async getProjectsForAdmin(
    page: number, 
    limit: number, 
    search?: string,
    status: "active" | "deleted" | "all" = "active",
    sortBy: "name" | "createdAt" | "updatedAt" = "updatedAt",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<PaginatedResult<any>> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (status === "active") {
      conditions.push(isNull(projects.deletedAt));
    } else if (status === "deleted") {
      conditions.push(sql`${projects.deletedAt} IS NOT NULL`);
    }

    if (search) {
      conditions.push(or(
        ilike(projects.name, `%${search}%`),
        sql`${projects.id}::text ILIKE ${'%' + search + '%'}`
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderColumn = sortBy === "name" ? projects.name : 
                        sortBy === "createdAt" ? projects.createdAt : 
                        projects.updatedAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, [{ count }]] = await Promise.all([
      db.select({
        id: projects.id,
        name: projects.name,
        developerId: projects.developerId,
        cityId: projects.cityId,
        districtId: projects.districtId,
        address: projects.address,
        shortDescription: projects.shortDescription,
        description: projects.description,
        latitude: projects.latitude,
        longitude: projects.longitude,
        priceFrom: projects.priceFrom,
        currency: projects.currency,
        deletedAt: projects.deletedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      }).from(projects)
        .where(whereClause)
        .orderBy(orderFn(orderColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(projects).where(whereClause),
    ]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async bulkDeleteProjects(ids: number[]): Promise<{ succeededIds: number[]; failed: { id: number; reasonCode: string; message: string }[] }> {
    const succeededIds: number[] = [];
    const failed: { id: number; reasonCode: string; message: string }[] = [];

    for (const id of ids) {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.id, id));
        if (!project) {
          failed.push({ id, reasonCode: "NOT_FOUND", message: "Project not found" });
          continue;
        }
        if (project.deletedAt) {
          failed.push({ id, reasonCode: "ALREADY_DELETED", message: "Project already deleted" });
          continue;
        }
        await db.update(projects).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(projects.id, id));
        succeededIds.push(id);
      } catch (error) {
        failed.push({ id, reasonCode: "ERROR", message: "Failed to delete" });
      }
    }

    return { succeededIds, failed };
  }

  async bulkRestoreProjects(ids: number[]): Promise<{ succeededIds: number[]; failed: { id: number; reasonCode: string; message: string }[] }> {
    const succeededIds: number[] = [];
    const failed: { id: number; reasonCode: string; message: string }[] = [];

    for (const id of ids) {
      try {
        const [project] = await db.select().from(projects).where(eq(projects.id, id));
        if (!project) {
          failed.push({ id, reasonCode: "NOT_FOUND", message: "Project not found" });
          continue;
        }
        if (!project.deletedAt) {
          failed.push({ id, reasonCode: "NOT_DELETED", message: "Project is not deleted" });
          continue;
        }
        await db.update(projects).set({ deletedAt: null, updatedAt: new Date() }).where(eq(projects.id, id));
        succeededIds.push(id);
      } catch (error) {
        failed.push({ id, reasonCode: "ERROR", message: "Failed to restore" });
      }
    }

    return { succeededIds, failed };
  }

  async createProject(data: {
    name: string;
    developerId: number;
    cityId: number;
    districtId: number;
    latitude: number | null;
    longitude: number | null;
    address?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    website?: string | null;
    coverImageUrl?: string | null;
    priceFrom?: number | null;
    currency?: string;
    completionDate?: string | null;
  }): Promise<any> {
    const projectData = {
      name: data.name,
      developerId: data.developerId,
      cityId: data.cityId,
      districtId: data.districtId,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address ?? null,
      shortDescription: data.shortDescription ?? null,
      description: data.description ?? null,
      website: data.website ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      priceFrom: data.priceFrom ?? null,
      currency: data.currency ?? "USD",
      completionDate: data.completionDate ? new Date(data.completionDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [created] = await db.insert(projects).values(projectData).returning();
    return created;
  }

  async updateProject(id: number, data: {
    name?: string;
    developerId?: number;
    cityId?: number;
    districtId?: number;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    shortDescription?: string | null;
    description?: string | null;
    website?: string | null;
    coverImageUrl?: string | null;
    priceFrom?: number | null;
    currency?: string;
    completionDate?: string | null;
  }): Promise<any> {
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.developerId !== undefined) updateData.developerId = data.developerId;
    if (data.cityId !== undefined) updateData.cityId = data.cityId;
    if (data.districtId !== undefined) updateData.districtId = data.districtId;
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
    if (data.priceFrom !== undefined) updateData.priceFrom = data.priceFrom;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.completionDate !== undefined) {
      updateData.completionDate = data.completionDate ? new Date(data.completionDate) : null;
    }

    const [updated] = await db.update(projects).set(updateData).where(eq(projects.id, id)).returning();
    return updated;
  }

  // Управление связями проект-банк
  async setProjectBanks(projectId: number, bankIds: number[]): Promise<void> {
    // Удаляем все существующие связи
    await db.delete(projectBanks).where(eq(projectBanks.projectId, projectId));

    // Добавляем новые связи
    if (bankIds.length > 0) {
      await db.insert(projectBanks).values(
        bankIds.map(bankId => ({ projectId, bankId }))
      );
    }
  }

  async getProjectBanks(projectId: number): Promise<number[]> {
    const links = await db.select().from(projectBanks).where(eq(projectBanks.projectId, projectId));
    return links.map(link => link.bankId);
  }

  async getDevelopers(
    page: number, 
    limit: number, 
    search?: string,
    status: "active" | "deleted" | "all" = "active",
    sortBy: "name" | "createdAt" | "updatedAt" = "name",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<PaginatedResult<Developer & { projectCount: number }>> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (status === "active") {
      conditions.push(isNull(developers.deletedAt));
    } else if (status === "deleted") {
      conditions.push(sql`${developers.deletedAt} IS NOT NULL`);
    }

    if (search) {
      conditions.push(or(
        ilike(developers.name, `%${search}%`),
        sql`${developers.id}::text ILIKE ${'%' + search + '%'}`
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderColumn = sortBy === "name" ? developers.name : 
                        sortBy === "createdAt" ? developers.createdAt : 
                        developers.updatedAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, [{ count }]] = await Promise.all([
      db.select().from(developers).where(whereClause).orderBy(orderFn(orderColumn)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(developers).where(whereClause),
    ]);

    const dataWithCounts = await Promise.all(
      data.map(async (dev) => {
        const [{ projectCount }] = await db
          .select({ projectCount: sql<number>`count(*)::int` })
          .from(projects)
          .where(eq(projects.developerId, dev.id));
        return { ...dev, projectCount };
      })
    );

    return {
      data: dataWithCounts,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async createDeveloper(developer: InsertDeveloper): Promise<Developer> {
    const [created] = await db.insert(developers).values({
      ...developer,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer> {
    const [updated] = await db.update(developers).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(developers.id, id)).returning();
    return updated;
  }

  async softDeleteDeveloper(id: number): Promise<void> {
    await db.update(developers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(developers.id, id));
  }

  async restoreDeveloper(id: number): Promise<void> {
    await db.update(developers).set({ deletedAt: null, updatedAt: new Date() }).where(eq(developers.id, id));
  }

  async bulkDeleteDevelopers(ids: number[]): Promise<{ succeededIds: number[]; failed: { id: number; reasonCode: string; message: string }[] }> {
    const succeededIds: number[] = [];
    const failed: { id: number; reasonCode: string; message: string }[] = [];

    for (const id of ids) {
      try {
        const [dev] = await db.select().from(developers).where(eq(developers.id, id));
        if (!dev) {
          failed.push({ id, reasonCode: "NOT_FOUND", message: "Developer not found" });
          continue;
        }
        if (dev.deletedAt) {
          failed.push({ id, reasonCode: "ALREADY_DELETED", message: "Developer already deleted" });
          continue;
        }
        await db.update(developers).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(developers.id, id));
        succeededIds.push(id);
      } catch (error) {
        failed.push({ id, reasonCode: "ERROR", message: "Failed to delete" });
      }
    }

    return { succeededIds, failed };
  }

  async bulkRestoreDevelopers(ids: number[]): Promise<{ succeededIds: number[]; failed: { id: number; reasonCode: string; message: string }[] }> {
    const succeededIds: number[] = [];
    const failed: { id: number; reasonCode: string; message: string }[] = [];

    for (const id of ids) {
      try {
        const [dev] = await db.select().from(developers).where(eq(developers.id, id));
        if (!dev) {
          failed.push({ id, reasonCode: "NOT_FOUND", message: "Developer not found" });
          continue;
        }
        if (!dev.deletedAt) {
          failed.push({ id, reasonCode: "NOT_DELETED", message: "Developer is not deleted" });
          continue;
        }
        await db.update(developers).set({ deletedAt: null, updatedAt: new Date() }).where(eq(developers.id, id));
        succeededIds.push(id);
      } catch (error) {
        failed.push({ id, reasonCode: "ERROR", message: "Failed to restore" });
      }
    }

    return { succeededIds, failed };
  }

  async getAllDevelopersForExport(): Promise<Developer[]> {
    return db.select().from(developers).where(isNull(developers.deletedAt)).orderBy(asc(developers.name));
  }

  async getBanks(
    page: number, 
    limit: number, 
    search?: string,
    status: "active" | "deleted" | "all" = "active",
    sortBy: "name" | "createdAt" | "updatedAt" = "name",
    sortOrder: "asc" | "desc" = "asc"
  ): Promise<PaginatedResult<Bank>> {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (status === "active") {
      conditions.push(isNull(banks.deletedAt));
    } else if (status === "deleted") {
      conditions.push(sql`${banks.deletedAt} IS NOT NULL`);
    }

    if (search) {
      conditions.push(or(
        ilike(banks.name, `%${search}%`),
        sql`${banks.id}::text ILIKE ${'%' + search + '%'}`
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderColumn = sortBy === "name" ? banks.name : 
                        sortBy === "createdAt" ? banks.createdAt : 
                        banks.updatedAt;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [data, [{ count }]] = await Promise.all([
      db.select().from(banks).where(whereClause).orderBy(orderFn(orderColumn)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(banks).where(whereClause),
    ]);

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    const [created] = await db.insert(banks).values({
      ...bank,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updateBank(id: number, data: Partial<InsertBank>): Promise<Bank> {
    const [updated] = await db.update(banks).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(banks.id, id)).returning();
    return updated;
  }

  async softDeleteBank(id: number): Promise<void> {
    await db.update(banks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(banks.id, id));
  }

  async restoreBank(id: number): Promise<void> {
    await db.update(banks).set({ deletedAt: null, updatedAt: new Date() }).where(eq(banks.id, id));
  }

  async bulkDeleteBanks(ids: number[]): Promise<{ succeededIds: number[]; failed: { id: number; reasonCode: string; message: string }[] }> {
    const succeededIds: number[] = [];
    const failed: { id: number; reasonCode: string; message: string }[] = [];

    for (const id of ids) {
      try {
        const [bank] = await db.select().from(banks).where(eq(banks.id, id));
        if (!bank) {
          failed.push({ id, reasonCode: "NOT_FOUND", message: "Bank not found" });
          continue;
        }
        if (bank.deletedAt) {
          failed.push({ id, reasonCode: "ALREADY_DELETED", message: "Bank already deleted" });
          continue;
        }
        await db.update(banks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(banks.id, id));
        succeededIds.push(id);
      } catch (error) {
        failed.push({ id, reasonCode: "ERROR", message: "Failed to delete" });
      }
    }

    return { succeededIds, failed };
  }

  async bulkRestoreBanks(ids: number[]): Promise<{ succeededIds: number[]; failed: { id: number; reasonCode: string; message: string }[] }> {
    const succeededIds: number[] = [];
    const failed: { id: number; reasonCode: string; message: string }[] = [];

    for (const id of ids) {
      try {
        const [bank] = await db.select().from(banks).where(eq(banks.id, id));
        if (!bank) {
          failed.push({ id, reasonCode: "NOT_FOUND", message: "Bank not found" });
          continue;
        }
        if (!bank.deletedAt) {
          failed.push({ id, reasonCode: "NOT_DELETED", message: "Bank is not deleted" });
          continue;
        }
        await db.update(banks).set({ deletedAt: null, updatedAt: new Date() }).where(eq(banks.id, id));
        succeededIds.push(id);
      } catch (error) {
        failed.push({ id, reasonCode: "ERROR", message: "Failed to restore" });
      }
    }

    return { succeededIds, failed };
  }

  async getAllBanksForExport(): Promise<Bank[]> {
    return db.select().from(banks).where(isNull(banks.deletedAt)).orderBy(asc(banks.name));
  }

  // Developer-Bank relationship methods
  async getBankDevelopers(bankId: number): Promise<Developer[]> {
    const devBanks = await db
      .select()
      .from(developerBanks)
      .where(eq(developerBanks.bankId, bankId));

    if (devBanks.length === 0) return [];

    const devIds = devBanks.map((rel: any) => rel.developerId);
    const devs = await db.select().from(developers).where(inArray(developers.id, devIds));

    return devs;
  }

  async setBankDevelopers(bankId: number, developerIds: number[]): Promise<void> {
    // Удаляем все существующие связи
    await db.delete(developerBanks).where(eq(developerBanks.bankId, bankId));

    // Добавляем новые связи
    if (developerIds.length > 0) {
      const values = developerIds.map(developerId => ({
        bankId,
        developerId,
      }));
      await db.insert(developerBanks).values(values);
    }
  }

  async addBankDeveloper(bankId: number, developerId: number): Promise<void> {
    await db.insert(developerBanks).values({ bankId, developerId }).onConflictDoNothing();
  }

  async removeBankDeveloper(bankId: number, developerId: number): Promise<void> {
    await db.delete(developerBanks).where(
      and(
        eq(developerBanks.bankId, bankId),
        eq(developerBanks.developerId, developerId)
      )
    );
  }

  async getAllProjectsForExport(): Promise<any[]> {
    const allProjects = await db.select().from(projects).where(isNull(projects.deletedAt)).orderBy(asc(projects.name));

    const result = await Promise.all(
      allProjects.map(async (project) => {
        const [developer] = await db.select().from(developers).where(eq(developers.id, project.developerId));
        const [city] = await db.select().from(cities).where(eq(cities.id, project.cityId));
        const [district] = await db.select().from(districts).where(eq(districts.id, project.districtId));
        return {
          ...project,
          developerName: developer?.name || "",
          cityName: city?.name || "",
          districtName: district?.name || "",
        };
      })
    );

    return result;
  }

  async getSessions(page: number, limit: number, search?: string): Promise<PaginatedResult<any>> {
    const offset = (page - 1) * limit;

    let query = db.select({
      sid: sessions.sid,
      sess: sessions.sess,
      expire: sessions.expire,
    }).from(sessions);

    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(sessions);

    // Фильтр по активным сессиям (не истекшим)
    const activeCondition = gt(sessions.expire, new Date());
    query = query.where(activeCondition) as typeof query;
    countQuery = countQuery.where(activeCondition) as typeof countQuery;

    const [data, [{ count }]] = await Promise.all([
      query.orderBy(desc(sessions.expire)).limit(limit).offset(offset),
      countQuery,
    ]);

    // Обогащаем данные сессий информацией о пользователях
    const enrichedData = await Promise.all(
      data.map(async (session) => {
        const sessionData = session.sess as any;
        let user = null;

        if (sessionData?.passport?.user?.id) {
          const [foundUser] = await db.select().from(users).where(eq(users.id, sessionData.passport.user.id));
          user = foundUser;
        }

        return {
          sid: session.sid,
          userId: user?.id || null,
          userEmail: user?.email || null,
          userAgent: sessionData?.userAgent || null,
          ip: sessionData?.ip || null,
          lastActivity: sessionData?.lastActivity ? new Date(sessionData.lastActivity) : session.expire,
          expire: session.expire,
          isActive: session.expire > new Date(),
        };
      })
    );

    // Применяем поиск после обогащения данных
    let filteredData = enrichedData;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = enrichedData.filter(session => 
        session.userEmail?.toLowerCase().includes(searchLower) ||
        session.ip?.includes(search) ||
        session.userAgent?.toLowerCase().includes(searchLower)
      );
    }

    return {
      data: filteredData,
      total: search ? filteredData.length : count,
      page,
      limit,
      totalPages: Math.ceil((search ? filteredData.length : count) / limit),
    };
  }

  async deleteSession(sid: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sid, sid));
  }

  async getSecurityStats() {
    const [
      [{ activeSessionCount }],
      [{ totalSessionCount }],
    ] = await Promise.all([
      db.select({ activeSessionCount: sql<number>`count(*)::int` }).from(sessions).where(gt(sessions.expire, new Date())),
      db.select({ totalSessionCount: sql<number>`count(*)::int` }).from(sessions),
    ]);

    return {
      activeSessionCount,
      totalSessionCount,
      expiredSessionCount: totalSessionCount - activeSessionCount,
    };
  }

  async getSecurityAnalytics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      // Активность за последние 24 часа по часам
      hourlyActivity,
      // Топ IP адресов из audit logs
      topIPs,
      // Топ типов действий
      topActions,
      // Статистика по дням за последнюю неделю
      weeklyStats,
      // Подозрительная активность
      suspiciousActivity,
    ] = await Promise.all([
      // Активность по часам за последние 24 часа
      db.select({
        hour: sql<string>`EXTRACT(HOUR FROM ${auditLogs.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.createdAt} >= ${last24Hours}`)
      .groupBy(sql`EXTRACT(HOUR FROM ${auditLogs.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${auditLogs.createdAt})`),

      // Топ IP адресов
      db.select({
        ip: auditLogs.ip,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.ip} IS NOT NULL AND ${auditLogs.createdAt} >= ${last7Days}`)
      .groupBy(auditLogs.ip)
      .orderBy(sql`count(*) DESC`)
      .limit(10),

      // Топ типов действий
      db.select({
        actionType: auditLogs.actionType,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.createdAt} >= ${last7Days}`)
      .groupBy(auditLogs.actionType)
      .orderBy(sql`count(*) DESC`)
      .limit(10),

      // Статистика по дням за неделю
      db.select({
        date: sql<string>`DATE(${auditLogs.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.createdAt} >= ${last7Days}`)
      .groupBy(sql`DATE(${auditLogs.createdAt})`)
      .orderBy(sql`DATE(${auditLogs.createdAt})`),

      // Подозрительная активность (много действий от одного IP)
      db.select({
        ip: auditLogs.ip,
        actionCount: sql<number>`count(*)::int`,
        uniqueAdmins: sql<number>`count(DISTINCT ${auditLogs.adminId})::int`,
        lastAction: sql<string>`MAX(${auditLogs.createdAt})`,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.ip} IS NOT NULL AND ${auditLogs.createdAt} >= ${last24Hours}`)
      .groupBy(auditLogs.ip)
      .having(sql`count(*) > 10`) // Более 10 действий за 24 часа
      .orderBy(sql`count(*) DESC`)
      .limit(5),
    ]);

    return {
      hourlyActivity,
      topIPs,
      topActions,
      weeklyStats,
      suspiciousActivity,
      timeRanges: {
        last24Hours: last24Hours.toISOString(),
        last7Days: last7Days.toISOString(),
        last30Days: last30Days.toISOString(),
      },
    };
  }

  async getSessionAnalytics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      // Сессии по часам
      sessionsByHour,
      // Топ User-Agent'ов
      topUserAgents,
      // Статистика по истечению сессий
      expirationStats,
    ] = await Promise.all([
      // Активные сессии по времени создания (приблизительно)
      db.select({
        hour: sql<string>`EXTRACT(HOUR FROM ${sessions.expire} - INTERVAL '1 hour')`,
        count: sql<number>`count(*)::int`,
      })
      .from(sessions)
      .where(sql`${sessions.expire} > ${now} AND ${sessions.expire} - INTERVAL '1 hour' >= ${last24Hours}`)
      .groupBy(sql`EXTRACT(HOUR FROM ${sessions.expire} - INTERVAL '1 hour')`)
      .orderBy(sql`EXTRACT(HOUR FROM ${sessions.expire} - INTERVAL '1 hour')`),

      // Топ User-Agent'ов из активных сессий
      db.select({
        userAgent: sql<string>`(${sessions.sess}->>'userAgent')`,
        count: sql<number>`count(*)::int`,
      })
      .from(sessions)
      .where(sql`${sessions.expire} > ${now} AND ${sessions.sess}->>'userAgent' IS NOT NULL`)
      .groupBy(sql`(${sessions.sess}->>'userAgent')`)
      .orderBy(sql`count(*) DESC`)
      .limit(5),

      // Статистика истечения сессий
      db.select({
        timeToExpire: sql<string>`
          CASE 
            WHEN ${sessions.expire} <= ${now} THEN 'expired'
            WHEN ${sessions.expire} <= ${now} + INTERVAL '1 hour' THEN 'expires_soon'
            WHEN ${sessions.expire} <= ${now} + INTERVAL '1 day' THEN 'expires_today'
            ELSE 'expires_later'
          END
        `,
        count: sql<number>`count(*)::int`,
      })
      .from(sessions)
      .groupBy(sql`
        CASE 
          WHEN ${sessions.expire} <= ${now} THEN 'expired'
          WHEN ${sessions.expire} <= ${now} + INTERVAL '1 hour' THEN 'expires_soon'
          WHEN ${sessions.expire} <= ${now} + INTERVAL '1 day' THEN 'expires_today'
          ELSE 'expires_later'
        END
      `),
    ]);

    return {
      sessionsByHour,
      topUserAgents,
      expirationStats,
    };
  }
}

export const adminStorage = new AdminStorage();
