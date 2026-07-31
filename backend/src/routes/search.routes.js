const express = require("express");
const router = express.Router();

const searchController = require("../controllers/search.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/", auth, searchController.globalSearch);

module.exports = router;
