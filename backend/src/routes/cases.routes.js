const upload = require("../config/upload");
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const redactFinancial = require("../middlewares/redactFinancial.middleware");
const rejectAssistantFinancialInput = require("../middlewares/rejectAssistantFinancialInput.middleware");

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

const allRoles = authorize("admin", "lawyer", "assistant");

router.post("/", auth, allRoles, rejectAssistantFinancialInput, upload.array("files", 20), createCase);
router.get("/", auth, allRoles, redactFinancial, getAllCases);
router.get("/search", auth, allRoles, redactFinancial, searchCases);
router.get("/filter", auth, allRoles, redactFinancial, filterCases);
router.get("/recent", auth, allRoles, getRecentCases);
router.get("/search/global", auth, allRoles, globalSearch);
router.put("/:id", auth, allRoles, rejectAssistantFinancialInput, updateCase);
router.delete("/:id", auth, authorize("admin"), deleteCase);
router.get("/:id", auth, allRoles, redactFinancial, getCaseById);

module.exports = router;
