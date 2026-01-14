# Yerevan District Boundaries Import Process

## Overview
The district boundaries for Yerevan were imported from OpenStreetMap (OSM) using the Nominatim API to ensure accurate geographic representation of the 12 city districts.

## Data Source
- **Provider**: OpenStreetMap (via Nominatim API)
- **Format**: GeoJSON (Polygon and MultiPolygon)
- **Coordinates**: WGS84 (Latitude/Longitude)

## Import Process
1. **Fetching**: A specialized script (`scripts/fetch-yerevan-districts.ts`) iterates through the 12 Yerevan districts.
2. **Geocoding**: It uses Nominatim to find the OSM Relation ID for each district (e.g., "Kentron District, Yerevan").
3. **Geometry Extraction**: It fetches the detailed boundary geometry using the OSM ID.
4. **Local Storage**: The raw data is saved to `data/yerevan-districts.geojson` for reference.
5. **Database Import**: The geometries are processed and inserted into the `district_geometries` table in the PostgreSQL database.

## Locations
- **Raw Data**: `data/yerevan-districts.geojson`
- **Database Table**: `district_geometries` (linked to the `districts` table via `district_id`)
- **Frontend API**: `/api/geo/district-borders?cityId=6`
- **Map Component**: `client/src/components/full-map.tsx`

## Database Structure
The `district_geometries` table stores:
- `geojson`: The GeoJSON geometry object.
- `min_lat`, `max_lat`, `min_lng`, `max_lng`: Bounding box for efficient map positioning.
- `source`: Set to "OpenStreetMap".