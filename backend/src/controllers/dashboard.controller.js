exports.getDashboard = async (req, res, next) => {
  try {
    res.json({
      office: {
        officeName: "مكتب واثقة للمحاماة",
      },

      dashboard: {
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
          monthlyRevenue: 0,
          outstandingPayments: 0,
        },

        financial: {
          totalRevenue: 0,
          outstandingAmount: 0,
          monthlyRevenue: 0,
          overduePayments: 0,
        },

        todayAgenda: [],

        recentClients: [],

        recentCases: [],
      },
    });
  } catch (error) {
    next(error);
  }
};
