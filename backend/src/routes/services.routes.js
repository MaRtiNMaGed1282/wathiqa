const express = require("express");

const router = express.Router();

const {
  getAllServices,
  createService,
  getServiceById,
  updateService,
  deleteService,
  getClientServices,
} = require("../controllers/services.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const redactFinancial = require("../middlewares/redactFinancial.middleware");
const rejectAssistantFinancialInput = require("../middlewares/rejectAssistantFinancialInput.middleware");

const allRoles = authorize("admin", "lawyer", "assistant");

router.post("/", auth, allRoles, rejectAssistantFinancialInput, createService);
router.get("/", auth, allRoles, redactFinancial, getAllServices);
router.get("/client/:id", auth, allRoles, redactFinancial, getClientServices);
router.get("/:id", auth, allRoles, redactFinancial, getServiceById);
router.put("/:id", auth, allRoles, rejectAssistantFinancialInput, updateService);
router.delete("/:id", auth, authorize("admin"), deleteService);

module.exports = router;
