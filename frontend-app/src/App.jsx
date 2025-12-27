import { useState, useEffect } from "react";
import ShuttleMap from "./Map";
import DriverLogin from "./DriverLogin";
import AdminDashboard from "./AdminDashboard";
import Login from "./Login";
import './App.css';

function App() {
  const [view, setView] = useState("home"); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretCount, setSecretCount] = useState(0); // For the hidden door

  // --- HIDDEN ACCESS LOGIC ---
  const handleSecretClick = () => {
    setSecretCount(prev => prev + 1);
    
    // If clicked 5 times, open the hidden login
    if (secretCount + 1 >= 5) {
      setView("login");
      setSecretCount(0); // Reset
    }
  };

  const handleLoginSuccess = (role) => {
    setIsAuthenticated(true);
    setView(role);
  };

  return (
    <div>
      {/* 1. HOME SCREEN */}
      {view === "home" && (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)" }}>
          
          <div className="card" style={{ textAlign: "center", maxWidth: "400px", width: "90%", padding: "40px" }}>
            <div style={{ fontSize: "60px", marginBottom: "10px" }}>🚌</div>
            
            {/* HIDDEN TRIGGER: CLICK THIS TEXT 5 TIMES */}
            <h1 
              onClick={handleSecretClick}
              style={{ margin: "0 0 10px 0", color: "var(--primary)", cursor: "pointer", userSelect: "none" }}
              title="Official Campus Transit"
            >
              UCC Shuttle
            </h1>
            
            <p style={{ color: "var(--text-sub)", marginBottom: "30px" }}>Real-time Campus Transit System</p>
            
            {/* ONLY STUDENT BUTTON IS VISIBLE */}
            <button onClick={() => setView("map")} className="btn btn-primary" style={{ width: "100%", padding: "15px", fontSize: "18px" }}>
              🗺 View Live Map
            </button>
          </div>

          <p style={{ marginTop: "30px", fontSize: "12px", color: "#9ca3af" }}>
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