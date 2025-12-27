const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any IP (Phone/Laptop)
    methods: ["GET", "POST"]
  }
});

// --- DATABASE CONNECTION (FIXED WITH YOUR CLOUD LINK) ---
const MONGO_URI = "mongodb+srv://aj_data:n11kpakpo@cluster0.gvgekn1.mongodb.net/ucc_shuttle?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected (Cloud)"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// --- SCHEMA & MODEL ---
const BusSchema = new mongoose.Schema({
  name: String,
  route: String,
  status: String
});
const Bus = mongoose.model('Bus', BusSchema);

// --- API ROUTES ---

// 1. Get all registered buses
app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Bus.find();
    res.json(buses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

// 2. Add a new bus (One-time setup)
app.post('/api/buses', async (req, res) => {
  const newBus = new Bus(req.body);
  await newBus.save();
  res.json(newBus);
});

// --- REAL-TIME SOCKET LOGIC ---
let activeBuses = []; // In-memory storage of live buses

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // 1. Send current map state to new user immediately
  socket.emit("updateMap", activeBuses);

  // 2. DRIVER: Sends location updates
  socket.on("driverLocation", (data) => {
    // Check if bus exists
    const index = activeBuses.findIndex((b) => b.busId === data.busId);

    if (index !== -1) {
      // Update existing bus
      activeBuses[index] = { ...activeBuses[index], ...data, socketId: socket.id };
    } else {
      // Add new bus
      activeBuses.push({ ...data, socketId: socket.id });
    }

    // Broadcast update to EVERYONE
    io.emit("updateMap", activeBuses);
  });

  // 3. STUDENT: Requests a stop
  socket.on("requestPickup", (data) => {
    console.log("📢 Pickup Requested at:", data.time);
    io.emit("newPickupAlert", data); // Alert all drivers
  });

  // 4. DRIVER: Explicitly Ends Shift (Deletes Bus)
  socket.on("stopShift", (busId) => {
    console.log("❌ Shift Ended for:", busId);
    activeBuses = activeBuses.filter((b) => b.busId !== busId); // Remove from list
    io.emit("updateMap", activeBuses); // Update map
  });

  // 5. DISCONNECT: (Bus stays on map - Zombie Mode 🧟‍♂️)
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);
    // We intentionally DO NOT remove the bus here.
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});