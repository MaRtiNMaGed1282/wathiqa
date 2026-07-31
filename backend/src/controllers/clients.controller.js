const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");

/**
 * Create new client
 */
exports.createClient = (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  const {
    full_name,
    client_code,
    national_id,
    phone,
    address,
    notes,
    attorney_number,
    attorney_type,
    issuing_office,
  } = req.body;

  const attorneyFile = req.file?.filename || null;

  if (!full_name || !national_id || !phone || !address) {
    return res.status(400).json({
      message: "الاسم والرقم القومي ورقم الهاتف والعنوان مطلوبة",
    });
  }

  db.run(
    `
INSERT INTO clients
(
  client_code,
  full_name,
  national_id,
  phone,
  address,
  notes
)
VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      client_code || null,
      full_name,
      national_id,
      phone,
      address,
      notes || null,
    ],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({
            message: "الرقم القومي مسجل مسبقاً",
          });
        }

        if (err.message.includes("clients.client_code")) {
          return res.status(400).json({
            message: "كود الموكل مستخدم مسبقاً",
          });
        }

        return res.status(500).json({
          message: "فشل إضافة موكل",
        });
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
        title: "Client created",
        message: `A new client was added: ${full_name}`,
        type: "info",
        module: "client",
        record_id: clientId,
        user_id: req.user.id,
      }).catch((err) => {
        console.error("Notification error:", err.message);
      });

      if (attorney_number) {
        db.run(
          `
INSERT INTO client_attorneys (
  client_id,
  attorney_number,
  attorney_type,
  issuing_office,
  file_path
)
VALUES (?, ?, ?, ?, ?)
    `,
          [
            clientId,
            attorney_number,
            attorney_type || null,
            issuing_office || null,
            attorneyFile,
          ],
        );
      }
      res.status(201).json({
        message: "تم إضافة الموكل بنجاح",
        client_id: this.lastID,
      });
    },
  );
};
/**
 * Get all clients
 */
exports.getAllClients = (req, res) => {
  db.all(
    `
    SELECT *
    FROM clients
    ORDER BY created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "فشل في جلب بيانات الموكلين",
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
};

/**
 * Get single client
 */
exports.getClientById = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT *
    FROM clients
    WHERE id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "فشل في جلب بيانات الموكل",
          error: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "الموكل غير موجود",
        });
      }

      res.json(row);
    },
  );
};
/**
 * Update client
 */
exports.updateClient = (req, res) => {
  const { id } = req.params;

  const { full_name, client_code, national_id, phone, address, notes } =
    req.body;

  db.run(
    `
 UPDATE clients
SET
  client_code = ?,
  full_name = ?,
  national_id = ?,
  phone = ?,
  address = ?,
  notes = ?
WHERE id = ?
    `,
    [client_code || null, full_name, national_id, phone, address, notes, id],
    function (err) {
      if (err) {
        if (err.message.includes("clients.client_code")) {
          return res.status(400).json({
            message: "كود الموكل مستخدم مسبقاً",
          });
        }

        if (err.message.includes("national_id")) {
          return res.status(400).json({
            message: "الرقم القومي مسجل مسبقاً",
          });
        }

        return res.status(500).json({
          message: "فشل في تعديل بيانات الموكل",
          error: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "الموكل غير موجود",
        });
      }

      logActivity({
        module: "client",
        record_id: Number(id),
        action: "updated",
        description: "تم تعديل بيانات الموكل",
        user_id: req.user.id,
      });

      res.json({
        message: "تم تعديل بيانات الموكل بنجاح",
      });
    },
  );
};
/**
 * Delete client
 */
exports.deleteClient = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM clients
    WHERE id = ?
    `,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "فشل في حذف الموكل",
          error: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "الموكل غير موجود",
        });
      }

      logActivity({
        module: "client",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف الموكل",
        user_id: req.user.id,
      });

      res.json({
        message: "تم حذف الموكل بنجاح",
      });
    },
  );
};
/**
 * Search clients
 */
exports.searchClients = (req, res) => {
  const search = `%${req.query.q || ""}%`;

  db.all(
    `
    SELECT *
    FROM clients
