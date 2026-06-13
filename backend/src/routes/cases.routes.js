const express = require("express");
const router = express.Router();

const {
  createCase,
  getAllCases,
  getCaseById,
  searchCases,
  updateCase,
  deleteCase,
  filterCases,
  getRecentCases,
  globalSearch,
} = require("../controllers/cases.controller");

router.post("/", createCase);

router.get("/", getAllCases);

router.get("/search", searchCases);

router.get("/filter", filterCases);

router.get("/recent", getRecentCases);

router.get("/search/global", globalSearch);

router.put("/:id", updateCase);

router.delete("/:id", deleteCase);

router.get("/:id", getCaseById);

module.exports = router;
