const express = require("express");

const router = express.Router();

const { login, changePassword } = require("../controllers/auth.controller");

router.post("/login", login);

router.post("/change-password", changePassword);

module.exports = router;
