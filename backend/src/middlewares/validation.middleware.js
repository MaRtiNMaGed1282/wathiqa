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
      return res.status(400).json({ message: "المعرف المحدد غير صالح" });
    }
    next();
  };
}

function validateClient(req, res, next) {
  const { full_name, national_id, phone } = req.body || {};

  if (isEmpty(full_name)) {
    return res.status(400).json({ message: "اسم الموكل مطلوب" });
  }

  if (!isEmpty(national_id) && !isValidNationalId(national_id)) {
    return res.status(400).json({ message: "الرقم القومي يجب أن يتكون من 14 رقماً" });
  }

  if (!isEmpty(phone) && !isValidPhone(phone)) {
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

  const missing = [];
  if (isEmpty(court_case_number)) missing.push("رقم القضية بالمحكمة");
  if (isEmpty(client_id)) missing.push("الموكل");
  if (isEmpty(case_title)) missing.push("عنوان القضية");
  if (isEmpty(case_type)) missing.push("نوع القضية");
  if (isEmpty(opened_at)) missing.push("تاريخ فتح القضية");
  if (isEmpty(case_status)) missing.push("حالة القضية");

  if (missing.length) {
    return res.status(400).json({
      message: `الحقول المطلوبة غير مكتملة: ${missing.join("، ")}`,
      missing,
    });
  }

  if (!isValidIntegerId(client_id)) return res.status(400).json({ message: "الموكل المحدد غير صالح" });
  if (!isValidMoney(total_fees)) return res.status(400).json({ message: "إجمالي الأتعاب غير صالح" });
  if (!isValidDate(opened_at)) return res.status(400).json({ message: "تاريخ فتح القضية غير صالح" });

  if (!isEmpty(closed_at)) {
    if (!isValidDate(closed_at)) return res.status(400).json({ message: "تاريخ إغلاق القضية غير صالح" });
    if (!isDateOnOrAfter(closed_at, opened_at)) {
      return res.status(400).json({ message: "تاريخ إغلاق القضية لا يمكن أن يسبق تاريخ الفتح" });
    }
  }

  next();
}

module.exports = { idParam, validateClient, validateCase };
