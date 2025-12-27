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



// ... (Keep all your imports and socket code above unchanged) ...

// ---------------------------------------------------------
// 🚀 DEPLOYMENT CONFIG
// ---------------------------------------------------------
const fs = require('fs');

// 1. Define path to frontend
const frontendPath = path.join(__dirname, "../frontend-app");

// 2. Smart Check: Is it 'build' or 'dist'?
let buildFolder = path.join(frontendPath, "build");
if (!fs.existsSync(buildFolder)) {
    buildFolder = path.join(frontendPath, "dist");
}

console.log("✅ Serving Frontend from:", buildFolder);

// 3. Serve Static Files
app.use(express.static(buildFolder));

// 4. Catch-All Route (THE FIX IS HERE)
// We changed "*" to a Regex /^(.*)$/ to fix the PathError
app.get(/^(.*)$/, (req, res) => {
  const indexFile = path.join(buildFolder, "index.html");
  
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    // If we still can't find it, show a helpful error on screen
    res.status(404).send(`
      <h1>Frontend Not Found</h1>
      <p>Server is running, but index.html is missing.</p>
      <p>Looked in: ${buildFolder}</p>
    `);
  }
});
// ---------------------------------------------------------

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
