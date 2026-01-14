import { db } from "../server/db";
import { districts, districtGeometries } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const YEREVAN_CITY_ID = 6;

const districtNameMapping: Record<string, string> = {
  "Achapnyak": "Achapnyak",
  "Arabkir": "Arabkir",
  "Avan": "Avan",
  "Davtashen": "Davtashen",
  "Erebuni": "Erebuni",
  "Kentron": "Kentron",
  "Malatia-Sebastia": "Malatia-Sebastia",
  "Nor Nork": "Nor Nork",
  "Nork-Marash": "Nork-Marash",
  "Nubarashen": "Nubarashen",
  "Kanaker-Zeytun": "Qanaqer-Zeytun",
  "Qanaqer-Zeytun": "Qanaqer-Zeytun",
  "Shengavit": "Shengavit",
  "Nor-Nork": "Nor Nork",
  "Nork Marash": "Nork-Marash",
  "Malatia Sebastia": "Malatia-Sebastia",
  "Ачапняк": "Achapnyak",
  "Арабкир": "Arabkir",
  "Аван": "Avan",
  "Давташен": "Davtashen",
  "Эребуни": "Erebuni",
  "Кентрон": "Kentron",
  "Малатия-Себастия": "Malatia-Sebastia",
  "Нор Норк": "Nor Nork",
  "Норк-Мараш": "Nork-Marash",
  "Нубарашен": "Nubarashen",
  "Канакер-Зейтун": "Qanaqer-Zeytun",
  "Шенгавит": "Shengavit",
};

interface OSMElement {
  type: string;
  id: number;
  tags?: {
    name?: string;
    "name:en"?: string;
    "name:hy"?: string;
    admin_level?: string;
    boundary?: string;
  };
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
  geometry?: Array<{ lat: number; lon: number }>;
}

interface OverpassResponse {
  elements: OSMElement[];
}

async function fetchDistrictBoundaries(): Promise<OverpassResponse> {
  const overpassQuery = `
[out:json][timeout:60];
area["name"="Yerevan"]["admin_level"="4"]->.yerevan;
(
  relation["admin_level"="9"]["boundary"="administrative"](area.yerevan);
);
out body;
>;
out skel qt;
`;

  console.log("Fetching district boundaries from Overpass API...");
  
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchDistrictBoundariesWithGeometry(): Promise<OverpassResponse> {
  const overpassQuery = `
[out:json][timeout:120];
area["name"="Yerevan"]["admin_level"="4"]->.yerevan;
relation["admin_level"="9"]["boundary"="administrative"](area.yerevan);
out geom;
`;

  console.log("Fetching district boundaries with geometry from Overpass API...");
  
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function extractPolygonFromRelation(relation: OSMElement): number[][][] | null {
  if (!relation.members) return null;

  const outerWays = relation.members.filter(
    (m) => m.role === "outer" && m.geometry && m.geometry.length > 0
  );

  if (outerWays.length === 0) return null;

  const coordinates: number[][][] = [];
  
  for (const way of outerWays) {
    if (way.geometry) {
      const ring = way.geometry.map((point) => [point.lon, point.lat]);
      if (ring.length > 0) {
        if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
          ring.push([...ring[0]]);
        }
        coordinates.push(ring);
      }
    }
  }

  if (coordinates.length === 0) return null;
  
  if (coordinates.length === 1) {
    return coordinates;
  }
  
  const mergedRing = mergeWaySegments(outerWays.map(w => w.geometry!));
  if (mergedRing && mergedRing.length > 0) {
    return [mergedRing.map(p => [p.lon, p.lat])];
  }

  return coordinates;
}

function mergeWaySegments(segments: Array<Array<{ lat: number; lon: number }>>): Array<{ lat: number; lon: number }> | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];

  const remainingSegments = [...segments];
  const result: Array<{ lat: number; lon: number }> = [...remainingSegments.shift()!];

  const maxIterations = remainingSegments.length * remainingSegments.length;
  let iterations = 0;

  while (remainingSegments.length > 0 && iterations < maxIterations) {
    iterations++;
    let found = false;

    for (let i = 0; i < remainingSegments.length; i++) {
      const segment = remainingSegments[i];
      const resultStart = result[0];
      const resultEnd = result[result.length - 1];
      const segmentStart = segment[0];
      const segmentEnd = segment[segment.length - 1];

      const threshold = 0.0001;

      if (Math.abs(resultEnd.lat - segmentStart.lat) < threshold && 
          Math.abs(resultEnd.lon - segmentStart.lon) < threshold) {
        result.push(...segment.slice(1));
        remainingSegments.splice(i, 1);
        found = true;
        break;
      } else if (Math.abs(resultEnd.lat - segmentEnd.lat) < threshold && 
                 Math.abs(resultEnd.lon - segmentEnd.lon) < threshold) {
        result.push(...segment.slice(0, -1).reverse());
        remainingSegments.splice(i, 1);
        found = true;
        break;
      } else if (Math.abs(resultStart.lat - segmentEnd.lat) < threshold && 
                 Math.abs(resultStart.lon - segmentEnd.lon) < threshold) {
        result.unshift(...segment.slice(0, -1));
        remainingSegments.splice(i, 1);
        found = true;
        break;
      } else if (Math.abs(resultStart.lat - segmentStart.lat) < threshold && 
                 Math.abs(resultStart.lon - segmentStart.lon) < threshold) {
        result.unshift(...segment.slice(1).reverse());
        remainingSegments.splice(i, 1);
        found = true;
        break;
      }
    }

    if (!found) break;
  }

  if (result.length > 0 && 
      (result[0].lat !== result[result.length - 1].lat || 
       result[0].lon !== result[result.length - 1].lon)) {
    result.push({ ...result[0] });
  }

  return result;
}

