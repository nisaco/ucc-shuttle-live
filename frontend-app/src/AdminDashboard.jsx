import { useState, useEffect } from "react";
import io from "socket.io-client";

// --- CONFIGURATION ---
const SERVER_URL = "http://10.108.106.127:5000"; // Your Network IP
const API_URL = `${SERVER_URL}/api/buses`;

const socket = io.connect(SERVER_URL);

function AdminDashboard() {
  const [buses, setBuses] = useState([]);
  const [reports, setReports] = useState([]); // Stores student complaints
  const [form, setForm] = useState({ name: "", route: "", plateNumber: "" });

  useEffect(() => {
    // 1. Fetch Buses from Database
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setBuses(data))
      .catch((err) => console.error("Error fetching buses:", err));

    // 2. Listen for Live Reports from Students
    socket.on("newReport", (data) => {
      // Play a notification sound (optional)
      // new Audio('/alert.mp3').play().catch(e => {}); 
      
      alert(`⚠️ NEW ISSUE REPORTED: ${data.type}`);
      setReports((prev) => [data, ...prev]); // Add new report to the top
    });

    return () => socket.off("newReport");
  }, []);

  // Handle "Add Bus" Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      const newBus = await response.json();
      setBuses([...buses, newBus]); // Update list instantly
      setForm({ name: "", route: "", plateNumber: "" }); // Reset form
      alert("✅ Bus Added Successfully!");
    } catch (err) {
      alert("Error adding bus");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", fontFamily: "Arial" }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>🛠 Admin Control Center</h1>
      
      {/* --- LIVE ALERTS SECTION --- */}
      <div style={{ marginBottom: "30px" }}>
        <h3>🚨 Live Incident Reports</h3>
        {reports.length === 0 ? (
          <p style={{ color: "gray", fontStyle: "italic" }}>No active issues reported.</p>
        ) : (
          <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #ddd", padding: "10px" }}>
            {reports.map((r, index) => (
              <div key={index} style={{ 
                backgroundColor: "#fff3cd", 
                borderLeft: "5px solid #ffc107", 
                padding: "10px", 
                marginBottom: "8px",
                borderRadius: "4px"
              }}>
                <strong>⚠️ {r.type}</strong> <span style={{fontSize: "12px", color: "#666"}}>({r.time})</span>
                <p style={{ margin: "5px 0 0 0" }}>{r.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        
        {/* --- ADD BUS FORM --- */}
        <div style={{ background: "#f8f9fa", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3>➕ Add New Shuttle</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input 
              placeholder="Bus Name (e.g. Shuttle D)" 
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
            />
            <input 
              placeholder="Route (e.g. Science <-> Valco)" 
              value={form.route}
              onChange={(e) => setForm({...form, route: e.target.value})}
              required
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
            />
            <input 
              placeholder="Plate Number (e.g. WR-2024-X)" 
              value={form.plateNumber}
              onChange={(e) => setForm({...form, plateNumber: e.target.value})}
              required
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
            />
            <button type="submit" style={{ padding: "10px", background: "#28a745", color: "white", border: "none", cursor: "pointer", borderRadius: "5px", fontWeight: "bold" }}>
              Save to Database
            </button>
          </form>
        </div>

        {/* --- BUS LIST --- */}
        <div style={{ background: "white", padding: "20px", border: "1px solid #eee", borderRadius: "10px" }}>
          <h3>🚌 Registered Fleet</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {buses.map((bus) => (
              <li key={bus._id} style={{ borderBottom: "1px solid #eee", padding: "10px 0", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{bus.name}</strong>
                  <div style={{ fontSize: "12px", color: "gray" }}>{bus.route}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ background: "#e2e6ea", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>{bus.plateNumber}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;