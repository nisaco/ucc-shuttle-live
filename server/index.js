const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require("path"); // Required for deployment

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- 1. DATABASE CONNECTION (Cloud) ---
const MONGO_URI = "mongodb+srv://aj_data:n11kpakpo@cluster0.gvgekn1.mongodb.net/ucc_shuttle?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected (Cloud)"))
  .catch(err => console.log("❌ MongoDB Error:", err));

const BusSchema = new mongoose.Schema({ name: String, route: String, status: String });
const Bus = mongoose.model('Bus', BusSchema);

// --- 2. API ROUTES ---
app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Bus.find();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

app.post('/api/buses', async (req, res) => {
  const newBus = new Bus(req.body);
  await newBus.save();
  res.json(newBus);
});

// --- 3. REAL-TIME SOCKET LOGIC ---
let activeBuses = []; 

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
  socket.emit("updateMap", activeBuses);

  socket.on("driverLocation", (data) => {
    const index = activeBuses.findIndex((b) => b.busId === data.busId);
    if (index !== -1) {
      activeBuses[index] = { ...activeBuses[index], ...data, socketId: socket.id };
    } else {
      activeBuses.push({ ...data, socketId: socket.id });
    }
    io.emit("updateMap", activeBuses);
  });

  socket.on("requestPickup", (data) => io.emit("newPickupAlert", data));

  socket.on("stopShift", (busId) => {
    activeBuses = activeBuses.filter((b) => b.busId !== busId);
    io.emit("updateMap", activeBuses);
  });
  
  // Keep-Alive Ping
  app.get('/ping', (req, res) => res.send('pong'));
});



// ---------------------------------------------------------
// 🚀 DEPLOYMENT CONFIG (The Fix)
// ---------------------------------------------------------
const fs = require('fs'); // Import file system to check folders

// 1. Define the path to the frontend folder
const frontendPath = path.join(__dirname, "../frontend-app");

// 2. INTELLIGENT PATH CHECK:
// Check if 'build' exists. If not, assume it's 'dist' (Vite).
let buildFolder = path.join(frontendPath, "build");

if (!fs.existsSync(buildFolder)) {
    console.log("⚠️ 'build' folder not found. Switching to 'dist'...");
    buildFolder = path.join(frontendPath, "dist");
}

console.log("✅ Serving Frontend from:", buildFolder);

// 3. Serve the files
app.use(express.static(buildFolder));

// 4. Catch-All Route
app.get("*", (req, res) => {
  const indexFile = path.join(buildFolder, "index.html");
  
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send(`
      <h1>404 Error</h1>
      <p>Server is running, but Frontend build not found.</p>
      <p>Looked in: ${buildFolder}</p>
      <p>Make sure your Render Build Command includes: <b>npm run build --prefix frontend-app</b></p>
    `);
  }
});
// ---------------------------------------------------------

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
