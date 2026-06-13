const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");

/**
 * Create new client
 */
exports.createClient = (req, res) => {
  const { full_name, national_id, phone, address, notes } = req.body;

  if (!full_name || !national_id || !phone || !address) {
    return res.status(400).json({
      message: "الاسم والرقم القومي ورقم الهاتف والعنوان مطلوبة",
    });
  }

  db.run(
    `
    INSERT INTO clients
    (
      full_name,
      national_id,
      phone,
      address,
      notes
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [full_name, national_id, phone, address, notes || null],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({
            message: "الرقم القومي مسجل مسبقاً",
          });
        }

        return res.status(500).json({
          message: "فشل إضافة موكل",
        });
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

  const { full_name, national_id, phone, address, notes } = req.body;

  db.run(
    `
    UPDATE clients
    SET
      full_name = ?,
      national_id = ?,
      phone = ?,
      address = ?,
      notes = ?
    WHERE id = ?
    `,
    [full_name, national_id, phone, address, notes || null, id],
    function (err) {
      if (err) {
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
      OR national_id LIKE ?
      OR phone LIKE ?
    ORDER BY created_at DESC
    `,
    [search, search, search],
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
        SUM(lc.total_fees),
        0
      ) AS total_fees,

      COALESCE(
        SUM(p.amount),
        0
      ) AS total_paid

    FROM legal_cases lc

    LEFT JOIN payments p
      ON lc.case_id = p.case_id

    WHERE lc.client_id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const result = row || {
        total_cases: 0,
        total_fees: 0,
        total_paid: 0,
      };

      result.remaining =
        Number(result.total_fees || 0) - Number(result.total_paid || 0);

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
  db.get(
    `
    SELECT
      (SELECT COUNT(*) FROM clients) AS total_clients,

      (SELECT COUNT(*) FROM legal_cases) AS total_cases,

      (
        SELECT COALESCE(SUM(total_fees), 0)
        FROM legal_cases
      ) AS total_fees,

      (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
      ) AS total_paid
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const data = row || {
        total_clients: 0,
        total_cases: 0,
        total_fees: 0,
        total_paid: 0,
      };

      data.remaining =
        Number(data.total_fees || 0) - Number(data.total_paid || 0);

      res.json(data);
    },
  );
};

exports.getRevenueClients = (req, res) => {
  db.all(
    `
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

    LEFT JOIN payments p
      ON lc.case_id = p.case_id

    GROUP BY
      c.id,
      c.full_name

    ORDER BY total_fees DESC
    `,
    [],
    (err, rows) => {
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
    },
  );
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
      lc.case_id,
      lc.case_title

    FROM payments p

    LEFT JOIN legal_cases lc
      ON p.case_id = lc.case_id

    LEFT JOIN clients c
      ON lc.client_id = c.id

    ORDER BY p.payment_date DESC

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
