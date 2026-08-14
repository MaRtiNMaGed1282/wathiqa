const {
  isEmpty,
  isValidMoney,
  isValidIntegerId,
  isValidDate,
  isDateOnOrAfter,
  isValidNationalId,
  isValidPhone,
} = require("../utils/validation");

function idParam(name = "id") {
  return (req, res, next) => {
    if (!isValidIntegerId(req.params[name])) {
      return res.status(400).json({ message: `Invalid ${name}` });
    }
    next();
  };
}

function validateClient(req, res, next) {
  const { full_name, national_id, phone, address } = req.body || {};

  if ([full_name, national_id, phone, address].some(isEmpty)) {
    return res.status(400).json({ message: "الاسم والرقم القومي ورقم الهاتف والعنوان مطلوبة" });
  }
  if (!isValidNationalId(national_id)) {
    return res.status(400).json({ message: "الرقم القومي يجب أن يتكون من 14 رقماً" });
  }
  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: "رقم الهاتف غير صالح" });
  }

  next();
}

function validateCase(req, res, next) {
  const {
    court_case_number,
    client_id,
    total_fees,
    case_title,
    case_type,
    opened_at,
    closed_at,
    case_status,
  } = req.body || {};

  if ([court_case_number, client_id, case_title, case_type, opened_at, case_status].some(isEmpty)) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!isValidIntegerId(client_id)) return res.status(400).json({ message: "Invalid client_id" });
  if (!isValidMoney(total_fees)) return res.status(400).json({ message: "Invalid total_fees" });
  if (!isValidDate(opened_at)) return res.status(400).json({ message: "Invalid opened_at" });

  if (!isEmpty(closed_at)) {
    if (!isValidDate(closed_at)) return res.status(400).json({ message: "Invalid closed_at" });
    if (!isDateOnOrAfter(closed_at, opened_at)) {
      return res.status(400).json({ message: "closed_at cannot be earlier than opened_at" });
    }
  }

  next();
}

module.exports = { idParam, validateClient, validateCase };
