import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Cities table
export const cities = pgTable("cities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const citiesRelations = relations(cities, ({ many }) => ({
  districts: many(districts),
  projects: many(projects),
}));

export const insertCitySchema = createInsertSchema(cities).omit({ id: true });
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof cities.$inferSelect;

// Districts table
export const districts = pgTable("districts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  cityId: integer("city_id").notNull().references(() => cities.id),
});

export const districtsRelations = relations(districts, ({ one, many }) => ({
  city: one(cities, { fields: [districts.cityId], references: [cities.id] }),
  projects: many(projects),
}));

export const insertDistrictSchema = createInsertSchema(districts).omit({ id: true });
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districts.$inferSelect;

// District Geometries table (for map polygon overlays)
export const districtGeometries = pgTable("district_geometries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cityId: integer("city_id").notNull().references(() => cities.id),
  districtId: integer("district_id").notNull().references(() => districts.id).unique(),
  geojson: jsonb("geojson").notNull(),
  minLat: real("min_lat"),
  minLng: real("min_lng"),
  maxLat: real("max_lat"),
  maxLng: real("max_lng"),
  source: text("source"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_district_geometries_city").on(table.cityId),
  index("idx_district_geometries_district").on(table.districtId),
]);

export const districtGeometriesRelations = relations(districtGeometries, ({ one }) => ({
  city: one(cities, { fields: [districtGeometries.cityId], references: [cities.id] }),
  district: one(districts, { fields: [districtGeometries.districtId], references: [districts.id] }),
}));

export const insertDistrictGeometrySchema = createInsertSchema(districtGeometries).omit({ id: true, updatedAt: true });
export type InsertDistrictGeometry = z.infer<typeof insertDistrictGeometrySchema>;
export type DistrictGeometry = typeof districtGeometries.$inferSelect;

// Developers table
export const developers = pgTable("developers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
});

export const developersRelations = relations(developers, ({ many }) => ({
  projects: many(projects),
  developerBanks: many(developerBanks),
}));

export const insertDeveloperSchema = createInsertSchema(developers).omit({ id: true });
export type InsertDeveloper = z.infer<typeof insertDeveloperSchema>;
export type Developer = typeof developers.$inferSelect;

// Banks table
export const banks = pgTable("banks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
});

export const banksRelations = relations(banks, ({ many }) => ({
  developerBanks: many(developerBanks),
  projectBanks: many(projectBanks),
}));

export const insertBankSchema = createInsertSchema(banks).omit({ id: true });
export type InsertBank = z.infer<typeof insertBankSchema>;
export type Bank = typeof banks.$inferSelect;

// Developer-Bank association (many-to-many)
export const developerBanks = pgTable("developer_banks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  developerId: integer("developer_id").notNull().references(() => developers.id),
  bankId: integer("bank_id").notNull().references(() => banks.id),
});

export const developerBanksRelations = relations(developerBanks, ({ one }) => ({
  developer: one(developers, { fields: [developerBanks.developerId], references: [developers.id] }),
  bank: one(banks, { fields: [developerBanks.bankId], references: [banks.id] }),
}));

// Projects table
export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  developerId: integer("developer_id").notNull().references(() => developers.id),
  cityId: integer("city_id").notNull().references(() => cities.id),
  districtId: integer("district_id").notNull().references(() => districts.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  shortDescription: text("short_description"),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  images: text("images").array(),
  priceFrom: integer("price_from"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  completionDate: timestamp("completion_date"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_projects_city").on(table.cityId),
  index("idx_projects_district").on(table.districtId),
  index("idx_projects_developer").on(table.developerId),
  index("idx_projects_created").on(table.createdAt),
  index("idx_projects_price").on(table.priceFrom),
]);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  developer: one(developers, { fields: [projects.developerId], references: [developers.id] }),
  city: one(cities, { fields: [projects.cityId], references: [cities.id] }),
  district: one(districts, { fields: [projects.districtId], references: [districts.id] }),
  projectBanks: many(projectBanks),
  favorites: many(favorites),
  viewHistory: many(viewHistory),
}));

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project-Bank association (many-to-many)
export const projectBanks = pgTable("project_banks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  bankId: integer("bank_id").notNull().references(() => banks.id),
});

export const projectBanksRelations = relations(projectBanks, ({ one }) => ({
  project: one(projects, { fields: [projectBanks.projectId], references: [projects.id] }),
  bank: one(banks, { fields: [projectBanks.bankId], references: [banks.id] }),
}));

// Favorites table (user-project)
export const favorites = pgTable("favorites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_favorites_user").on(table.userId),
  index("idx_favorites_project").on(table.projectId),
]);

export const favoritesRelations = relations(favorites, ({ one }) => ({
  project: one(projects, { fields: [favorites.projectId], references: [projects.id] }),
}));

export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// View History table
export const viewHistory = pgTable("view_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  source: varchar("source", { length: 50 }).default("listing_card"),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_history_user").on(table.userId),
  index("idx_history_viewed").on(table.viewedAt),
]);

export const viewHistoryRelations = relations(viewHistory, ({ one }) => ({
  project: one(projects, { fields: [viewHistory.projectId], references: [projects.id] }),
}));

export const insertViewHistorySchema = createInsertSchema(viewHistory).omit({ id: true, viewedAt: true });
export type InsertViewHistory = z.infer<typeof insertViewHistorySchema>;
export type ViewHistory = typeof viewHistory.$inferSelect;

// Extended types for API responses
export type ProjectWithRelations = Project & {
  developer: Developer;
  city: City;
  district: District;
  banks?: Bank[];
  isFavorite?: boolean;
};

export type DeveloperWithStats = Developer & {
  projectCount: number;
};

export type BankWithDevelopers = Bank & {
  developers: Developer[];
};
