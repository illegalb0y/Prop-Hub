import { db } from "./db";
import {
  users, projects, ipBans, importJobs, importJobErrors, auditLogs, sessions,
  developers, banks, cities, districts,
  type User, type IpBan, type ImportJob, type ImportJobError, type AuditLog,
  type InsertIpBan, type InsertImportJob, type InsertImportJobError, type InsertAuditLog,
  type Developer, type InsertDeveloper, type Bank, type InsertBank,
} from "@shared/schema";
import { eq, isNull, or, gt, ilike, desc, sql, and, asc } from "drizzle-orm";

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

  async getProjectsForAdmin(page: number, limit: number, search?: string): Promise<PaginatedResult<any>> {
    const offset = (page - 1) * limit;

    let query = db.select({
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
    }).from(projects);

    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(projects);

    if (search) {
      const condition = ilike(projects.name, `%${search}%`);
      query = query.where(condition) as typeof query;
      countQuery = countQuery.where(condition) as typeof countQuery;
    }

    const [data, [{ count }]] = await Promise.all([
      query.orderBy(desc(projects.createdAt)).limit(limit).offset(offset),
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

  async updateProject(id: number, data: any): Promise<any> {
    const [updated] = await db.update(projects).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async getDevelopers(page: number, limit: number, search?: string): Promise<PaginatedResult<Developer & { projectCount: number }>> {
    const offset = (page - 1) * limit;
    
    let query = db.select().from(developers);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(developers);
    
    if (search) {
      const condition = ilike(developers.name, `%${search}%`);
      query = query.where(condition) as typeof query;
      countQuery = countQuery.where(condition) as typeof countQuery;
    }

    const [data, [{ count }]] = await Promise.all([
      query.orderBy(asc(developers.name)).limit(limit).offset(offset),
      countQuery,
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
    const [created] = await db.insert(developers).values(developer).returning();
    return created;
  }

  async updateDeveloper(id: number, data: Partial<InsertDeveloper>): Promise<Developer> {
    const [updated] = await db.update(developers).set(data).where(eq(developers.id, id)).returning();
    return updated;
  }

  async deleteDeveloper(id: number): Promise<void> {
    await db.delete(developers).where(eq(developers.id, id));
  }

  async getAllDevelopersForExport(): Promise<Developer[]> {
    return db.select().from(developers).orderBy(asc(developers.name));
  }

  async getBanks(page: number, limit: number, search?: string): Promise<PaginatedResult<Bank>> {
    const offset = (page - 1) * limit;
    
    let query = db.select().from(banks);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(banks);
    
    if (search) {
      const condition = ilike(banks.name, `%${search}%`);
      query = query.where(condition) as typeof query;
      countQuery = countQuery.where(condition) as typeof countQuery;
    }

    const [data, [{ count }]] = await Promise.all([
      query.orderBy(asc(banks.name)).limit(limit).offset(offset),
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

  async createBank(bank: InsertBank): Promise<Bank> {
    const [created] = await db.insert(banks).values(bank).returning();
    return created;
  }

  async updateBank(id: number, data: Partial<InsertBank>): Promise<Bank> {
    const [updated] = await db.update(banks).set(data).where(eq(banks.id, id)).returning();
    return updated;
  }

  async deleteBank(id: number): Promise<void> {
    await db.delete(banks).where(eq(banks.id, id));
  }

  async getAllBanksForExport(): Promise<Bank[]> {
    return db.select().from(banks).orderBy(asc(banks.name));
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
