exports.getDashboard = async (req, res, next) => {
  try {
    const dashboard = {
      summary: {
        hearingsToday: 0,
        appointmentsToday: 0,
        notifications: 0,
        urgentTasks: 0,
      },

      statistics: {
        totalClients: 0,
        activeCases: 0,
        hearingsToday: 0,
      },

      todayAgenda: [],
      recentClients: [],
      recentCases: [],
    };

    if (req.user.role === "admin" || req.user.role === "lawyer") {
      dashboard.statistics.monthlyRevenue = 0;
      dashboard.statistics.outstandingPayments = 0;
      dashboard.financial = {
        totalRevenue: 0,
        outstandingAmount: 0,
        monthlyRevenue: 0,
        overduePayments: 0,
      };
    }

    res.json({
      office: {
        officeName: "مكتب واثقة للمحاماة",
      },
      dashboard,
    });
  } catch (error) {
    next(error);
  }
};