WHERE
  full_name LIKE ?
  OR client_code LIKE ?
  OR national_id LIKE ?
  OR phone LIKE ?
    ORDER BY created_at DESC
    `,
    [search, search, search, search],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "فشل في البحث",
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
};

exports.getClientFinancialSummary = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      COUNT(DISTINCT lc.case_id) AS total_cases,

      COALESCE(
        (
          SELECT COUNT(*)
          FROM legal_services
          WHERE client_id = ?
        ),
        0
      ) AS total_services,

COALESCE(
  (
    SELECT SUM(total_fees)
    FROM legal_services
    WHERE client_id = ?
  ),
  0
) AS service_fees,

      COALESCE(
        SUM(DISTINCT lc.total_fees),
        0
      ) AS total_fees,

      COALESCE(
        SUM(p.amount),
        0
      ) AS total_paid,

      COALESCE(
        (
          SELECT SUM(ce.amount)
          FROM case_expenses ce
          JOIN legal_cases lc2
            ON ce.case_id = lc2.case_id
          WHERE lc2.client_id = ?
        ),
        0
      ) AS total_expenses

    FROM legal_cases lc

    LEFT JOIN payments p
      ON lc.case_id = p.case_id

    WHERE lc.client_id = ?
    `,
    [id, id, id, id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const result = row || {};

      result.total_cases = Number(result.total_cases || 0);

      result.total_services = Number(result.total_services || 0);

      result.case_fees = Number(result.total_fees || 0);

      result.service_fees = Number(result.service_fees || 0);

      result.total_fees = result.case_fees + result.service_fees;

      result.total_paid = Number(result.total_paid || 0);

      result.total_expenses = Number(result.total_expenses || 0);

      result.remaining = result.total_fees - result.total_paid;

      result.net_profit = result.total_paid - result.total_expenses;

      result.collection_rate =
        result.total_fees > 0
          ? ((result.total_paid / result.total_fees) * 100).toFixed(1)
          : "0.0";

      res.json(result);
    },
  );
};

exports.getClientCasesFinancial = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT
      lc.case_id,
      lc.case_title,
      lc.case_status,
      lc.court_case_number,
      lc.total_fees,

      COALESCE(
        SUM(p.amount),
        0
      ) AS paid

    FROM legal_cases lc

    LEFT JOIN payments p
      ON lc.case_id = p.case_id

    WHERE lc.client_id = ?

    GROUP BY
      lc.case_id,
      lc.case_title,
      lc.case_status,
      lc.court_case_number,
      lc.total_fees

    ORDER BY lc.created_at DESC
    `,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const result = rows.map((c) => ({
        ...c,
        remaining: Number(c.total_fees || 0) - Number(c.paid || 0),
      }));

      res.json(result);
    },
  );
};

exports.getRevenueSummary = (req, res) => {
  const filter = req.query.filter || "all";

  let caseCondition = "";
  let serviceCondition = "";
  let paymentCondition = "";
  let expenseCondition = "";

  if (filter === "month") {
    caseCondition =
      "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";

    serviceCondition =
      "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";

    paymentCondition =
      "WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')";

    expenseCondition =
      "WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')";
  }

  if (filter === "year") {
    caseCondition = "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";

    serviceCondition =
      "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";

    paymentCondition =
      "WHERE strftime('%Y', payment_date) = strftime('%Y', 'now')";

    expenseCondition =
      "WHERE strftime('%Y', expense_date) = strftime('%Y', 'now')";
  }
  const params = [];

  if (filter === "custom" && req.query.startDate && req.query.endDate) {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    caseCondition = "WHERE date(created_at) BETWEEN ? AND ?";

    serviceCondition = "WHERE date(created_at) BETWEEN ? AND ?";

    paymentCondition = "WHERE date(payment_date) BETWEEN ? AND ?";

    expenseCondition = "WHERE date(expense_date) BETWEEN ? AND ?";

    params.push(
      startDate,
      endDate,
      startDate,
      endDate,
      startDate,
      endDate,
      startDate,
      endDate,
    );
  }

  const query = `
    SELECT
      (SELECT COUNT(*) FROM clients) AS total_clients,

      (SELECT COUNT(*) FROM legal_cases) AS total_cases,

      (SELECT COUNT(*) FROM legal_services) AS total_services,

      (
        SELECT COALESCE(SUM(total_fees),0)
        FROM legal_cases
        ${caseCondition}
      ) AS case_fees,

      (
        SELECT COALESCE(SUM(total_fees),0)
        FROM legal_services
        ${serviceCondition}
      ) AS service_fees,

      (
        SELECT COALESCE(SUM(amount),0)
        FROM payments
        ${paymentCondition}
      ) AS total_paid,

      (
        SELECT COALESCE(SUM(amount),0)
        FROM case_expenses
        ${expenseCondition}
      ) AS total_expenses
  `;

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    const data = row || {};

    data.case_fees = Number(data.case_fees || 0);

    data.service_fees = Number(data.service_fees || 0);

    data.total_fees = data.case_fees + data.service_fees;

    data.total_paid = Number(data.total_paid || 0);

    data.total_expenses = Number(data.total_expenses || 0);

    data.remaining = data.total_fees - data.total_paid;

    data.net_profit = data.total_paid - data.total_expenses;

    res.json(data);
  });
};
exports.getRevenueClients = (req, res) => {
  const filter = req.query.filter || "all";

  let caseCondition = "";

  if (filter === "month") {
    caseCondition =
      "AND strftime('%Y-%m', lc.created_at) = strftime('%Y-%m', 'now')";
  }

  if (filter === "year") {
    caseCondition = "AND strftime('%Y', lc.created_at) = strftime('%Y', 'now')";
  }
  const params = [];

  if (filter === "custom" && req.query.startDate && req.query.endDate) {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    caseCondition = "AND date(lc.created_at) BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }
  const query = `
    SELECT
      c.id,
      c.full_name,

      COUNT(DISTINCT lc.case_id) AS total_cases,

      COALESCE(
        SUM(DISTINCT lc.total_fees),
        0
      ) AS total_fees,

      COALESCE(
        SUM(p.amount),
        0
      ) AS total_paid

    FROM clients c

    LEFT JOIN legal_cases lc
      ON c.id = lc.client_id
      ${caseCondition}

    LEFT JOIN payments p
      ON lc.case_id = p.case_id

    GROUP BY
      c.id,
      c.full_name

    ORDER BY total_fees DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    const result = rows.map((c) => ({
      ...c,
      remaining: Number(c.total_fees || 0) - Number(c.total_paid || 0),
    }));

    res.json(result);
  });
};

