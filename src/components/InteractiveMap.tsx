'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, FeatureGroup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import L from 'leaflet';

type Paddock = {
  id: string;
  name: string;
  boundary: any; // GeoJSON
};

type Break = {
  id: string;
  name: string;
  paddockId: string;
  vertices: {lat: number, lng: number}[];
  cropMode: string;
};

type Hazard = {
  id: string;
  description: string;
  status: string;
  coordinates: {lat: number, lng: number} | {lat: number, lng: number}[];
  mitigation: string | null;
};

type InteractiveMapProps = {
  paddocks: Paddock[];
  breaks: Break[];
  hazards: Hazard[];
};

export default function InteractiveMap({ paddocks, breaks, hazards }: InteractiveMapProps) {
  
  // Calculate center based on paddocks or default to New Zealand
  const center: [number, number] = paddocks.length > 0 && paddocks[0].boundary?.features?.[0]?.geometry?.coordinates?.[0]?.[0]?.[0]
    ? [paddocks[0].boundary.features[0].geometry.coordinates[0][0][1], paddocks[0].boundary.features[0].geometry.coordinates[0][0][0]]
    : [-44.118, 170.860]; // Wainono approx center

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-slate-700/50 relative shadow-inner">
      <MapContainer center={center} zoom={15} scrollWheelZoom={true} className="w-full h-full">
        {/* Satellite Map Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Paddocks (GeoJSON Polygons) */}
        {paddocks.map(p => {
          if (!p.boundary) return null;
          return (
            <GeoJSON 
              key={p.id} 
              data={p.boundary} 
              pathOptions={{ color: '#10b981', weight: 2, fillOpacity: 0.1 }}
            >
              <Popup>
                <div className="text-slate-900 font-bold">{p.name}</div>
              </Popup>
            </GeoJSON>
          );
        })}

        {/* Breaks */}
        {breaks.map(b => {
          if (!b.vertices || b.vertices.length === 0) return null;
          
          const positions: [number, number][] = b.vertices.map(v => [v.lat, v.lng]);
          
          if (b.cropMode === 'polygon') {
            // Render as polygon for crop mode
            return (
              <Polygon key={b.id} positions={positions} pathOptions={{ color: '#f59e0b', weight: 2, fillOpacity: 0.3 }}>
                <Popup>
                  <div className="text-slate-900">
                    <strong>Break:</strong> {b.name}<br/>
                    <strong>Paddock ID:</strong> {b.paddockId}<br/>
                    <em>Crop Mode</em>
                  </div>
                </Popup>
              </Polygon>
            );
          } else {
            // Render as line for pasture mode
            return (
              <Polyline key={b.id} positions={positions} pathOptions={{ color: '#eab308', weight: 3, dashArray: '5, 10' }}>
                <Popup>
                  <div className="text-slate-900">
                    <strong>Break:</strong> {b.name}<br/>
                    <strong>Paddock ID:</strong> {b.paddockId}<br/>
                    <em>Pasture Mode (Line)</em>
                  </div>
                </Popup>
              </Polyline>
            );
          }
        })}

        {/* Hazards */}
        {hazards.map(h => {
          if (!h.coordinates) return null;
          
          // Check if coordinates is an array (polygon/line) or single point
          const isArray = Array.isArray(h.coordinates);
          
          if (isArray && (h.coordinates as any[]).length > 2) {
            const positions: [number, number][] = (h.coordinates as {lat: number, lng: number}[]).map(c => [c.lat, c.lng]);
            return (
              <Polygon key={h.id} positions={positions} pathOptions={{ color: '#ef4444', weight: 2, fillOpacity: 0.4 }}>
                <Popup>
                  <div className="text-slate-900 max-w-[200px]">
                    <strong className="text-red-600">⚠️ Hazard Area</strong>
                    <p className="text-sm mt-1">{h.description}</p>
                    <span className="text-xs text-slate-500 block mt-2">Status: {h.status}</span>
                  </div>
                </Popup>
              </Polygon>
            );
          } else if (isArray && (h.coordinates as any[]).length > 0) {
            // Line
             const positions: [number, number][] = (h.coordinates as {lat: number, lng: number}[]).map(c => [c.lat, c.lng]);
             return (
              <Polyline key={h.id} positions={positions} pathOptions={{ color: '#ef4444', weight: 4 }}>
                <Popup>
                  <div className="text-slate-900 max-w-[200px]">
                    <strong className="text-red-600">⚠️ Hazard Line</strong>
                    <p className="text-sm mt-1">{h.description}</p>
                  </div>
                </Popup>
              </Polyline>
            );
          } else if (!isArray && (h.coordinates as any).lat) {
            // Point marker
            return (
              <Marker key={h.id} position={[(h.coordinates as any).lat, (h.coordinates as any).lng]}>
                <Popup>
                  <div className="text-slate-900 max-w-[200px]">
                    <strong className="text-red-600">⚠️ Hazard Point</strong>
                    <p className="text-sm mt-1">{h.description}</p>
                  </div>
                </Popup>
              </Marker>
            );
          }
          
          return null;
        })}
      </MapContainer>
    </div>
  );
}
