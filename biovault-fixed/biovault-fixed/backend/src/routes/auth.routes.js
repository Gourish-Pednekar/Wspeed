const express = require("express");
const router = express.Router();
const { registerStart, registerFinish, loginStart, loginFinish } = require("../controllers/authController");

router.post("/register/start", registerStart);
router.post("/register/finish", registerFinish);
router.post("/login/start", loginStart);
router.post("/login/finish", loginFinish);

module.exports = router;
