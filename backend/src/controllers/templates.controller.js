const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty } = require("../utils/validation");

exports.getAllTemplates = (req, res) => {
  db.all(
    `
    SELECT *
    FROM legal_templates
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};

exports.getTemplateById = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT *
    FROM legal_templates
    WHERE id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "Template not found",
        });
      }

      res.json(row);
    },
  );
};
exports.createTemplate = (req, res) => {
  const { title, category, description, tags } = req.body;

  if (isEmpty(title) || isEmpty(category)) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      message: "Template file is required",
    });
  }

  db.run(
    `
    INSERT INTO legal_templates (
      title,
      category,
      description,
      tags,
      file_path
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [title, category, description, tags, req.file.filename],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const templateId = this.lastID;

      logActivity({
        module: "template",
        record_id: templateId,
        action: "created",
        description: "تم إضافة النموذج",
        user_id: req.user.id,
      });

      createNotification({
        title: "Template created",
        message: `A new template was created: ${title}`,
        type: "info",
        module: "template",
        record_id: templateId,
        user_id: req.user.id,
      }).catch((err) => {
        console.error("Notification error:", err.message);
      });

      res.status(201).json({
        message: "تم إضافة النموذج بنجاح",
        id: templateId,
      });
    },
  );
};
exports.searchTemplates = (req, res) => {
  const q = `%${req.query.q || ""}%`;

  db.all(
    `
    SELECT *
    FROM legal_templates
    WHERE
      title LIKE ?
      OR category LIKE ?
      OR tags LIKE ?
    ORDER BY created_at DESC
    `,
    [q, q, q],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};
const fs = require("fs");
const path = require("path");

exports.deleteTemplate = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT *
    FROM legal_templates
    WHERE id = ?
    `,
    [id],
    (err, template) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!template) {
        return res.status(404).json({
          message: "Template not found",
        });
      }

      const filePath = path.join(
        __dirname,
        "../../../database/templates",
        template.file_path,
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      db.run(
        `
        DELETE FROM legal_templates
        WHERE id = ?
        `,
        [id],
        function (err) {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              message: "Template not found",
            });
          }

          logActivity({
            module: "template",
            record_id: Number(id),
            action: "deleted",
            description: "تم حذف النموذج",
            user_id: req.user.id,
          });

          res.json({
            message: "تم حذف النموذج بنجاح",
          });
        },
      );
    },
  );
};
exports.updateTemplate = (req, res) => {
  const { id } = req.params;

  const { title, category, description, tags } = req.body;

  if (isEmpty(title) || isEmpty(category)) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  db.get(
    `
    SELECT *
    FROM legal_templates
    WHERE id = ?
    `,
    [id],
    (err, template) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!template) {
        return res.status(404).json({
          message: "Template not found",
        });
      }

      let filePath = template.file_path;

      if (req.file) {
        const fs = require("fs");
        const path = require("path");

        const oldFile = path.join(
          __dirname,
          "../../../database/templates",
          template.file_path,
        );

        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }

        filePath = req.file.filename;
      }

      db.run(
        `
        UPDATE legal_templates
        SET
          title = ?,
          category = ?,
          description = ?,
          tags = ?,
          file_path = ?
        WHERE id = ?
        `,
        [title, category, description, tags, filePath, id],
        function (err) {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              message: "Template not found",
            });
          }

          logActivity({
            module: "template",
            record_id: Number(id),
            action: "updated",
            description: "تم تعديل النموذج",
            user_id: req.user.id,
          });

          res.json({
            message: "Template updated successfully",
          });
        },
      );
    },
  );
};
exports.attachTemplateToCase = (req, res) => {
  const { case_id, template_id } = req.body;

  if (isEmpty(case_id) || isEmpty(template_id)) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  db.get(
    `SELECT id FROM case_templates WHERE case_id = ? AND template_id = ?`,
    [case_id, template_id],
    (err, existing) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (existing) {
        return res.status(400).json({
          message: "Template already attached to this case",
        });
      }

      db.run(
        `
    INSERT INTO case_templates (
      case_id,
      template_id
    )
    VALUES (?, ?)
    `,
        [case_id, template_id],
        function (err) {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          const attachId = this.lastID;

          logActivity({
            module: "template",
            record_id: attachId,
            action: "attached",
            description: "تم ربط النموذج بالقضية",
            user_id: req.user.id,
          });

          res.status(201).json({
            message: "Template attached successfully",
            id: attachId,
          });
        },
      );
    },
  );
};
exports.getCaseTemplates = (req, res) => {
  const { caseId } = req.params;

  db.all(
    `
    SELECT
      ct.id,
      lt.id AS template_id,
      lt.title,
      lt.category,
      lt.file_path,
      ct.attached_at

    FROM case_templates ct

    JOIN legal_templates lt
      ON ct.template_id = lt.id

    WHERE ct.case_id = ?

    ORDER BY ct.attached_at DESC
    `,
    [caseId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};
exports.removeCaseTemplate = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM case_templates
    WHERE id = ?
    `,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Template not attached",
        });
      }

      logActivity({
        module: "template",
        record_id: Number(id),
        action: "detached",
        description: "تم إلغاء ربط النموذج",
        user_id: req.user.id,
      });

      res.json({
        message: "Template detached successfully",
      });
    },
  );
};
