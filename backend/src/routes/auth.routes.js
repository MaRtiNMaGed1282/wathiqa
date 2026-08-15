const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { login, logout, changePassword } = require("../controllers/auth.controller");

router.post("/login", login);
router.post("/logout", auth, logout);
router.post("/logout-all", auth, require("../controllers/auth.controller").logoutAll);
router.post("/change-password", auth, changePassword);

module.exports = router;
