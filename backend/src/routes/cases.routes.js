const upload = require("../config/upload");
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

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

router.post("/", auth, upload.array("files", 20), createCase);

router.get("/", auth, getAllCases);

router.get("/search", auth, searchCases);

router.get("/filter", auth, filterCases);

router.get("/recent", auth, getRecentCases);

router.get("/search/global", auth, globalSearch);

router.put("/:id", auth, updateCase);

router.delete("/:id", auth, deleteCase);

router.get("/:id", auth, getCaseById);

module.exports = router;
