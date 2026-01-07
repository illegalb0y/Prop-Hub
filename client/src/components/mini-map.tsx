import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { ProjectWithRelations } from "@shared/schema";
import { useTheme } from "@/lib/theme-provider";

const defaultCenter: [number, number] = [40.1792, 44.5152];
const defaultZoom = 13;

const markerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div class="marker-dot" style="
    width: 16px;
    height: 16px;
    background: black;
    border: 5px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const selectedMarkerIcon = L.divIcon({
  className: "custom-marker-selected",
  html: `<div class="marker-dot-selected" style="
    width: 20px;
    height: 20px;
    background: black;
    border: 6px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface MapUpdaterProps {
  projects: ProjectWithRelations[];
}

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
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      } else {
        const bounds = L.latLngBounds(
          projects.map((p) => [p.latitude, p.longitude] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [projects, map]);

  return null;
}

interface MiniMapProps {
  projects: ProjectWithRelations[];
  selectedProjectId?: number | null;
  onMarkerClick?: (projectId: number) => void;
  className?: string;
}

export function MiniMap({
  projects,
  selectedProjectId,
  onMarkerClick,
  className = "",
}: MiniMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { theme } = useTheme();

  const center: [number, number] =
    projects.length > 0
      ? [projects[0].latitude, projects[0].longitude]
      : defaultCenter;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-testid="mini-map-container"
    >
      <MapContainer
        center={center}
        zoom={defaultZoom}
        className="h-full w-full"
        ref={mapRef}
        zoomControl={true}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={
            theme === "dark"
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />

        {projects.length > 0 && <MapUpdater projects={projects} />}

        {projects.map((project) => (
          <Marker
            key={project.id}
            position={[project.latitude, project.longitude]}
            icon={
              project.id === selectedProjectId ? selectedMarkerIcon : markerIcon
            }
            eventHandlers={{
              click: () => onMarkerClick?.(project.id),
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                {project.coverImageUrl && (
                  <img
                    src={project.coverImageUrl}
                    alt={project.name}
                    className="w-full h-16 object-cover rounded-t-sm mb-2"
                  />
                )}
                <h3 className="font-semibold text-sm">{project.name}</h3>
                {project.priceFrom && (
                  <p className="text-sm font-medium">
                    From{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: project.currency || "USD",
                      maximumFractionDigits: 0,
                    }).format(project.priceFrom)}
                  </p>
                )}
                <a
                  href={`/projects/${project.id}`}
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  View details
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
