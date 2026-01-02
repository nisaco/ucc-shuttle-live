import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// --- CONFIGURATION ---
const SERVER_URL = "https://ucc-shuttle-live.onrender.com"; 
const API_URL = `${SERVER_URL}/api/buses`;
const socket = io.connect(SERVER_URL);

// --- CSS STYLES ---
const styles = `
  :root {
    --primary: #003366; /* UCC Blue */
    --primary-dark: #002244;
    --accent: #f59e0b;
    --success: #10b981;
    --error: #ef4444;
    --text-sub: #6b7280;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f3f4f6;
    overflow-x: hidden; /* Prevent scroll on animations */
  }

  /* --- RIPPLE BACKGROUND ANIMATION --- */
  .ripple-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    overflow: hidden;
  }

  .ripple-circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    animation: ripple 6s infinite linear;
    width: 0;
    height: 0;
    opacity: 0;
  }

  /* Different delays for multiple ripples */
  .ripple-1 { animation-delay: 0s; }
  .ripple-2 { animation-delay: 1.5s; }
  .ripple-3 { animation-delay: 3s; }
  .ripple-4 { animation-delay: 4.5s; }

  @keyframes ripple {
    0% { width: 0; height: 0; opacity: 0.5; border-width: 5px; }
    100% { width: 150vmax; height: 150vmax; opacity: 0; border-width: 0px; }
  }

  /* --- LOADING SPLASH SCREEN --- */
  .splash-screen {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--primary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
    transition: opacity 0.5s ease-out;
  }
  
  .loader-bus {
    font-size: 80px;
    animation: bounce 1s infinite alternate;
  }
  
  .loading-dots:after {
    content: '.';
    animation: dots 1.5s steps(5, end) infinite;
  }

  @keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-15px); }
  }
  
  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60% { content: '...'; }
    80%, 100% { content: ''; }
  }

  /* --- UI COMPONENTS --- */
  .card {
    background: rgba(255, 255, 255, 0.95); /* Slightly transparent */
    backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    padding: 30px;
    transition: transform 0.2s ease;
  }

  .btn {
    border: none;
    cursor: pointer;
    font-weight: 600;
    border-radius: 12px;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    box-shadow: 0 4px 12px rgba(0, 51, 102, 0.2);
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 51, 102, 0.4);
  }

  .btn-success {
    background: var(--success);
    color: white;
  }

  .btn-outline {
    border: 1px solid #ccc;
    background: transparent;
    color: #4b5563;
  }

  .slide-up {
    animation: slideUp 0.4s ease-out forwards;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  input, select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    font-size: 16px;
    box-sizing: border-box; 
    transition: border-color 0.2s;
  }
  input:focus, select:focus {
    outline: none;
    border-color: var(--primary);
  }

  /* Map Overlays */
  .overlay-panel {
    position: absolute;
    background: white;
    box-shadow: 0 -5px 20px rgba(0,0,0,0.15);
    z-index: 1000; 
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge-online { background-color: #d1fae5; color: #065f46; }
  .badge-offline { background-color: #fee2e2; color: #991b1b; }
`;

// --- NEW COMPONENT: Ripple Background ---
const RippleBackground = () => (
  <div className="ripple-container">
    <div className="ripple-circle ripple-1"></div>
    <div className="ripple-circle ripple-2"></div>
    <div className="ripple-circle ripple-3"></div>
    <div className="ripple-circle ripple-4"></div>
  </div>
);

// --- NEW COMPONENT: Loading Splash Screen ---
const SplashScreen = () => (
  <div className="splash-screen">
    <div className="loader-bus">🚌</div>
    <h2 style={{ marginTop: "20px", fontWeight: "300", letterSpacing: "2px" }}>UCC SHUTTLE</h2>
    <div style={{ opacity: 0.7, fontSize: "14px" }}>
      Connecting to Satellite<span className="loading-dots"></span>
    </div>
  </div>
);

