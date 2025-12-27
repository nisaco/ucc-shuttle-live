import { useState } from "react";
import io from "socket.io-client";

// Use your IP Address
const socket = io.connect("http://10.97.135.127:5000");

function ReportForm() {
  const [issue, setIssue] = useState("");
  const [details, setDetails] = useState("");

  const sendReport = () => {
    if (!issue) return alert("Please select an issue type.");
    
    const report = {
      type: issue,
      message: details,
      time: new Date().toLocaleTimeString(),
      location: "Science Site (Approx)" // You could use GPS here too
    };

    socket.emit("sendReport", report);
    alert("Report Sent to Admin! 👮‍♂️");
    setIssue("");
    setDetails("");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto", background: "#fff3cd", borderRadius: "10px" }}>
      <h3>⚠️ Report an Issue</h3>
      <select 
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
      >
        <option value="">-- Select Issue --</option>
        <option value="Delay">Bus is Late 🐢</option>
        <option value="Breakdown">Bus Broke Down 🔧</option>
        <option value="Overcrowded">Bus is Full 👥</option>
      </select>

      <textarea 
        placeholder="Describe the problem..." 
        style={{ width: "100%", height: "80px", marginBottom: "10px" }}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      <button onClick={sendReport} style={{ background: "#dc3545", color: "white", padding: "10px 20px", border: "none", width: "100%" }}>
        Submit Report
      </button>
    </div>
  );
}

export default ReportForm;