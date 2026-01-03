import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useLocation } from "wouter";
import type { ProjectWithRelations } from "@shared/schema";

const defaultCenter: [number, number] = [40.1792, 44.5152];
const defaultZoom = 13;

const markerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    width: 28px;
    height: 28px;
    background: hsl(217 91% 35%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.15s;
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface MapUpdaterProps {
  projects: ProjectWithRelations[];
}

function MapUpdater({ projects }: MapUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (projects.length > 0) {
      const yerevanProjects = projects.filter(p => 
        p.latitude > 39.5 && p.latitude < 41.5 && 
        p.longitude > 43.5 && p.longitude < 45.5
      );
      
      if (yerevanProjects.length > 0) {
        const bounds = L.latLngBounds(
          yerevanProjects.map((p) => [p.latitude, p.longitude] as [number, number]),
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

interface FullMapProps {
  projects: ProjectWithRelations[];
}

export function FullMap({ projects }: FullMapProps) {
  const [, navigate] = useLocation();

  const center: [number, number] =
    projects.length > 0
      ? [projects[0].latitude, projects[0].longitude]
      : defaultCenter;

  return (
    <div className="h-full w-full" data-testid="full-map-container">
      <MapContainer
        center={center}
        zoom={defaultZoom}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

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
            <Popup>
              <div className="min-w-[200px]">
                {project.coverImageUrl && (
                  <img
                    src={project.coverImageUrl}
                    alt={project.name}
                    className="w-full h-20 object-cover rounded-t-sm mb-2"
                  />
                )}
                <h3 className="font-semibold">{project.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {project.district?.name}, {project.city?.name}
                </p>
                {project.priceFrom && (
                  <p className="text-sm font-medium mt-1">
                    From{" "}
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: project.currency || "USD",
                      maximumFractionDigits: 0,
                    }).format(project.priceFrom)}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="text-sm text-primary hover:underline mt-2 font-medium"
                >
                  View details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
