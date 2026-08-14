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

router.post("/", auth, createService);
router.get("/", auth, getAllServices);
router.get("/client/:id", auth, getClientServices);
router.get("/:id", auth, getServiceById);
router.put("/:id", auth, updateService);
router.delete("/:id", auth, authorize("admin"), deleteService);

module.exports = router;
