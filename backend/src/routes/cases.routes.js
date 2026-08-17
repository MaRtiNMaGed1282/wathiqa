const upload = require("../config/upload");
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { idParam, validateCase } = require("../middlewares/validation.middleware");

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

// Multipart/form-data must be parsed before validateCase reads req.body.
router.post("/", auth, upload.array("files", 20), validateCase, createCase);
router.get("/", auth, getAllCases);
router.get("/search", auth, searchCases);
router.get("/filter", auth, filterCases);
router.get("/recent", auth, getRecentCases);
router.get("/search/global", auth, globalSearch);
router.put("/:id", auth, idParam(), validateCase, updateCase);
router.delete("/:id", auth, role("admin"), idParam(), deleteCase);
router.get("/:id", auth, idParam(), getCaseById);

module.exports = router;
