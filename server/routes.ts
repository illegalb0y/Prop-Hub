import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, type ProjectFilters } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { projectsRateLimit, projectDetailRateLimit, userActionsRateLimit, authRateLimit } from "./middleware/rate-limit";
import { checkUserNotBanned } from "./middleware/rbac";
import { projectFiltersSchema, idParamSchema, favoriteSchema, historySchema } from "./middleware/validation";
import { registerAdminRoutes } from "./admin-routes";
import { trackAnalytics } from "./middleware/analytics-tracking";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerAdminRoutes(app);

  // Analytics tracking - отслеживаем активность пользователей
  app.use(trackAnalytics);

  app.get("/api/cities", async (req, res) => {
    try {
      const cities = await storage.getCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching cities:", error);
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  app.get("/api/districts", async (req, res) => {
    try {
      const cityId = req.query.cityId ? parseInt(req.query.cityId as string) : undefined;
      const districts = cityId 
        ? await storage.getDistrictsByCityId(cityId)
        : await storage.getDistricts();
      res.json(districts);
    } catch (error) {
      console.error("Error fetching districts:", error);
      res.status(500).json({ message: "Failed to fetch districts" });
    }
  });

  app.get("/api/geo/district-borders", async (req, res) => {
    try {
      const cityId = req.query.cityId ? parseInt(req.query.cityId as string) : undefined;
      if (!cityId) {
        return res.status(400).json({ message: "cityId is required" });
      }

      const geometries = await storage.getDistrictGeometries(cityId);

      const featureCollection = {
        type: "FeatureCollection",
        features: geometries.map((geo) => ({
          type: "Feature",
          id: geo.id,
          properties: {
            districtId: geo.districtId,
            name: geo.district.name,
          },
          geometry: geo.geojson,
        })),
      };

      res.setHeader("Cache-Control", "public, max-age=86400");
      res.json(featureCollection);
    } catch (error) {
      console.error("Error fetching district borders:", error);
      res.status(500).json({ message: "Failed to fetch district borders" });
    }
  });

  app.get("/api/developers", async (req, res) => {
    try {
      const developers = await storage.getDevelopers();
      res.json(developers);
    } catch (error) {
      console.error("Error fetching developers:", error);
      res.status(500).json({ message: "Failed to fetch developers" });
    }
  });

  app.get("/api/developers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const developer = await storage.getDeveloper(id);
      if (!developer) {
        return res.status(404).json({ message: "Developer not found" });
      }
      res.json(developer);
    } catch (error) {
      console.error("Error fetching developer:", error);
      res.status(500).json({ message: "Failed to fetch developer" });
    }
  });

  app.get("/api/banks", async (req, res) => {
    try {
      const banks = await storage.getBanks();
      res.json(banks);
    } catch (error) {
      console.error("Error fetching banks:", error);
      res.status(500).json({ message: "Failed to fetch banks" });
    }
  });

  app.get("/api/banks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bank = await storage.getBank(id);
      if (!bank) {
        return res.status(404).json({ message: "Bank not found" });
      }
      res.json(bank);
    } catch (error) {
      console.error("Error fetching bank:", error);
      res.status(500).json({ message: "Failed to fetch bank" });
    }
  });

  app.get("/api/banks/:id/developers", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const developers = await storage.getBankDevelopers(id);
      res.json(developers);
    } catch (error) {
      console.error("Error fetching bank developers:", error);
      res.status(500).json({ message: "Failed to fetch bank developers" });
    }
  });

  app.get("/api/projects", projectsRateLimit, async (req, res) => {
    try {
      const validatedQuery = projectFiltersSchema.safeParse(req.query);
      const query = validatedQuery.success ? validatedQuery.data : req.query;

      const filters: ProjectFilters = {
        q: query.q as string | undefined,
        cityIds: req.query.cityId ? (Array.isArray(req.query.cityId) 
          ? (req.query.cityId as string[]).map(Number)
          : [parseInt(req.query.cityId as string)]) : undefined,
        districtIds: req.query.districtId ? (Array.isArray(req.query.districtId)
          ? (req.query.districtId as string[]).map(Number)
          : [parseInt(req.query.districtId as string)]) : undefined,
        developerIds: req.query.developerId ? (Array.isArray(req.query.developerId)
          ? (req.query.developerId as string[]).map(Number)
          : [parseInt(req.query.developerId as string)]) : undefined,
        bankIds: req.query.bankId ? (Array.isArray(req.query.bankId)
          ? (req.query.bankId as string[]).map(Number)
          : [parseInt(req.query.bankId as string)]) : undefined,
        sort: req.query.sort as ProjectFilters["sort"] || "newest",
      };

      const projects = await storage.getProjects(filters);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", projectDetailRateLimit, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/me/favorites", isAuthenticated, checkUserNotBanned, userActionsRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.get("/api/me/favorites/projects", isAuthenticated, checkUserNotBanned, userActionsRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getUserFavoriteProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching favorite projects:", error);
      res.status(500).json({ message: "Failed to fetch favorite projects" });
    }
  });

  app.post("/api/me/favorites", isAuthenticated, checkUserNotBanned, userActionsRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = favoriteSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "projectId is required" });
      }

      const { projectId } = result.data;

      const exists = await storage.isFavorite(userId, projectId);
      if (exists) {
        return res.status(409).json({ message: "Already in favorites" });
      }

      const favorite = await storage.addFavorite({ userId, projectId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/me/favorites/:projectId", isAuthenticated, checkUserNotBanned, userActionsRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.projectId);

      await storage.removeFavorite(userId, projectId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  app.get("/api/me/history", isAuthenticated, checkUserNotBanned, userActionsRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getUserHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.post("/api/me/history", isAuthenticated, checkUserNotBanned, userActionsRateLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = historySchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "projectId is required" });
      }

      const { projectId, source } = result.data;

      const history = await storage.addToHistory({ userId, projectId, source });
      res.status(201).json(history);
    } catch (error) {
      console.error("Error adding to history:", error);
      res.status(500).json({ message: "Failed to add to history" });
    }
  });

  return httpServer;
}
