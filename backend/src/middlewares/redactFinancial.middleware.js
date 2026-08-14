const FINANCIAL_KEYS = new Set([
  "total_fees",
  "case_fees",
  "service_fees",
  "total_paid",
  "paid",
  "remaining",
  "remaining_fees",
  "total_expenses",
  "net_profit",
  "collection_rate",
  "monthly_fees",
  "monthly_paid",
  "monthly_remaining",
  "monthlyRevenue",
  "outstandingPayments",
  "outstandingAmount",
  "totalRevenue",
  "overduePayments",
]);

function redact(value) {
  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result = {};

  for (const [key, child] of Object.entries(value)) {
    if (!FINANCIAL_KEYS.has(key) && key !== "financial") {
      result[key] = redact(child);
    }
  }

  return result;
}

module.exports = (req, res, next) => {
  if (req.user?.role !== "assistant") {
    return next();
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(redact(body));

  next();
};
