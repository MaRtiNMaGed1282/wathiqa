const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty } = require("../utils/validation");

exports.getOfficeSettings = (req, res) => {
  db.get(
    `
    SELECT *
    FROM office_settings
    LIMIT 1
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(row || {});
    },
  );
};
exports.saveOfficeSettings = (req, res) => {
  const {
    office_name,
    owner_name,
    phone,
    secondary_phone,
    email,
    address,
    tax_number,
    commercial_register,
    license_number,
  } = req.body;

  db.get(
    `
    SELECT id
    FROM office_settings
    LIMIT 1
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (row) {
        db.run(
          `
          UPDATE office_settings
          SET
            office_name = ?,
            owner_name = ?,
            phone = ?,
            secondary_phone = ?,
            email = ?,
            address = ?,
            tax_number = ?,
            commercial_register = ?,
            license_number = ?
          WHERE id = ?
          `,
          [
            office_name,
            owner_name,
            phone,
            secondary_phone,
            email,
            address,
            tax_number,
            commercial_register,
            license_number,
            row.id,
          ],
          function (err) {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({
                message: "بيانات المكتب غير موجودة",
              });
            }

            logActivity({
              module: "office",
              record_id: row.id,
              action: "updated",
              description: "تم تعديل بيانات المكتب",
              user_id: req.user.id,
            });

            res.json({
              message: "تم حفظ بيانات المكتب بنجاح",
            });
          },
        );
      } else {
        db.run(
          `
          INSERT INTO office_settings (
            office_name,
            owner_name,
            phone,
            secondary_phone,
            email,
            address,
            tax_number,
            commercial_register,
            license_number
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            office_name,
            owner_name,
            phone,
            secondary_phone,
            email,
            address,
            tax_number,
            commercial_register,
            license_number,
          ],
          function (err) {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            const newId = this.lastID;

            logActivity({
              module: "office",
              record_id: newId,
              action: "created",
              description: "تم إضافة بيانات المكتب",
              user_id: req.user.id,
            });

            res.json({
              message: "تم حفظ بيانات المكتب بنجاح",
            });
          },
        );
      }
    },
  );
};
exports.uploadOfficeAssets = (req, res) => {
  const logo = req.files?.logo?.[0]?.filename || null;

  const stamp = req.files?.stamp?.[0]?.filename || null;

  if (!req.files?.logo?.[0] && !req.files?.stamp?.[0]) {
    return res.status(400).json({
      message: "At least one upload is required",
    });
  }

  db.get(
    `
    SELECT id
    FROM office_settings
    LIMIT 1
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row) {
        return res.status(400).json({
          message: "يجب حفظ بيانات المكتب أولاً",
        });
      }

      let query = `
        UPDATE office_settings
        SET
          logo_path = COALESCE(?, logo_path),
          stamp_path = COALESCE(?, stamp_path)
        WHERE id = ?
      `;

      db.run(query, [logo, stamp, row.id], function (err) {
        if (err) {
          return res.status(500).json({
            message: err.message,
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            message: "بيانات المكتب غير موجودة",
          });
        }

        logActivity({
          module: "office",
          record_id: row.id,
          action: "updated",
          description: "تم رفع ملفات المكتب",
          user_id: req.user.id,
        });

        createNotification({
          title: "Office assets updated",
          message: `Office assets updated${logo ? " with logo" : ""}${stamp ? " with stamp" : ""}`,
          type: "info",
          module: "office",
          record_id: row.id,
          user_id: req.user.id,
        }).catch((err) => {
          console.error("Notification error:", err.message);
        });

        res.json({
          message: "تم رفع الملفات بنجاح",
          logo,
          stamp,
        });
      });
    },
  );
};
