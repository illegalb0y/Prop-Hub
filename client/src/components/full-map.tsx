import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  GeoJSON,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { ProjectWithRelations } from "@shared/schema";
import { useTheme } from "@/lib/theme-provider";
import { ProjectMarkerPopup } from "./project-marker-popup";

const defaultCenter: [number, number] = [40.1792, 44.5152];
const defaultZoom = 13;

const markerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="marker-dot" style="
    width: 20px;
    height: 20px;
    background: black;
    border: 6px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface MapUpdaterProps {
  projects: ProjectWithRelations[];
}

const YEREVAN_CITY_ID = 6;

const defaultStyle: L.PathOptions = {
  color: "#2B2B2B",
  weight: 2,
  opacity: 0.8,
  fillOpacity: 0.05,
};

const hoverStyle: L.PathOptions = {
  color: "#0066FF",
  weight: 3,
  opacity: 1,
  fillOpacity: 0.15,
};

function MapUpdater({ projects }: MapUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (projects.length > 0) {
      const yerevanProjects = projects.filter(
        (p) =>
          p.latitude > 39.5 &&
          p.latitude < 41.5 &&
          p.longitude > 43.5 &&
          p.longitude < 45.5,
      );

      if (yerevanProjects.length > 0) {
        const bounds = L.latLngBounds(
          yerevanProjects.map(
            (p) => [p.latitude, p.longitude] as [number, number],
          ),
        );
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
      } else {
        const bounds = L.latLngBounds(
          projects.map((p) => [p.latitude, p.longitude] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
      }
    }
  }, [projects, map]);

  return null;
}

// Новый компонент для настройки позиции zoom контролов
function ZoomControlSetup() {
  const map = useMap();

  useEffect(() => {
    // Удаляем стандартный zoom control (если есть)
    if (map.zoomControl) {
      map.zoomControl.remove();
    }

    // Добавляем новый zoom control в правую часть карты
    const zoomControl = L.control.zoom({
      position: 'topright'
    });

    zoomControl.addTo(map);

    return () => {
      map.removeControl(zoomControl);
    };
  }, [map]);

  return null;
}

interface FullMapProps {
  projects: ProjectWithRelations[];
}

export function FullMap({ projects }: FullMapProps) {
  const { theme } = useTheme();
  const [, navigate] = useLocation();

  const { data: districtBorders } = useQuery<GeoJSON.FeatureCollection>({
    queryKey: ["/api/geo/district-borders", YEREVAN_CITY_ID],
    queryFn: async () => {
      const res = await fetch(
        `/api/geo/district-borders?cityId=${YEREVAN_CITY_ID}`,
      );
      return res.json();
    },
  });

  const center: [number, number] =
    projects.length > 0
      ? [projects[0].latitude, projects[0].longitude]
      : defaultCenter;

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    const pathLayer = layer as L.Path;
    const name = feature.properties?.name || "District";

    pathLayer.bindTooltip(name, {
      sticky: true,
      className: "district-tooltip",
    });

    pathLayer.on({
      mouseover: (e) => {
        const target = e.target as L.Path;
        target.setStyle(hoverStyle);
        target.bringToFront();
      },
      mouseout: (e) => {
        const target = e.target as L.Path;
        target.setStyle(defaultStyle);
      },
    });
  };

  return (
    <div className="h-full w-full" data-testid="full-map-container">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={
            theme === "dark"
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          key={theme}
        />
        {/* Добавляем компонент для настройки zoom контролов */}
        <ZoomControlSetup />


        {districtBorders && (
          <GeoJSON
            key="district-borders"
            data={districtBorders}
            style={defaultStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {projects.length > 0 && <MapUpdater projects={projects} />}

        {projects.map((project) => (
          <Marker
            key={project.id}
            position={[project.latitude, project.longitude]}
            icon={markerIcon}
            eventHandlers={{
              click: () => navigate(`/projects/${project.id}`),
            }}
          >
            <Tooltip 
              direction="auto" 
              offset={[0, -10]} 
              opacity={1} 
              className="custom-marker-tooltip"
              sticky={false}
              permanent={false}
            >
              <ProjectMarkerPopup project={project} />
            </Tooltip>
            <Popup className="custom-marker-popup">
              <div 
                onClick={() => navigate(`/projects/${project.id}`)}
                className="cursor-pointer"
              >
                <ProjectMarkerPopup project={project} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
