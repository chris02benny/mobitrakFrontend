import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom truck icon that rotates based on course
const createTruckIcon = (speed, course) => {
  const rotation = course || 0;
  const color = speed > 0 ? '#ff0000' : '#00aa00';
  const truckSvg = `
    <svg width="40" height="40" viewBox="0 0 40 40" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
      <g transform="translate(20, 20) rotate(${rotation}) translate(-20, -20)">
        <!-- Truck body -->
        <rect x="8" y="14" width="20" height="12" fill="${color}" stroke="#fff" stroke-width="1.5" rx="2"/>
        <!-- Truck cabin -->
        <rect x="8" y="8" width="10" height="8" fill="${color}" stroke="#fff" stroke-width="1.5" rx="1"/>
        <!-- Windows -->
        <rect x="9.5" y="9.5" width="7" height="5" fill="#87CEEB" stroke="#fff" stroke-width="0.5"/>
        <!-- Wheels -->
        <circle cx="13" cy="28" r="3" fill="#333" stroke="#fff" stroke-width="1"/>
        <circle cx="27" cy="28" r="3" fill="#333" stroke="#fff" stroke-width="1"/>
        <!-- Wheel rims -->
        <circle cx="13" cy="28" r="1.5" fill="#666"/>
        <circle cx="27" cy="28" r="1.5" fill="#666"/>
        ${speed > 0 ? `
        <!-- Moving indicator -->
        <circle cx="20" cy="20" r="18" fill="none" stroke="${color}" stroke-width="2" opacity="0.5" stroke-dasharray="4 4">
          <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite"/>
        </circle>
        ` : ''}
      </g>
    </svg>
  `;
  
  return L.divIcon({
    className: 'truck-marker',
    html: truckSvg,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Component to auto-update map view when position changes
function MapUpdater({ center, zoom, autoFollow }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && autoFollow) {
      map.flyTo(center, zoom || map.getZoom(), {
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map, autoFollow]);
  
  return null;
}

function LiveMap({ positions, positionHistory, autoFollow = true }) {
  const mapRef = useRef(null);

  if (!positions || positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500">No positions available to display on map</p>
      </div>
    );
  }

  // Get the first position for initial map center (or use the latest)
  const latestPosition = positions[0];
  const center = latestPosition 
    ? [latestPosition.latitude, latestPosition.longitude]
    : [0, 0];

  // Calculate speed for overlay
  const currentSpeed = latestPosition?.speed 
    ? (latestPosition.speed * 3.6).toFixed(1) 
    : '0';

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
      {/* Speed Overlay */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg px-6 py-4 border-2 border-gray-200">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Speed</div>
          <div className="text-3xl font-bold text-gray-900">{currentSpeed}</div>
          <div className="text-xs text-gray-500 mt-1">km/h</div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={17}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={center} zoom={17} autoFollow={autoFollow} />
        
        {positions.map((position) => {
          const speed = position.speed ? position.speed * 3.6 : 0; // Convert to km/h
          const course = position.course || 0;
          const history = positionHistory[position.deviceId] || [];
          const trail = history.map(p => [p.latitude, p.longitude]);
          
          return (
            <React.Fragment key={position.deviceId}>
              {/* Draw trail/path if there's history */}
              {trail.length > 1 && (
                <Polyline
                  positions={trail}
                  color={speed > 0 ? '#ff0000' : '#00aa00'}
                  weight={3}
                  opacity={0.6}
                />
              )}
              
              {/* Current position marker - Truck icon */}
              <Marker
                position={[position.latitude, position.longitude]}
                icon={createTruckIcon(speed, course)}
              >
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default LiveMap;
