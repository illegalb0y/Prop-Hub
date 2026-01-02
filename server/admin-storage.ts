import { db } from "./db";
import {
  users, projects, ipBans, importJobs, importJobErrors, auditLogs,
  type User, type IpBan, type ImportJob, type ImportJobError, type AuditLog,
  type InsertIpBan, type InsertImportJob, type InsertImportJobError, type InsertAuditLog,
} from "@shared/schema";
import { eq, isNull, or, gt, ilike, desc, sql, and } from "drizzle-orm";

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

  async getImportJobs(page: number, limit: number): Promise<PaginatedResult<ImportJob>> {
    const offset = (page - 1) * limit;
    
    const [data, [{ count }]] = await Promise.all([
      db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(importJobs),
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
      recentImports,
    ] = await Promise.all([
      db.select({ userCount: sql<number>`count(*)::int` }).from(users),
      db.select({ projectCount: sql<number>`count(*)::int` }).from(projects).where(isNull(projects.deletedAt)),
      db.select({ bannedUserCount: sql<number>`count(*)::int` }).from(users).where(sql`${users.bannedAt} IS NOT NULL`),
      db.select({ ipBanCount: sql<number>`count(*)::int` }).from(ipBans),
      db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(5),
    ]);

    return {
      userCount,
      projectCount,
      bannedUserCount,
      ipBanCount,
      recentImports,
    };
  }
}

export const adminStorage = new AdminStorage();
