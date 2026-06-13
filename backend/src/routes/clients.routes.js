const express = require("express");
const router = express.Router();

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
} = require("../controllers/clients.controller");

/**
 * Search clients
 * Must come before /:id
 */
router.get("/search", searchClients);

/**
 * Get all clients
 */
router.get("/", getAllClients);

router.get("/:id/financial-summary", getClientFinancialSummary);

router.get("/:id/cases-financial", getClientCasesFinancial);

router.get("/revenues/summary", getRevenueSummary);

router.get("/revenues/clients", getRevenueClients);

router.get("/dashboard/stats", getDashboardStats);

router.get("/dashboard/monthly-revenue", getMonthlyRevenue);

router.get("/dashboard/notifications", getDashboardNotifications);

router.get("/dashboard/top-debtors", getTopDebtors);

router.get("/dashboard/recent-payments", getRecentPayments);

/**
 * Get single client
 */
router.get("/:id", getClientById);

/**
 * Create client
 */
router.post("/", createClient);

/**
 * Update client
 */
router.put("/:id", updateClient);

/**
 * Delete client
 */
router.delete("/:id", deleteClient);

module.exports = router;
