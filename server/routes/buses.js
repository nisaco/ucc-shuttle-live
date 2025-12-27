const router = require("express").Router();
const Bus = require("../models/Bus");

// GET ALL BUSES (For the Driver Dropdown)
router.get("/", async (req, res) => {
  try {
    const buses = await Bus.find();
    res.status(200).json(buses);
  } catch (err) {
    res.status(500).json(err);
  }
});

// CREATE A BUS (For Admin Dashboard)
router.post("/", async (req, res) => {
  const newBus = new Bus(req.body);
  try {
    const savedBus = await newBus.save();
    res.status(200).json(savedBus);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;