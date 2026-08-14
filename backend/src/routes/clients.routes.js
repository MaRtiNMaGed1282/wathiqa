const express = require("express");
const router = express.Router();
const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");

const {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  searchClients,
  getClientFinancialSummary,
  getClientCasesFinancial,
  getRevenueSummary,
  getRevenueClients,
  getDashboardStats,
  getMonthlyRevenue,
  getDashboardNotifications,
  getTopDebtors,
  getRecentPayments,
  getTopRevenueItems,
} = require("../controllers/clients.controller");

/**
 * Search clients
 * Must come before /:id
 */
router.get("/search", auth, searchClients);

/**
 * Get all clients
 */
router.get("/", auth, getAllClients);

// Financial client data is restricted to Admin/Lawyer.
router.get("/:id/financial-summary", auth, financial, getClientFinancialSummary);
router.get("/:id/cases-financial", auth, financial, getClientCasesFinancial);

// Legacy financial/dashboard aggregations remain protected even though Revenues now uses /api/revenues.
router.get("/revenues/summary", auth, financial, getRevenueSummary);
router.get("/revenues/clients", auth, financial, getRevenueClients);
router.get("/dashboard/top-debtors", auth, financial, getTopDebtors);
router.get("/dashboard/recent-payments", auth, financial, getRecentPayments);
router.get("/reports/top-revenue-items", auth, financial, getTopRevenueItems);

router.get("/dashboard/stats", auth, getDashboardStats);
router.get("/dashboard/monthly-revenue", auth, financial, getMonthlyRevenue);
router.get("/dashboard/notifications", auth, getDashboardNotifications);

/**
 * Get single client
 */
router.get("/:id", auth, getClientById);

/**
 * Create client
 */
router.post("/", auth, upload.single("attorney_file"), createClient);

/**
 * Update client
 */
router.put("/:id", auth, updateClient);

/**
 * Delete client
 */
router.delete("/:id", auth, deleteClient);

module.exports = router;
