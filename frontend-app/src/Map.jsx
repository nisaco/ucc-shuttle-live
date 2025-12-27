import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import io from "socket.io-client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ⚠️ UPDATE IP HERE (Use your 10.108... IP)
const SERVER_URL = "https://ucc-shuttle-live.onrender.com"; 
const socket = io.connect(SERVER_URL);

// --- ICONS ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
  iconSize: [45, 45],
});

// --- COMPONENT TO AUTO-CENTER ON BUSES ---
function AutoCenter({ buses }) {
  const map = useMap();
  useEffect(() => {
    if (buses.length > 0) {
      // If a bus appears, gently fly to it
      map.flyTo([buses[0].lat, buses[0].lng], 16);
    }
  }, [buses, map]);
  return null;
}

function ShuttleMap() {
  const [buses, setBuses] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hailStatus, setHailStatus] = useState("idle");

  // UCC BOUNDARY (Approximate Rectangle around Campus)
  const UCC_BOUNDS = [
    [5.0800, -1.3000], // South West
    [5.1400, -1.2600]  // North East
  ];

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("updateMap", (data) => {
      console.log("📍 Bus Data Received:", data); // Debug log
      setBuses(data);
    });
    return () => socket.off("updateMap");
  }, []);

  const handleHail = () => {
    if (!navigator.geolocation) return alert("Enable GPS");
    setHailStatus("loading");
    navigator.geolocation.getCurrentPosition((pos) => {
      socket.emit("requestPickup", {
        studentId: "Student-" + Math.floor(Math.random() * 100),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setHailStatus("sent");
      setTimeout(() => setHailStatus("idle"), 3000);
    });
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }}>
      
      {/* STATUS PILL */}
      <div className="overlay-panel" style={{ top: "20px", left: "50%", transform: "translateX(-50%)", padding: "8px 16px", borderRadius: "30px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div className={`status-badge ${isConnected ? 'badge-online' : 'badge-offline'}`}>
          {isConnected ? "Live" : "Connecting..."}
        </div>
        <span style={{ fontSize: "13px", fontWeight: "600" }}>
          {buses.length > 0 ? `${buses.length} Bus Online` : "No Shuttles Active"}
        </span>
      </div>

      <MapContainer 
        center={[5.1036, -1.2825]} // UCC Center
        zoom={15} 
        minZoom={14} // Prevent zooming out to space
        maxBounds={UCC_BOUNDS} // RESTRICT TO UCC
        maxBoundsViscosity={1.0} // Hard bounce back if they try to drag away
        style={{ height: "100%", width: "100%", zIndex: 0 }} 
        zoomControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        
        {/* Render Buses */}
        {buses.map((bus) => (
          <Marker key={bus.busId} position={[bus.lat, bus.lng]} icon={busIcon}>
            <Popup><strong>{bus.busId}</strong><br/>{Math.round(bus.speed * 3.6)} km/h</Popup>
          </Marker>
        ))}

        <AutoCenter buses={buses} />
      </MapContainer>

      {/* HAIL BUTTON */}
      <div className="overlay-panel slide-up" style={{ bottom: "0", left: "0", right: "0", borderRadius: "24px 24px 0 0", padding: "30px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <h3 style={{ margin: "0", color: "var(--primary)" }}>Need a ride?</h3>
          <p style={{ margin: "5px 0 20px 0", color: "var(--text-sub)", fontSize: "14px" }}>Request a stop at your current location.</p>
        </div>
        <button 
          onClick={handleHail} 
          className="btn btn-primary"
          style={{ width: "100%", background: hailStatus === 'sent' ? 'var(--success)' : 'var(--accent)' }}
          disabled={hailStatus === 'loading'}
        >
          {hailStatus === 'idle' && "🙋‍♂️ Request Pickup"}
          {hailStatus === 'loading' && "📍 Locating you..."}
          {hailStatus === 'sent' && "✅ Driver Notified!"}
        </button>
      </div>

    </div>
  );
}

export default ShuttleMap;