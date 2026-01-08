import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  bannedAt: timestamp("banned_at"),
  bannedReason: text("banned_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// IP Bans table
export const ipBans = pgTable("ip_bans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ip: varchar("ip", { length: 45 }).notNull(),
  cidr: varchar("cidr", { length: 50 }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
}, (table) => [
  index("idx_ip_bans_ip").on(table.ip),
  index("idx_ip_bans_expires").on(table.expiresAt),
]);

export const insertIpBanSchema = createInsertSchema(ipBans).omit({ id: true, createdAt: true });
export type InsertIpBan = z.infer<typeof insertIpBanSchema>;
export type IpBan = typeof ipBans.$inferSelect;

// Import Jobs table
export const importJobs = pgTable("import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  totalRows: varchar("total_rows"),
  insertedCount: varchar("inserted_count"),
  updatedCount: varchar("updated_count"),
  failedCount: varchar("failed_count"),
  createdByAdminId: varchar("created_by_admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_import_jobs_status").on(table.status),
  index("idx_import_jobs_created").on(table.createdAt),
]);

export const insertImportJobSchema = createInsertSchema(importJobs).omit({ id: true, createdAt: true });
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

// Import Job Errors table
export const importJobErrors = pgTable("import_job_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importJobId: varchar("import_job_id").notNull().references(() => importJobs.id),
  rowNumber: varchar("row_number"),
  errorMessage: text("error_message"),
  rawRowJson: jsonb("raw_row_json"),
});

export const insertImportJobErrorSchema = createInsertSchema(importJobErrors).omit({ id: true });
export type InsertImportJobError = z.infer<typeof insertImportJobErrorSchema>;
export type ImportJobError = typeof importJobErrors.$inferSelect;

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: varchar("target_id"),
  ip: varchar("ip", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadataJson: jsonb("metadata_json"),
}, (table) => [
  index("idx_audit_logs_admin").on(table.adminId),
  index("idx_audit_logs_action").on(table.actionType),
  index("idx_audit_logs_created").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Analytics: User Sessions table
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  country: varchar("country", { length: 100 }),
  countryCode: varchar("country_code", { length: 10 }),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  deviceType: varchar("device_type", { length: 50 }),
  browser: varchar("browser", { length: 100 }),
  browserVersion: varchar("browser_version", { length: 50 }),
  os: varchar("os", { length: 100 }),
  osVersion: varchar("os_version", { length: 50 }),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
}, (table) => [
  index("idx_user_sessions_user").on(table.userId),
  index("idx_user_sessions_started").on(table.startedAt),
  index("idx_user_sessions_country").on(table.countryCode),
  index("idx_user_sessions_device").on(table.deviceType),
]);

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true });
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Analytics: User Actions table
export const userActions = pgTable("user_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  pageUrl: text("page_url"),
  targetType: varchar("target_type", { length: 50 }),
  targetId: varchar("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_user_actions_user").on(table.userId),
  index("idx_user_actions_type").on(table.actionType),
  index("idx_user_actions_created").on(table.createdAt),
  index("idx_user_actions_session").on(table.sessionId),
]);

export const insertUserActionSchema = createInsertSchema(userActions).omit({ id: true, createdAt: true });
export type InsertUserAction = z.infer<typeof insertUserActionSchema>;
export type UserAction = typeof userActions.$inferSelect;
