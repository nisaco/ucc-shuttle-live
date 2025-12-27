import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- ICON FIXES (Leaflet Glitch Fix) ---
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// ⚠️ IP ADDRESS (Must match your laptop's IP)
const SERVER_URL = "https://ucc-shuttle-live.onrender.com"; 
const socket = io.connect(SERVER_URL);

// --- CUSTOM ICONS ---
const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
  iconSize: [40, 40],
});

const passengerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3001/3001764.png", // Waving Person
  iconSize: [35, 35],
});

function DriverLogin() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState("");
  const [isDriving, setIsDriving] = useState(false);
  const [pickupRequests, setPickupRequests] = useState([]); 
  const [myLocation, setMyLocation] = useState(null);
  const wakeLockRef = useRef(null);

  // 1. Fetch Buses & Listen for Pickups
  useEffect(() => {
    // Get list of bus names from server
    fetch(`${SERVER_URL}/api/buses`)
      .then((res) => res.json())
      .then((data) => setBuses(data))
      .catch(err => console.error("Error fetching buses:", err));
    
    // Listen for students requesting stops
    socket.on("newPickupAlert", (data) => {
        setPickupRequests((prev) => [data, ...prev]);
        // Vibrate phone for 200ms
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });

    return () => socket.off("newPickupAlert");
  }, []);

  // 2. Keep Screen Awake (Wake Lock API)
  const requestWakeLock = async () => { 
    try { 
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch(e) {
      console.log("Wake Lock not supported on this device.");
    } 
  };

  // 3. START SHIFT LOGIC
  const startShift = async () => {
    if (!selectedBus) return alert("❌ Please select a bus first!");
    
    setIsDriving(true);
    await requestWakeLock();

    if (navigator.geolocation) {
      // Watch position continuously
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed } = position.coords;
          
          // Update Local View
          setMyLocation([latitude, longitude]);

          // Send to Server (Students see this)
          socket.emit("driverLocation", { 
            busId: selectedBus, 
            lat: latitude, 
            lng: longitude, 
            speed: speed || 0 
          });
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
    } else {
      alert("❌ GPS is not supported on this browser.");
    }
  };

  // 4. STOP SHIFT LOGIC (Explicit Delete)
  const stopShift = () => {
    if (window.confirm("End Shift? This will remove the bus from the Student Map.")) {
      socket.emit("stopShift", selectedBus); // Tell server to delete bus
      if (wakeLockRef.current) wakeLockRef.current.release();
      setIsDriving(false);
      window.location.reload(); // Reset app
    }
  };

  const removeRequest = (index) => {
    const newReqs = [...pickupRequests];
    newReqs.splice(index, 1);
    setPickupRequests(newReqs);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* HEADER BAR */}
      <div style={{ background: "var(--primary)", padding: "16px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", zIndex: 1001 }}>
        <div>
            <div style={{ fontSize: "11px", opacity: 0.8, letterSpacing: "1px" }}>DRIVER PORTAL</div>
            <div style={{ fontWeight: "bold", fontSize: "16px" }}>{selectedBus || "Not Online"}</div>
        </div>
        
        {isDriving && (
          <button 
            onClick={stopShift} 
            className="btn" 
            style={{ background: "#ef4444", color: "white", padding: "8px 16px", fontSize: "13px", border: "none" }}
          >
            End Shift
          </button>
        )}
      </div>

      {/* VIEW 1: SELECTION SCREEN */}
      {!isDriving ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f3f4f6" }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
            <h2 style={{ color: "var(--primary)", marginTop: 0 }}>Start Your Shift</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>Select your vehicle to go online.</p>
            
            <select 
              onChange={(e) => setSelectedBus(e.target.value)} 
              style={{ marginBottom: "20px", width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
            >
              <option value="">-- Choose Vehicle --</option>
              {buses.map((bus) => <option key={bus._id} value={bus.name}>{bus.name}</option>)}
            </select>
            
            <button 
              onClick={startShift} 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "15px", fontSize: "16px", background: "#10b981" }}
            >
              Go Online ▶
            </button>
          </div>
        </div>
      ) : (
        /* VIEW 2: DRIVING MODE (MAP) */
        <div style={{ flex: 1, position: "relative" }}>
          
          <MapContainer 
            center={myLocation || [5.1036, -1.2825]} 
            zoom={16} 
            style={{ height: "100%", width: "100%" }} 
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            
            {/* My Bus Marker */}
            {myLocation && (
              <Marker position={myLocation} icon={busIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {/* Student Request Markers */}
            {pickupRequests.map((req, index) => (
              <Marker key={index} position={[req.lat, req.lng]} icon={passengerIcon}>
                <Popup>
                  <button onClick={() => removeRequest(index)} className="btn btn-success" style={{ padding: "5px 10px", fontSize: "12px" }}>
                    Picked Up ✅
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* GPS Waiting Overlay */}
          {!myLocation && (
             <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999, background: "rgba(0,0,0,0.8)", color: "white", padding: "20px", borderRadius: "10px", textAlign: "center" }}>
               <div style={{ fontSize: "24px", marginBottom: "10px" }}>📡</div>
               Waiting for GPS...
             </div>
          )}

          {/* Request List Overlay (Bottom Sheet) */}
          {pickupRequests.length > 0 && (
            <div className="overlay-panel slide-up" style={{ bottom: "20px", left: "20px", right: "20px", padding: "0", maxHeight: "40vh", overflowY: "auto" }}>
                <div style={{ padding: "15px", borderBottom: "1px solid #eee", background: "#fff", borderRadius: "16px 16px 0 0" }}>
                  <b style={{ color: "var(--accent)" }}>New Requests ({pickupRequests.length})</b>
                </div>
                {pickupRequests.map((req, index) => (
                    <div key={index} style={{ padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: "14px" }}>Passenger Waiting</span>
                          <br/>
                          <small style={{ color: "gray" }}>Request time: {req.time}</small>
                        </div>
                        <button 
                          onClick={() => removeRequest(index)} 
                          className="btn btn-outline" 
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                        >
                          Dismiss
                        </button>
                    </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DriverLogin;