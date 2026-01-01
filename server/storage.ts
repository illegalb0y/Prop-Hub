import {
  cities, districts, developers, banks, projects, favorites, viewHistory,
  developerBanks, projectBanks,
  type City, type InsertCity,
  type District, type InsertDistrict,
  type Developer, type InsertDeveloper,
  type Bank, type InsertBank,
  type Project, type InsertProject,
  type Favorite, type InsertFavorite,
  type ViewHistory, type InsertViewHistory,
  type ProjectWithRelations, type DeveloperWithStats, type BankWithDevelopers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, or, desc, asc, inArray, sql } from "drizzle-orm";

export interface IStorage {
  getCities(): Promise<City[]>;
  getCity(id: number): Promise<City | undefined>;
  createCity(city: InsertCity): Promise<City>;

  getDistricts(): Promise<District[]>;
  getDistrictsByCityId(cityId: number): Promise<District[]>;
  getDistrict(id: number): Promise<District | undefined>;
  createDistrict(district: InsertDistrict): Promise<District>;

  getDevelopers(): Promise<DeveloperWithStats[]>;
  getDeveloper(id: number): Promise<Developer | undefined>;
  createDeveloper(developer: InsertDeveloper): Promise<Developer>;

  getBanks(): Promise<Bank[]>;
  getBank(id: number): Promise<Bank | undefined>;
  getBankDevelopers(bankId: number): Promise<DeveloperWithStats[]>;
  createBank(bank: InsertBank): Promise<Bank>;

  getProjects(filters: ProjectFilters): Promise<ProjectWithRelations[]>;
  getProject(id: number): Promise<ProjectWithRelations | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  addProjectBank(projectId: number, bankId: number): Promise<void>;
  addDeveloperBank(developerId: number, bankId: number): Promise<void>;

  getUserFavorites(userId: string): Promise<Favorite[]>;
  getUserFavoriteProjects(userId: string): Promise<ProjectWithRelations[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, projectId: number): Promise<void>;
  isFavorite(userId: string, projectId: number): Promise<boolean>;

  getUserHistory(userId: string): Promise<(ViewHistory & { project: ProjectWithRelations })[]>;
  addToHistory(history: InsertViewHistory): Promise<ViewHistory>;
}

export interface ProjectFilters {
  q?: string;
  cityIds?: number[];
  districtIds?: number[];
  developerIds?: number[];
  bankIds?: number[];
  sort?: "newest" | "price_asc" | "price_desc" | "completion_soonest" | "name_asc";
}

export class DatabaseStorage implements IStorage {
  async getCities(): Promise<City[]> {
    return db.select().from(cities).orderBy(asc(cities.name));
  }

  async getCity(id: number): Promise<City | undefined> {
    const [city] = await db.select().from(cities).where(eq(cities.id, id));
    return city;
  }

  async createCity(city: InsertCity): Promise<City> {
    const [created] = await db.insert(cities).values(city).returning();
    return created;
  }

  async getDistricts(): Promise<District[]> {
    return db.select().from(districts).orderBy(asc(districts.name));
  }

  async getDistrictsByCityId(cityId: number): Promise<District[]> {
    return db.select().from(districts).where(eq(districts.cityId, cityId)).orderBy(asc(districts.name));
  }

  async getDistrict(id: number): Promise<District | undefined> {
    const [district] = await db.select().from(districts).where(eq(districts.id, id));
    return district;
  }

  async createDistrict(district: InsertDistrict): Promise<District> {
    const [created] = await db.insert(districts).values(district).returning();
    return created;
  }

  async getDevelopers(): Promise<DeveloperWithStats[]> {
    const devs = await db.select().from(developers).orderBy(asc(developers.name));
    const result: DeveloperWithStats[] = [];
    
    for (const dev of devs) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(eq(projects.developerId, dev.id));
      result.push({ ...dev, projectCount: count });
    }
    
