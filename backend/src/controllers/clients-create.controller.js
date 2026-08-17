const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { ensureClientSchema } = require("../services/client-schema.service");

function optionalValue(value) {
  const normalized = typeof value === "string" ? value.trim() : value;
  return normalized === "" || normalized === undefined ? null : normalized;
}

exports.createClient = async (req, res) => {
  const fullName = typeof req.body?.full_name === "string" ? req.body.full_name.trim() : "";

  if (!fullName) {
    return res.status(400).json({ message: "اسم الموكل مطلوب" });
  }

  try {
    await ensureClientSchema();

    const clientCode = optionalValue(req.body.client_code);
    const nationalId = optionalValue(req.body.national_id);
    const phone = optionalValue(req.body.phone);
    const address = optionalValue(req.body.address);
    const notes = optionalValue(req.body.notes);
    const attorneyNumber = optionalValue(req.body.attorney_number);
    const attorneyType = optionalValue(req.body.attorney_type);
    const issuingOffice = optionalValue(req.body.issuing_office);
    const attorneyFile = req.file?.filename || null;

    db.run(
      `
      INSERT INTO clients
        (client_code, full_name, national_id, phone, address, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [clientCode, fullName, nationalId, phone, address, notes],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE") && err.message.includes("national_id")) {
            return res.status(400).json({ message: "الرقم القومي مسجل مسبقاً" });
          }

          if (err.message.includes("UNIQUE") && err.message.includes("client_code")) {
            return res.status(400).json({ message: "كود الموكل مستخدم مسبقاً" });
          }

          console.error("فشل إضافة الموكل:", err.message);
          return res.status(500).json({ message: "فشل إضافة الموكل" });
        }

        const clientId = this.lastID;

        logActivity({
          module: "client",
          record_id: clientId,
          action: "created",
          description: "تم إضافة الموكل",
          user_id: req.user.id,
        });

        createNotification({
          title: "تم إضافة موكل جديد",
          message: `تم إضافة الموكل: ${fullName}`,
          type: "info",
          module: "client",
          record_id: clientId,
          user_id: req.user.id,
        }).catch((error) => {
          console.error("خطأ في إنشاء الإشعار:", error.message);
        });

        if (attorneyNumber) {
          db.run(
            `
            INSERT INTO client_attorneys
              (client_id, attorney_number, attorney_type, issuing_office, file_path)
            VALUES (?, ?, ?, ?, ?)
            `,
            [clientId, attorneyNumber, attorneyType, issuingOffice, attorneyFile],
            (attorneyError) => {
              if (attorneyError) console.error("فشل حفظ بيانات التوكيل:", attorneyError.message);
            },
          );
        }

        return res.status(201).json({
          message: "تم إضافة الموكل بنجاح",
          client_id: clientId,
        });
      },
    );
  } catch (error) {
    console.error("فشل تهيئة بيانات الموكلين:", error.message);
    return res.status(500).json({ message: "تعذر تجهيز بيانات الموكلين" });
  }
};
