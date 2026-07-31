const express = require("express");

const router = express.Router();

const upload = require("../config/multerTemplates");
const auth = require("../middlewares/auth.middleware");

const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  searchTemplates,
  deleteTemplate,
  updateTemplate,
  attachTemplateToCase,
  getCaseTemplates,
  removeCaseTemplate,
} = require("../controllers/templates.controller");

/**
 * Search
 */
router.get("/search", auth, searchTemplates);

/**
 * Get All
 */
router.get("/", auth, getAllTemplates);

router.post("/attach-to-case", auth, attachTemplateToCase);

router.get("/case/:caseId", auth, getCaseTemplates);

router.delete("/case/:id", auth, removeCaseTemplate);

/**
 * Get One
 */
router.get("/:id", auth, getTemplateById);

/**
 * Create
 */
router.post("/", auth, upload.single("file"), createTemplate);

router.put("/:id", auth, upload.single("file"), updateTemplate);

/**
 * Delete
 */
router.delete("/:id", auth, deleteTemplate);

module.exports = router;