    return result;
  }

  async getDeveloper(id: number): Promise<Developer | undefined> {
    const [developer] = await db.select().from(developers).where(eq(developers.id, id));
    return developer;
  }

  async createDeveloper(developer: InsertDeveloper): Promise<Developer> {
    const [created] = await db.insert(developers).values(developer).returning();
    return created;
  }

  async getBanks(): Promise<Bank[]> {
    return db.select().from(banks).orderBy(asc(banks.name));
  }

  async getBank(id: number): Promise<Bank | undefined> {
    const [bank] = await db.select().from(banks).where(eq(banks.id, id));
    return bank;
  }

  async getBankDevelopers(bankId: number): Promise<DeveloperWithStats[]> {
    const devBanks = await db
      .select()
      .from(developerBanks)
      .where(eq(developerBanks.bankId, bankId));
    
    if (devBanks.length === 0) return [];
    
    const devIds = devBanks.map(db => db.developerId);
    const devs = await db.select().from(developers).where(inArray(developers.id, devIds));
    
    const result: DeveloperWithStats[] = [];
    for (const dev of devs) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(eq(projects.developerId, dev.id));
      result.push({ ...dev, projectCount: count });
    }
    
    return result;
  }

  async createBank(bank: InsertBank): Promise<Bank> {
    const [created] = await db.insert(banks).values(bank).returning();
    return created;
  }

  async addProjectBank(projectId: number, bankId: number): Promise<void> {
    await db.insert(projectBanks).values({ projectId, bankId }).onConflictDoNothing();
  }

  async addDeveloperBank(developerId: number, bankId: number): Promise<void> {
    await db.insert(developerBanks).values({ developerId, bankId }).onConflictDoNothing();
  }

  async getProjects(filters: ProjectFilters): Promise<ProjectWithRelations[]> {
    let query = db.select().from(projects);
    const conditions: any[] = [];

    if (filters.q) {
      conditions.push(
        or(
          ilike(projects.name, `%${filters.q}%`),
          ilike(projects.shortDescription, `%${filters.q}%`),
          ilike(projects.address, `%${filters.q}%`)
        )
      );
    }

    if (filters.cityIds && filters.cityIds.length > 0) {
      conditions.push(inArray(projects.cityId, filters.cityIds));
    }

    if (filters.districtIds && filters.districtIds.length > 0) {
      conditions.push(inArray(projects.districtId, filters.districtIds));
    }

    if (filters.developerIds && filters.developerIds.length > 0) {
      conditions.push(inArray(projects.developerId, filters.developerIds));
    }

    const baseProjects = await db
      .select()
      .from(projects)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        filters.sort === "price_asc" ? asc(projects.priceFrom) :
        filters.sort === "price_desc" ? desc(projects.priceFrom) :
        filters.sort === "completion_soonest" ? asc(projects.completionDate) :
        filters.sort === "name_asc" ? asc(projects.name) :
        desc(projects.createdAt)
      );

    let filteredProjects = baseProjects;
    
    if (filters.bankIds && filters.bankIds.length > 0) {
      const projectsWithBanks = await db
        .select({ projectId: projectBanks.projectId })
        .from(projectBanks)
        .where(inArray(projectBanks.bankId, filters.bankIds));
      const projectIdsWithBanks = new Set(projectsWithBanks.map(pb => pb.projectId));
      filteredProjects = baseProjects.filter(p => projectIdsWithBanks.has(p.id));
    }

    const result: ProjectWithRelations[] = [];
    for (const project of filteredProjects) {
      const [developer] = await db.select().from(developers).where(eq(developers.id, project.developerId));
      const [city] = await db.select().from(cities).where(eq(cities.id, project.cityId));
      const [district] = await db.select().from(districts).where(eq(districts.id, project.districtId));
      
      const pBanks = await db
        .select()
        .from(projectBanks)
        .innerJoin(banks, eq(projectBanks.bankId, banks.id))
        .where(eq(projectBanks.projectId, project.id));
      
      result.push({
        ...project,
        developer,
        city,
        district,
        banks: pBanks.map(pb => pb.banks),
      });
    }

    return result;
  }

  async getProject(id: number): Promise<ProjectWithRelations | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    const [developer] = await db.select().from(developers).where(eq(developers.id, project.developerId));
    const [city] = await db.select().from(cities).where(eq(cities.id, project.cityId));
    const [district] = await db.select().from(districts).where(eq(districts.id, project.districtId));
    
    const pBanks = await db
      .select()
      .from(projectBanks)
      .innerJoin(banks, eq(projectBanks.bankId, banks.id))
      .where(eq(projectBanks.projectId, project.id));

    return {
      ...project,
      developer,
      city,
      district,
      banks: pBanks.map(pb => pb.banks),
    };
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
  }

  async getUserFavoriteProjects(userId: string): Promise<ProjectWithRelations[]> {
    const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, userId));
    if (userFavorites.length === 0) return [];

    const projectIds = userFavorites.map(f => f.projectId);
    const result: ProjectWithRelations[] = [];

    for (const projectId of projectIds) {
      const project = await this.getProject(projectId);
      if (project) result.push(project);
    }

    return result;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [created] = await db.insert(favorites).values(favorite).returning();
    return created;
  }

  async removeFavorite(userId: string, projectId: number): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.projectId, projectId))
    );
  }

  async isFavorite(userId: string, projectId: number): Promise<boolean> {
    const [fav] = await db.select().from(favorites).where(
      and(eq(favorites.userId, userId), eq(favorites.projectId, projectId))
    );
    return !!fav;
  }

  async getUserHistory(userId: string): Promise<(ViewHistory & { project: ProjectWithRelations })[]> {
    const history = await db
      .select()
      .from(viewHistory)
      .where(eq(viewHistory.userId, userId))
      .orderBy(desc(viewHistory.viewedAt))
      .limit(50);

    const result: (ViewHistory & { project: ProjectWithRelations })[] = [];
    for (const item of history) {
      const project = await this.getProject(item.projectId);
      if (project) {
        result.push({ ...item, project });
      }
    }

    return result;
  }

  async addToHistory(history: InsertViewHistory): Promise<ViewHistory> {
    const [created] = await db.insert(viewHistory).values(history).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
