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