exports.getDashboardStats = (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const nextWeekDate = nextWeek.toISOString().split("T")[0];

  db.get(
    `
    SELECT
      (SELECT COUNT(*) FROM clients) AS total_clients,

      (SELECT COUNT(*) FROM legal_cases) AS total_cases,

      (
        SELECT COUNT(*)
        FROM hearings
        WHERE hearing_date = ?
      ) AS today_hearings,

      (
        SELECT COUNT(*)
        FROM hearings
        WHERE hearing_date
        BETWEEN ? AND ?
      ) AS week_hearings,

      (
        SELECT COALESCE(SUM(total_fees), 0)
        FROM legal_cases
      ) -
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
      ) AS remaining_fees
    `,
    [today, today, nextWeekDate],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(row);
    },
  );
};

exports.getMonthlyRevenue = (req, res) => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  db.get(
    `
    SELECT

      (
        SELECT COALESCE(
          SUM(total_fees),
          0
        )
        FROM legal_cases
        WHERE strftime('%Y', created_at) = ?
        AND strftime('%m', created_at) = ?
      ) AS monthly_fees,

      (
        SELECT COALESCE(
          SUM(amount),
          0
        )
        FROM payments
        WHERE strftime('%Y', payment_date) = ?
        AND strftime('%m', payment_date) = ?
      ) AS monthly_paid
    `,
    [String(year), month, String(year), month],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const data = row || {
        monthly_fees: 0,
        monthly_paid: 0,
      };

      data.monthly_remaining =
        Number(data.monthly_fees || 0) - Number(data.monthly_paid || 0);

      res.json(data);
    },
  );
};

