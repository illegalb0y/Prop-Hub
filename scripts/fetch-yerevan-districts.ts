import { db } from "../server/db";
import { districts, districtGeometries } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const YEREVAN_CITY_ID = 6;

const districtSearchNames: Record<string, string[]> = {
  "Achapnyak": ["Achapnyak district Yerevan", "Ajapnyak Yerevan", " Աdelays համdelays", "Achapnyak Yerevan Armenia"],
  "Arabkir": ["Arabkir district Yerevan", "Arabkir Yerevan Armenia"],
  "Avan": ["Avan district Yerevan", "Avan Yerevan Armenia"],
  "Davtashen": ["Davtashen district Yerevan", "Davtashen Yerevan Armenia"],
  "Erebuni": ["Erebuni district Yerevan", "Erebuni Yerevan Armenia"],
  "Kentron": ["Kentron district Yerevan", "Kentron Yerevan Armenia", "Center district Yerevan"],
  "Malatia-Sebastia": ["Malatia-Sebastia district Yerevan", "Malatia Sebastia Yerevan Armenia"],
  "Nor Nork": ["Nor Nork district Yerevan", "Nor Nork Yerevan Armenia"],
  "Nork-Marash": ["Nork-Marash district Yerevan", "Nork Marash Yerevan Armenia"],
  "Nubarashen": ["Nubarashen district Yerevan", "Nubarashen Yerevan Armenia"],
  "Qanaqer-Zeytun": ["Kanaker-Zeytun district Yerevan", "Kanaker Zeytun Yerevan Armenia", "Qanaqer-Zeytun Yerevan"],
  "Shengavit": ["Shengavit district Yerevan", "Shengavit Yerevan Armenia"],
};

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  display_name: string;
  name?: string;
  boundingbox: string[];
  geojson?: GeoJSON.Geometry;
}

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "json",
    polygon_geojson: "1",
    limit: "5",
    countrycodes: "am",
  })}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "YerevanRealEstate/1.0 (development)",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  return response.json();
}

async function fetchDistrictFromNominatim(
  districtName: string,
  searchQueries: string[]
): Promise<{ geometry: GeoJSON.Geometry; osmId: number; osmType: string } | null> {
  for (const query of searchQueries) {
    console.log(`  Trying: "${query}"`);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const results = await searchNominatim(query);
      
      const adminResult = results.find(r => 
        (r.class === "boundary" && r.type === "administrative") ||
        (r.class === "place" && (r.type === "suburb" || r.type === "neighbourhood" || r.type === "quarter"))
      );

      if (adminResult && adminResult.geojson) {
        console.log(`  Found: ${adminResult.display_name} (${adminResult.osm_type}/${adminResult.osm_id})`);
        return {
          geometry: adminResult.geojson,
          osmId: adminResult.osm_id,
          osmType: adminResult.osm_type,
        };
      }
    } catch (error) {
      console.log(`  Error with query "${query}": ${error}`);
    }
  }
  
  return null;
}

async function fetchDistrictFromOverpass(osmId: number, osmType: string): Promise<GeoJSON.Geometry | null> {
  const typeChar = osmType === "relation" ? "rel" : osmType === "way" ? "way" : "node";
  
  const query = `[out:json][timeout:60];${typeChar}(${osmId});out geom;`;
  
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.elements || data.elements.length === 0) {
      return null;
    }

    const element = data.elements[0];
    if (element.type === "relation" && element.members) {
      const coordinates = extractPolygonFromMembers(element.members);
      if (coordinates) {
        return { type: "Polygon", coordinates };
      }
    }
  } catch (error) {
    console.log(`  Overpass error: ${error}`);
  }
  
  return null;
}

function extractPolygonFromMembers(members: any[]): number[][][] | null {
  const outerWays = members.filter(m => m.role === "outer" && m.geometry?.length > 0);
  
  if (outerWays.length === 0) return null;

  const segments = outerWays.map(w => w.geometry);
  const mergedRing = mergeWaySegments(segments);
  
  if (mergedRing && mergedRing.length > 2) {
    const coords = mergedRing.map((p: any) => [p.lon, p.lat]);
    if (coords[0][0] !== coords[coords.length-1][0] || coords[0][1] !== coords[coords.length-1][1]) {
      coords.push([...coords[0]]);
    }
    return [coords];
  }
  
  return null;
}