// --- CUSTOM MAP COMPONENT (CDN LOADED) ---
const LeafletMap = ({ center, zoom, buses = [], myLocation, pickupRequests = [], onPickupDismiss }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: false }).setView(center, zoom);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    mapInstance.current = map;
    updateMarkers();
  };

  useEffect(() => {
    updateMarkers();
  }, [buses, myLocation, pickupRequests]);

  const updateMarkers = () => {
    if (!mapInstance.current || !window.L) return;
    const map = mapInstance.current;
    const L = window.L;
    const activeIds = new Set();

    const busIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    const passengerIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/3001/3001764.png",
      iconSize: [35, 35],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17]
    });

    buses.forEach(bus => {
      const id = `bus-${bus.busId}`;
      activeIds.add(id);
      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([bus.lat, bus.lng]);
      } else {
        const marker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(map);
        marker.bindPopup(`<b>${bus.busId}</b><br>${Math.round(bus.speed * 3.6)} km/h`);
        markersRef.current[id] = marker;
      }
    });

    if (myLocation) {
      const id = 'my-loc';
      activeIds.add(id);
      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng(myLocation);
      } else {
        const marker = L.marker(myLocation, { icon: busIcon }).addTo(map);
        marker.bindPopup('<b>You are here</b>');
        markersRef.current[id] = marker;
        map.setView(myLocation, 16);
      }
    }

    pickupRequests.forEach((req, index) => {
      const id = `req-${index}`;
      activeIds.add(id);
      if (!markersRef.current[id]) {
        const marker = L.marker([req.lat, req.lng], { icon: passengerIcon }).addTo(map);
        const popupContent = document.createElement('div');
        popupContent.innerHTML = `<button style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Picked Up ✅</button>`;
        popupContent.onclick = () => onPickupDismiss && onPickupDismiss(index);
        marker.bindPopup(popupContent);
        markersRef.current[id] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!activeIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  };

  return <div ref={mapRef} style={{ height: "100%", width: "100%", zIndex: 0 }} />;
};

// --- STUDENT MAP VIEW ---
function ShuttleMap() {
  const [buses, setBuses] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hailStatus, setHailStatus] = useState("idle");

  useEffect(() => {
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("updateMap", (data) => setBuses(data));
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
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#f3f4f6" }}>
      <div className="overlay-panel" style={{ top: "20px", left: "50%", transform: "translateX(-50%)", padding: "8px 16px", borderRadius: "30px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div className={`status-badge ${isConnected ? 'badge-online' : 'badge-offline'}`}>
          {isConnected ? "Live" : "Connecting..."}
        </div>
        <span style={{ fontSize: "13px", fontWeight: "600" }}>
          {buses.length > 0 ? `${buses.length} Bus Online` : "No Shuttles Active"}
        </span>
      </div>

      <LeafletMap center={[5.1036, -1.2825]} zoom={15} buses={buses} />

      <div className="overlay-panel slide-up" style={{ bottom: "0", left: "0", right: "0", borderRadius: "24px 24px 0 0", padding: "30px" }}>
        <h3 style={{ margin: "0", color: "var(--primary)" }}>Need a ride?</h3>
        <p style={{ margin: "5px 0 20px 0", color: "var(--text-sub)", fontSize: "14px" }}>Request a stop at your current location.</p>
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

// --- DRIVER LOGIN ---
function DriverLogin() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState("");
  const [isDriving, setIsDriving] = useState(false);
  const [pickupRequests, setPickupRequests] = useState([]); 
  const [myLocation, setMyLocation] = useState(null);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setBuses(data))
      .catch(err => console.error("Error fetching buses:", err));
    
    socket.on("newPickupAlert", (data) => {
        setPickupRequests((prev) => [data, ...prev]);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    });
    return () => socket.off("newPickupAlert");
  }, []);

  const requestWakeLock = async () => { 
    try { 
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch(e) { console.log("Wake Lock not supported."); } 
  };

  const startShift = async () => {
    if (!selectedBus) return alert("❌ Please select a bus first!");
    setIsDriving(true);
    await requestWakeLock();

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed } = position.coords;
          setMyLocation([latitude, longitude]);
          socket.emit("driverLocation", { busId: selectedBus, lat: latitude, lng: longitude, speed: speed || 0 });
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
    } else {
      alert("❌ GPS is not supported on this browser.");
    }
  };

  const stopShift = () => {
    if (window.confirm("End Shift? This will remove the bus from the Student Map.")) {
      socket.emit("stopShift", selectedBus);
      if (wakeLockRef.current) wakeLockRef.current.release();
      setIsDriving(false);
      window.location.reload();
    }
  };

  const removeRequest = (index) => {
    const newReqs = [...pickupRequests];
    newReqs.splice(index, 1);
    setPickupRequests(newReqs);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f3f4f6" }}>
      <div style={{ background: "var(--primary)", padding: "16px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", zIndex: 1001 }}>
        <div>
            <div style={{ fontSize: "11px", opacity: 0.8, letterSpacing: "1px" }}>DRIVER PORTAL</div>
            <div style={{ fontWeight: "bold", fontSize: "16px" }}>{selectedBus || "Not Online"}</div>
        </div>
        {isDriving && (
          <button onClick={stopShift} className="btn" style={{ background: "#ef4444", color: "white", padding: "8px 16px", fontSize: "13px", border: "none" }}>End Shift</button>
        )}
      </div>

      {!isDriving ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
            <h2 style={{ color: "var(--primary)", marginTop: 0 }}>Start Your Shift</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>Select your vehicle to go online.</p>
            <select onChange={(e) => setSelectedBus(e.target.value)} style={{ marginBottom: "20px" }}>
              <option value="">-- Choose Vehicle --</option>
              {buses.map((bus) => <option key={bus._id} value={bus.name}>{bus.name}</option>)}
            </select>
            <button onClick={startShift} className="btn btn-primary" style={{ width: "100%", padding: "15px", fontSize: "16px", background: "#10b981" }}>Go Online ▶</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, position: "relative" }}>
          <LeafletMap center={myLocation || [5.1036, -1.2825]} zoom={16} myLocation={myLocation} pickupRequests={pickupRequests} onPickupDismiss={removeRequest} />
          {!myLocation && (
             <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999, background: "rgba(0,0,0,0.8)", color: "white", padding: "20px", borderRadius: "10px", textAlign: "center" }}>
               <div style={{ fontSize: "24px", marginBottom: "10px" }}>📡</div>Waiting for GPS...
             </div>
          )}
          {pickupRequests.length > 0 && (
            <div className="overlay-panel slide-up" style={{ bottom: "20px", left: "20px", right: "20px", padding: "0", maxHeight: "40vh", overflowY: "auto", borderRadius: "16px" }}>
                <div style={{ padding: "15px", borderBottom: "1px solid #eee", background: "#fff", borderRadius: "16px 16px 0 0" }}>
                  <b style={{ color: "var(--accent)" }}>New Requests ({pickupRequests.length})</b>
                </div>
                {pickupRequests.map((req, index) => (
                    <div key={index} style={{ padding: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f0f0f0" }}>
                        <div><span style={{ fontWeight: "bold", fontSize: "14px" }}>Passenger Waiting</span><br/><small style={{ color: "gray" }}>Request time: {req.time}</small></div>
                        <button onClick={() => removeRequest(index)} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "12px" }}>Dismiss</button>
                    </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- ADMIN DASHBOARD ---
function AdminDashboard() {
  const [buses, setBuses] = useState([]);
  const [reports, setReports] = useState([]); 
  const [form, setForm] = useState({ name: "", route: "", plateNumber: "" });

  useEffect(() => {
    fetch(API_URL).then((res) => res.json()).then((data) => setBuses(data)).catch((err) => console.error("Error fetching buses:", err));
    socket.on("newReport", (data) => { setReports((prev) => [data, ...prev]); });
    return () => socket.off("newReport");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const newBus = await response.json();
      setBuses([...buses, newBus]); 
      setForm({ name: "", route: "", plateNumber: "" });
      alert("✅ Bus Added Successfully!");
    } catch (err) { alert("Error adding bus"); }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", height: "100vh", overflowY: "auto", background: "white" }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>🛠 Admin Control Center</h1>
      <div style={{ marginBottom: "30px" }}>
        <h3>🚨 Live Incident Reports</h3>
        {reports.length === 0 ? <p style={{ color: "gray", fontStyle: "italic" }}>No active issues reported.</p> : (
          <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
            {reports.map((r, index) => (
              <div key={index} style={{ backgroundColor: "#fff3cd", borderLeft: "5px solid #ffc107", padding: "10px", marginBottom: "8px", borderRadius: "4px" }}>
                <strong>⚠️ {r.type}</strong> <span style={{fontSize: "12px", color: "#666"}}>({r.time})</span><p style={{ margin: "5px 0 0 0" }}>{r.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3>➕ Add New Shuttle</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input placeholder="Bus Name (e.g. Shuttle D)" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            <input placeholder="Route (e.g. Science <-> Valco)" value={form.route} onChange={(e) => setForm({...form, route: e.target.value})} required />
            <input placeholder="Plate Number (e.g. WR-2024-X)" value={form.plateNumber} onChange={(e) => setForm({...form, plateNumber: e.target.value})} required />
            <button type="submit" style={{ padding: "10px", background: "#28a745", color: "white", border: "none", cursor: "pointer", borderRadius: "5px", fontWeight: "bold" }}>Save to Database</button>
          </form>
        </div>
        <div style={{ background: "white", padding: "20px", border: "1px solid #eee", borderRadius: "10px" }}>
          <h3>🚌 Registered Fleet</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {buses.map((bus) => (
              <li key={bus._id} style={{ borderBottom: "1px solid #eee", padding: "10px 0", display: "flex", justifyContent: "space-between" }}>
                <div><strong>{bus.name}</strong><div style={{ fontSize: "12px", color: "gray" }}>{bus.route}</div></div>
                <div style={{ textAlign: "right" }}><span style={{ background: "#e2e6ea", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{bus.plateNumber}</span></div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// --- LOGIN COMPONENT ---
function Login({ onLogin, onBack }) {
  const [role, setRole] = useState("driver");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === "admin" && password === "admin123") onLogin("admin");
    else if (role === "driver" && password === "driver123") onLogin("driver");
    else setError("❌ Invalid Access Key");
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary)" }}>
      <RippleBackground />
      <div className="card slide-up" style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Portal Login</h2>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ display: "flex", background: "#f3f4f6", padding: "4px", borderRadius: "10px", marginBottom: "20px" }}>
            <button type="button" onClick={() => setRole("driver")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: role === "driver" ? "white" : "transparent", boxShadow: role === "driver" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", fontWeight: "600", color: role === "driver" ? "var(--primary)" : "#6b7280" }}>Driver</button>
            <button type="button" onClick={() => setRole("admin")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: role === "admin" ? "white" : "transparent", boxShadow: role === "admin" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", fontWeight: "600", color: role === "admin" ? "var(--primary)" : "#6b7280" }}>Admin</button>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "#374151" }}>Access Key</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter PIN..." autoFocus />
          </div>
          {error && <p style={{ color: "var(--error)", fontSize: "14px", marginTop: "-10px", marginBottom: "15px" }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>{role === "admin" ? "Open Dashboard" : "Start Shift"}</button>
        </form>
      </div>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [view, setView] = useState("home"); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretCount, setSecretCount] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);

  // Fake Loading effect on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleSecretClick = () => {
    setSecretCount(prev => prev + 1);
    if (secretCount + 1 >= 5) {
      setView("login");
      setSecretCount(0);
    }
  };

  const handleLoginSuccess = (role) => {
    setIsAuthenticated(true);
    setView(role);
  };

  if (isLoading) return (
    <>
      <style>{styles}</style>
      <SplashScreen />
    </>
  );

  return (
    <div>
      <style>{styles}</style>
      {/* 1. HOME SCREEN WITH RIPPLE BACKGROUND */}
      {view === "home" && (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <RippleBackground />
          
          <div className="card slide-up" style={{ textAlign: "center", maxWidth: "400px", width: "90%", padding: "40px" }}>
            <div style={{ fontSize: "60px", marginBottom: "10px" }}>🚌</div>
            <h1 
              onClick={handleSecretClick}
              style={{ margin: "0 0 10px 0", color: "var(--primary)", cursor: "pointer", userSelect: "none" }}
              title="Official Campus Transit"
            >
              UCC Shuttle
            </h1>
            <p style={{ color: "var(--text-sub)", marginBottom: "30px" }}>Real-time Campus Transit System</p>
            <button onClick={() => setView("map")} className="btn btn-primary" style={{ width: "100%", padding: "15px", fontSize: "18px" }}>
              🗺 View Live Map
            </button>
          </div>

          <p style={{ marginTop: "30px", fontSize: "12px", color: "rgba(255,255,255,0.7)", zIndex: 1 }}>
            University of Cape Coast • IT Services
          </p>
        </div>
      )}

      {/* 2. AUTH & PAGES */}
      {view === "login" && <Login onLogin={handleLoginSuccess} onBack={() => setView("home")} />}
      {view === "driver" && isAuthenticated && <DriverLogin />}
      {view === "admin" && isAuthenticated && <AdminDashboard />}
      {view === "map" && <ShuttleMap />}
      
      {/* EXIT BUTTON */}
      {view !== "home" && view !== "login" && (
        <button 
          onClick={() => { setView("home"); setIsAuthenticated(false); }}
          className="btn"
          style={{ position: "fixed", bottom: "20px", left: "20px", zIndex: 2000, background: "white", borderRadius: "50px", padding: "10px 15px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
        >
          ⬅ Exit
        </button>
      )}
    </div>
  );
}

export default App;