exports.getDashboardNotifications = (req, res) => {
  const notifications = [];

  const today = new Date().toISOString().split("T")[0];

  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const futureDate = threeDaysLater.toISOString().split("T")[0];

  db.get(
    `
    SELECT COUNT(*) AS today_hearings
    FROM hearings
    WHERE hearing_date = ?
    `,
    [today],
    (err, row1) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const todayHearings = row1?.today_hearings || 0;

      if (todayHearings > 0) {
        notifications.push({
          type: "danger",
          message: `لديك ${todayHearings} جلسة اليوم`,
        });
      }

      db.get(
        `
        SELECT COUNT(*) AS upcoming
        FROM hearings
        WHERE hearing_date > ?
        AND hearing_date <= ?
        `,
        [today, futureDate],
        (err2, row2) => {
          if (err2) {
            return res.status(500).json({
              message: err2.message,
            });
          }

          const upcoming = row2?.upcoming || 0;

          if (upcoming > 0) {
            notifications.push({
              type: "warning",
              message: `لديك ${upcoming} جلسة خلال 3 أيام`,
            });
          }

          db.get(
            `
            SELECT
              (
                SELECT COALESCE(SUM(total_fees), 0)
                FROM legal_cases
              )
              -
              (
                SELECT COALESCE(SUM(amount), 0)
                FROM payments
              )
              AS remaining
            `,
            [],
            (err3, row3) => {
              if (err3) {
                return res.status(500).json({
                  message: err3.message,
                });
              }

              const remaining = Number(row3?.remaining || 0);

              if (remaining > 0) {
                notifications.push({
                  type: "info",
                  message: `يوجد مستحقات مالية بقيمة ${remaining.toLocaleString()} جنيه`,
                });
              }

              res.json(notifications);
            },
          );
        },
      );
    },
  );
};

exports.getTopDebtors = (req, res) => {
  db.all(
    `
    SELECT
      c.id,
      c.full_name,

      COALESCE(f.total_fees, 0) AS total_fees,
      COALESCE(p.total_paid, 0) AS total_paid,

      (
        COALESCE(f.total_fees, 0) -
        COALESCE(p.total_paid, 0)
      ) AS remaining

    FROM clients c

    LEFT JOIN (
      SELECT
        client_id,
        SUM(total_fees) AS total_fees
      FROM legal_cases
      GROUP BY client_id
    ) f
      ON c.id = f.client_id

    LEFT JOIN (
      SELECT
        lc.client_id,
        SUM(p.amount) AS total_paid
      FROM payments p
      JOIN legal_cases lc
        ON p.case_id = lc.case_id
      GROUP BY lc.client_id
    ) p
      ON c.id = p.client_id

    WHERE (
      COALESCE(f.total_fees, 0) -
      COALESCE(p.total_paid, 0)
    ) > 0

    ORDER BY remaining DESC

    LIMIT 5
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

exports.getRecentPayments = (req, res) => {
  db.all(
    `
    SELECT
      p.payment_id,
      p.amount,
      p.payment_date,
      p.payment_method,

      c.full_name,

      lc.case_title,

      ls.service_title,

      CASE
        WHEN p.case_id IS NOT NULL THEN 'case'
        WHEN p.service_id IS NOT NULL THEN 'service'
      END AS payment_type

    FROM payments p

    LEFT JOIN legal_cases lc
      ON p.case_id = lc.case_id

    LEFT JOIN legal_services ls
      ON p.service_id = ls.service_id

    LEFT JOIN clients c
      ON c.id = COALESCE(
        lc.client_id,
        ls.client_id
      )

    ORDER BY p.payment_date DESC,
             p.payment_id DESC

    LIMIT 10
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
exports.getTopRevenueItems = (req, res) => {
  const filter = req.query.filter || "all";

  let caseCondition = "";
  let serviceCondition = "";

  if (filter === "month") {
    caseCondition =
      "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";

    serviceCondition =
      "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
  }

  if (filter === "year") {
    caseCondition = "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";

    serviceCondition =
      "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";
  }
  const params = [];

  if (filter === "custom" && req.query.startDate && req.query.endDate) {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    caseCondition = "WHERE date(created_at) BETWEEN ? AND ?";

    serviceCondition = "WHERE date(created_at) BETWEEN ? AND ?";
    params.push(startDate, endDate, startDate, endDate);
  }
  const query = `
    SELECT
      case_id AS id,
      case_title AS title,
      'قضية' AS item_type,
      total_fees

    FROM legal_cases
    ${caseCondition}

    UNION ALL

    SELECT
      service_id AS id,
      service_title AS title,
      'خدمة' AS item_type,
      total_fees

    FROM legal_services
    ${serviceCondition}

    ORDER BY total_fees DESC

    LIMIT 10
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json(rows);
  });
};
