const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const bundlerService = require("../services/bundlerService");
const User = require("../models/User");

// GET /api/wallet/info
router.get("/info", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-credentials");
    if (!user) return res.status(404).json({ error: "User not found" });

    const balance = await bundlerService.getBalance(user.walletAddress);

    res.json({
      address: user.walletAddress,
      balance,
      username: user.username,
      guardiansSetup: user.guardiansSetup,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/transactions
// Returns recent transactions (mock in dev — replace with indexer/subgraph in production)
router.get("/transactions", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("walletAddress");
    if (!user) return res.status(404).json({ error: "User not found" });

    // In production: query an indexer (Alchemy, The Graph, Moralis) for real tx history
    // For dev: return empty array so the dashboard renders without crashing
    res.json({ transactions: [], address: user.walletAddress });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/deploy
router.post("/deploy", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ address: user.walletAddress, message: "Wallet deployed on first transaction" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