function calculateBounds(coordinates: number[][][]): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  let minLat = Infinity, minLng = Infinity;
  let maxLat = -Infinity, maxLng = -Infinity;

  for (const ring of coordinates) {
    for (const [lng, lat] of ring) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }

  return { minLat, minLng, maxLat, maxLng };
}

function normalizeDistrictName(name: string): string {
  if (districtNameMapping[name]) {
    return districtNameMapping[name];
  }
  
  const normalized = name
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  
  if (districtNameMapping[normalized]) {
    return districtNameMapping[normalized];
  }
  
  return normalized;
}

async function main() {
  try {
    console.log("Starting Yerevan district boundary fetch...\n");

    const existingDistricts = await db
      .select()
      .from(districts)
      .where(eq(districts.cityId, YEREVAN_CITY_ID));

    console.log(`Found ${existingDistricts.length} districts in database:`);
    existingDistricts.forEach(d => console.log(`  - ${d.name} (ID: ${d.id})`));
    console.log();

    const osmData = await fetchDistrictBoundariesWithGeometry();
    
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(dataDir, "yerevan-districts-osm-raw.json"),
      JSON.stringify(osmData, null, 2)
    );
    console.log("Saved raw OSM data to data/yerevan-districts-osm-raw.json\n");

    const relations = osmData.elements.filter(
      (e) => e.type === "relation" && e.tags?.boundary === "administrative"
    );

    console.log(`Found ${relations.length} administrative relations in OSM data:`);
    relations.forEach(r => {
      const name = r.tags?.["name:en"] || r.tags?.name || "Unknown";
      console.log(`  - ${name} (OSM ID: ${r.id})`);
    });
    console.log();

    const features: GeoJSON.Feature[] = [];
    const importResults: Array<{ district: string; status: string; error?: string }> = [];

    for (const relation of relations) {
      const osmName = relation.tags?.["name:en"] || relation.tags?.name || "";
      const normalizedName = normalizeDistrictName(osmName);
      
      console.log(`Processing: ${osmName} -> ${normalizedName}`);

      const dbDistrict = existingDistricts.find(
        d => d.name.toLowerCase() === normalizedName.toLowerCase()
      );

      if (!dbDistrict) {
        console.log(`  Warning: No matching district found in database for "${osmName}"`);
        importResults.push({ district: osmName, status: "no_match" });
        continue;
      }

      const coordinates = extractPolygonFromRelation(relation);
      
      if (!coordinates || coordinates.length === 0) {
        console.log(`  Warning: Could not extract polygon for "${osmName}"`);
        importResults.push({ district: osmName, status: "no_geometry" });
        continue;
      }

      const bounds = calculateBounds(coordinates);

      const feature: GeoJSON.Feature = {
        type: "Feature",
        properties: {
          id: dbDistrict.id,
          name: dbDistrict.name,
          osmId: relation.id,
          osmName: osmName,
        },
        geometry: {
          type: "Polygon",
          coordinates: coordinates,
        },
      };

      features.push(feature);

      const existingGeometry = await db
        .select()
        .from(districtGeometries)
        .where(eq(districtGeometries.districtId, dbDistrict.id));

      const geojsonData = {
        type: "Feature",
        properties: {
          id: dbDistrict.id,
          name: dbDistrict.name,
        },
        geometry: feature.geometry,
      };

      if (existingGeometry.length > 0) {
        await db
          .update(districtGeometries)
          .set({
            geojson: geojsonData,
            minLat: bounds.minLat,
            minLng: bounds.minLng,
            maxLat: bounds.maxLat,
            maxLng: bounds.maxLng,
            source: "OpenStreetMap",
            updatedAt: new Date(),
          })
          .where(eq(districtGeometries.districtId, dbDistrict.id));
        
        console.log(`  Updated geometry for ${dbDistrict.name}`);
        importResults.push({ district: dbDistrict.name, status: "updated" });
      } else {
        await db.insert(districtGeometries).values({
          cityId: YEREVAN_CITY_ID,
          districtId: dbDistrict.id,
          geojson: geojsonData,
          minLat: bounds.minLat,
          minLng: bounds.minLng,
          maxLat: bounds.maxLat,
          maxLng: bounds.maxLng,
          source: "OpenStreetMap",
        });
        
        console.log(`  Inserted geometry for ${dbDistrict.name}`);
        importResults.push({ district: dbDistrict.name, status: "inserted" });
      }
    }

    const featureCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: features,
    };

    fs.writeFileSync(
      path.join(dataDir, "yerevan-districts.geojson"),
      JSON.stringify(featureCollection, null, 2)
    );
    console.log("\nSaved processed GeoJSON to data/yerevan-districts.geojson");

    console.log("\n=== Import Summary ===");
    const inserted = importResults.filter(r => r.status === "inserted").length;
    const updated = importResults.filter(r => r.status === "updated").length;
    const noMatch = importResults.filter(r => r.status === "no_match").length;
    const noGeometry = importResults.filter(r => r.status === "no_geometry").length;

    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`No match in DB: ${noMatch}`);
    console.log(`No geometry: ${noGeometry}`);

    const finalCount = await db
      .select()
      .from(districtGeometries)
      .where(eq(districtGeometries.cityId, YEREVAN_CITY_ID));
    
    console.log(`\nTotal district geometries in database for Yerevan: ${finalCount.length}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
