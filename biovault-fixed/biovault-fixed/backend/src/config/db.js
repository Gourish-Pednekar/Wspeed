const mongoose = require("mongoose");
const logger = require("../utils/logger");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/biovault";

  mongoose.connection.on("connected", () => {
    logger.info("✅ MongoDB connected");
    isConnected = true;
  });

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    isConnected = false;
  });

  // Mongoose 8+ does not accept useNewUrlParser / useUnifiedTopology
  await mongoose.connect(uri);
}

module.exports = { connectDB };
