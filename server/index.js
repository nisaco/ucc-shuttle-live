const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require("path");
const fs = require('fs');

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

// --- DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://aj_data:n11kpakpo@cluster0.gvgekn1.mongodb.net/ucc_shuttle?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected (Cloud)"))
  .catch(err => console.log("❌ MongoDB Error:", err));

const BusSchema = new mongoose.Schema({ name: String, route: String, status: String });
const Bus = mongoose.model('Bus', BusSchema);

// --- API ROUTES ---
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

// --- REAL-TIME SOCKET LOGIC ---
let activeBuses = []; 

// 🚨 ADMIN RESET ROUTE (New Feature)
// Visit this link to wipe the map clean if it glitches
app.get('/api/admin/reset', (req, res) => {
  activeBuses = [];
  io.emit("updateMap", activeBuses);
  console.log("🧹 Admin cleared the map.");
  res.send("✅ Map has been wiped clean. All buses removed.");
});

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
  
  app.get('/ping', (req, res) => res.send('pong'));
});

// --- DEPLOYMENT CONFIG ---
const frontendPath = path.join(__dirname, "../frontend-app");
let buildFolder = path.join(frontendPath, "build");
if (!fs.existsSync(buildFolder)) {
    buildFolder = path.join(frontendPath, "dist");
}

app.use(express.static(buildFolder));

app.get(/^(.*)$/, (req, res) => {
  const indexFile = path.join(buildFolder, "index.html");
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send(`<h1>Frontend Not Found</h1><p>Looked in: ${buildFolder}</p>`);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
