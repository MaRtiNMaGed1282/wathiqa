function isEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function isValidMoney(value) {
  if (value === undefined || value === null || value === "") return false;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0;
}

function isValidIntegerId(value) {
  if (value === undefined || value === null || value === "") return false;
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function isValidDate(value) {
  if (isEmpty(value)) return false;
  if (typeof value !== "string") return false;

  // Accept the application's ISO date / datetime representations only.
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/.test(value)) {
    return false;
  }

  const parsed = new Date(value.includes("T") || value.includes(" ") ? value : `${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function isDateOnOrAfter(later, earlier) {
  if (!isValidDate(later) || !isValidDate(earlier)) return false;
  return new Date(later) >= new Date(earlier);
}

function isValidDateRange(start, end) {
  if (isEmpty(start) || isEmpty(end)) return true;
  return isDateOnOrAfter(end, start);
}

function isValidNationalId(value) {
  return /^\d{14}$/.test(String(value || ""));
}

function isValidPhone(value) {
  return /^[+]?\d{8,15}$/.test(String(value || "").replace(/[\s()-]/g, ""));
}

function isValidStatus(value, allowed) {
  return !isEmpty(value) && Array.isArray(allowed) && allowed.includes(value);
}

function validateRequired(body, fields) {
  const missing = fields.filter((field) => isEmpty(body?.[field]));
  return missing.length ? missing : null;
}

module.exports = {
  isEmpty,
  isValidMoney,
  isValidIntegerId,
  isValidDate,
  isDateOnOrAfter,
  isValidDateRange,
  isValidNationalId,
  isValidPhone,
  isValidStatus,
  validateRequired,
};
