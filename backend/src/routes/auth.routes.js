const express = require("express");

const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const { login, changePassword } = require("../controllers/auth.controller");

router.post("/login", login);

router.post("/change-password", auth, changePassword);

module.exports = router;