function mergeWaySegments(segments: any[]): any[] | null {
  if (!segments || segments.length === 0) return null;
  if (segments.length === 1) return segments[0];

  const remaining = segments.map(s => [...s]);
  const result = [...remaining.shift()!];
  const threshold = 0.00001;

  let iterations = 0;
  const maxIterations = remaining.length * remaining.length * 2;

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;
    let found = false;

    for (let i = 0; i < remaining.length; i++) {
      const seg = remaining[i];
      const rEnd = result[result.length - 1];
      const rStart = result[0];
      const sStart = seg[0];
      const sEnd = seg[seg.length - 1];

      if (Math.abs(rEnd.lat - sStart.lat) < threshold && Math.abs(rEnd.lon - sStart.lon) < threshold) {
        result.push(...seg.slice(1));
        remaining.splice(i, 1);
        found = true;
        break;
      }
      if (Math.abs(rEnd.lat - sEnd.lat) < threshold && Math.abs(rEnd.lon - sEnd.lon) < threshold) {
        result.push(...seg.slice(0, -1).reverse());
        remaining.splice(i, 1);
        found = true;
        break;
      }
      if (Math.abs(rStart.lat - sEnd.lat) < threshold && Math.abs(rStart.lon - sEnd.lon) < threshold) {
        result.unshift(...seg.slice(0, -1));
        remaining.splice(i, 1);
        found = true;
        break;
      }
      if (Math.abs(rStart.lat - sStart.lat) < threshold && Math.abs(rStart.lon - sStart.lon) < threshold) {
        result.unshift(...seg.slice(1).reverse());
        remaining.splice(i, 1);
        found = true;
        break;
      }
    }

    if (!found) break;
  }

  return result;
}

function calculateBounds(geometry: GeoJSON.Geometry): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  let minLat = Infinity, minLng = Infinity;
  let maxLat = -Infinity, maxLng = -Infinity;

  function processCoords(coords: any) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    } else {
      for (const c of coords) {
        processCoords(c);
      }
    }
  }

  if ("coordinates" in geometry) {
    processCoords(geometry.coordinates);
  }

  return { minLat, minLng, maxLat, maxLng };
}

async function main() {
  try {
    console.log("Starting Yerevan district boundary fetch via Nominatim...\n");

    const existingDistricts = await db
      .select()
      .from(districts)
      .where(eq(districts.cityId, YEREVAN_CITY_ID));

    console.log(`Found ${existingDistricts.length} districts in database:\n`);

    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const features: GeoJSON.Feature[] = [];
    const importResults: Array<{ district: string; status: string; error?: string }> = [];

    for (const dbDistrict of existingDistricts) {
      console.log(`\nProcessing: ${dbDistrict.name} (ID: ${dbDistrict.id})`);

      const searchQueries = districtSearchNames[dbDistrict.name];
      if (!searchQueries) {
        console.log(`  Warning: No search queries defined for "${dbDistrict.name}"`);
        importResults.push({ district: dbDistrict.name, status: "no_queries" });
        continue;
      }

      const result = await fetchDistrictFromNominatim(dbDistrict.name, searchQueries);

      if (!result) {
        console.log(`  Could not find geometry for "${dbDistrict.name}"`);
        importResults.push({ district: dbDistrict.name, status: "not_found" });
        continue;
      }

      let geometry = result.geometry;

      if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
        console.log(`  Geometry type is ${geometry.type}, trying Overpass for full geometry...`);
        const fullGeom = await fetchDistrictFromOverpass(result.osmId, result.osmType);
        if (fullGeom) {
          geometry = fullGeom;
        } else {
          console.log(`  Could not get polygon geometry for "${dbDistrict.name}"`);
          importResults.push({ district: dbDistrict.name, status: "no_polygon" });
          continue;
        }
      }

      const bounds = calculateBounds(geometry);

      const feature: GeoJSON.Feature = {
        type: "Feature",
        properties: {
          id: dbDistrict.id,
          name: dbDistrict.name,
          osmId: result.osmId,
          osmType: result.osmType,
        },
        geometry: geometry,
      };

      features.push(feature);

      const existingGeometry = await db
        .select()
        .from(districtGeometries)
        .where(eq(districtGeometries.districtId, dbDistrict.id));

      const geojsonData = {
        type: "Feature" as const,
        properties: {
          id: dbDistrict.id,
          name: dbDistrict.name,
        },
        geometry: geometry,
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
    console.log("\n\nSaved processed GeoJSON to data/yerevan-districts.geojson");

    console.log("\n=== Import Summary ===");
    const inserted = importResults.filter(r => r.status === "inserted").length;
    const updated = importResults.filter(r => r.status === "updated").length;
    const notFound = importResults.filter(r => r.status === "not_found").length;
    const noPolygon = importResults.filter(r => r.status === "no_polygon").length;

    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Not found: ${notFound}`);
    console.log(`No polygon: ${noPolygon}`);

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
