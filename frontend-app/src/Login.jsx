import { useState } from "react";

function Login({ onLogin, onBack }) {
  const [role, setRole] = useState("driver");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // HARDCODED PASSWORDS FOR DEMO
    if (role === "admin" && password === "admin123") onLogin("admin");
    else if (role === "driver" && password === "driver123") onLogin("driver");
    else setError("❌ Invalid Access Key");
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary)" }}>
      <div className="card slide-up" style={{ width: "100%", maxWidth: "380px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, color: "var(--primary)" }}>Portal Login</h2>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={handleLogin}>
          {/* Role Toggle */}
          <div style={{ display: "flex", background: "#f3f4f6", padding: "4px", borderRadius: "10px", marginBottom: "20px" }}>
            <button type="button" onClick={() => setRole("driver")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: role === "driver" ? "white" : "transparent", boxShadow: role === "driver" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", fontWeight: "600", color: role === "driver" ? "var(--primary)" : "#6b7280" }}>Driver</button>
            <button type="button" onClick={() => setRole("admin")} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: role === "admin" ? "white" : "transparent", boxShadow: role === "admin" ? "0 2px 4px rgba(0,0,0,0.1)" : "none", fontWeight: "600", color: role === "admin" ? "var(--primary)" : "#6b7280" }}>Admin</button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "#374151" }}>Access Key</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter PIN..." autoFocus />
          </div>

          {error && <p style={{ color: "var(--error)", fontSize: "14px", marginTop: "-10px", marginBottom: "15px" }}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            {role === "admin" ? "Open Dashboard" : "Start Shift"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;