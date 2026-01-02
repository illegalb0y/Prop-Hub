import { z } from "zod";

export const projectFiltersSchema = z.object({
  q: z.string().max(100).optional(),
  cityId: z.union([z.string(), z.array(z.string())]).optional().transform(v => 
    v ? (Array.isArray(v) ? v.map(Number).filter(n => !isNaN(n)) : [Number(v)].filter(n => !isNaN(n))) : undefined
  ),
  districtId: z.union([z.string(), z.array(z.string())]).optional().transform(v => 
    v ? (Array.isArray(v) ? v.map(Number).filter(n => !isNaN(n)) : [Number(v)].filter(n => !isNaN(n))) : undefined
  ),
  developerId: z.union([z.string(), z.array(z.string())]).optional().transform(v => 
    v ? (Array.isArray(v) ? v.map(Number).filter(n => !isNaN(n)) : [Number(v)].filter(n => !isNaN(n))) : undefined
  ),
  bankId: z.union([z.string(), z.array(z.string())]).optional().transform(v => 
    v ? (Array.isArray(v) ? v.map(Number).filter(n => !isNaN(n)) : [Number(v)].filter(n => !isNaN(n))) : undefined
  ),
  sort: z.enum(["newest", "price_asc", "price_desc", "completion_soonest", "name_asc"]).default("newest"),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const favoriteSchema = z.object({
  projectId: z.number().int().positive(),
});

export const historySchema = z.object({
  projectId: z.number().int().positive(),
  source: z.string().max(50).default("listing_card"),
});

export const ipBanSchema = z.object({
  ip: z.string().ip(),
  cidr: z.string().max(50).optional(),
  reason: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});

export const userBanSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).default("1").transform(Number),
  limit: z.string().regex(/^\d+$/).default("20").transform(n => Math.min(Number(n), 100)),
  search: z.string().max(100).optional(),
});
