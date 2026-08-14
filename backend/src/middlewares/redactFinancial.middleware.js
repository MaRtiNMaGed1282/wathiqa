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

const FINANCIAL_TEXT = /مالية|مستحقات|إيراد|مدفوعات|مصروفات|أتعاب|revenue|payment|expense|profit|fee/i;

function redact(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          typeof item.message === "string" &&
          FINANCIAL_TEXT.test(item.message)
        ) {
          return null;
        }

        return redact(item);
      })
      .filter((item) => item !== null);
  }

  if (typeof value === "string") {
    return FINANCIAL_TEXT.test(value) ? undefined : value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const result = {};

  for (const [key, child] of Object.entries(value)) {
    if (!FINANCIAL_KEYS.has(key) && key !== "financial") {
      const redactedChild = redact(child);
      if (redactedChild !== undefined) {
        result[key] = redactedChild;
      }
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
