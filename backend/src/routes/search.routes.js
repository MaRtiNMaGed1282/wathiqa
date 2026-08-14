const express = require("express");
const router = express.Router();
const searchController = require("../controllers/search.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

router.get(
  "/",
  auth,
  authorize("admin", "lawyer", "assistant"),
  searchController.globalSearch,
);

module.exports = router;
