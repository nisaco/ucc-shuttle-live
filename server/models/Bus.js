const mongoose = require("mongoose");

const BusSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g., "Shuttle A"
  route: { type: String, required: true },      // e.g., "Science <-> Casford"
  plateNumber: { type: String, required: true },// e.g., "CR-2024-X"
  type: { type: String, default: "Bus" },       // "Bus" or "Van"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Bus", BusSchema);