"use strict";

(function (global) {
  const ROUTES = Object.freeze({
    CLIENTS: "clients.html",
    CASES: "cases.html",
    CALENDAR: "calendar.html",
    REVENUES: "revenues.html",
    REPORTS: "reports.html",
  });

  const CONFIG = Object.freeze({ dashboardEndpoint: "/dashboard" });

  const state = {
    clockTimer: null,
    initialized: false,
    loading: false,
    abortController: null,
    elements: {},
    data: null,
  };

  function $(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element: ${id}`);
    return element;
  }

  function cacheElements() {
    state.elements = {
      hero: $("dashboard-hero"),
      greeting: $("dashboard-greeting"),
      officeName: $("dashboard-office-name"),
      summary: $("dashboard-summary"),
      date: $("dashboard-date"),
      time: $("dashboard-time"),
      backup: $("dashboard-backup"),
      dbStatus: $("dashboard-db-status"),
      kpis: $("dashboard-kpis"),
      quickActions: $("dashboard-quick-actions"),
      hearings: $("dashboard-hearings"),
      activity: $("dashboard-activity"),
      financialChart: $("dashboard-financial-chart"),
      recentCases: $("dashboard-recent-cases"),
      calendar: $("dashboard-calendar"),
      notifications: $("dashboard-notifications"),
      deadlines: $("dashboard-deadlines"),
      officeStatus: $("dashboard-office-status"),
      recentClients: $("dashboard-recent-clients"),
      caseDistribution: $("dashboard-case-distribution"),
    };
  }

  function setLoading(value) {
    state.loading = value;
  }

  function createAbortController() {
    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();
    return state.abortController;
  }

  async function fetchDashboard() {
    const controller = createAbortController();
    const response = await api.get(CONFIG.dashboardEndpoint, {
      signal: controller.signal,
    });
    state.data = response;
    return response;
  }

  function renderDashboard(data) {
    renderHero(data);
    renderKPIs(data);
    renderHearings(data);
    renderNotifications(data);
    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "أهلاً بعودتك";
  }

  function updateClock() {
    const now = new Date();
    state.elements.time.textContent = now.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    state.elements.date.textContent = now.toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function renderHero(data) {
    const office = data.office || {};
    const dashboard = data.dashboard || {};
    const summary = dashboard.summary || {};

    state.elements.greeting.textContent = getGreeting();
    state.elements.officeName.textContent = office.officeName || "مكتب المحاماة";
    state.elements.summary.textContent = `لديك اليوم ${summary.hearingsToday ?? 0} جلسات، ${summary.urgentTasks ?? 0} مهام عاجلة و${summary.notifications ?? 0} إشعارات جديدة.`;
    state.elements.backup.textContent = office.lastBackup || "غير متوفر";
    state.elements.dbStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-400"></span> متصلة';
    updateClock();
  }

  function notificationColor(type) {
    switch (type) {
      case "hearing": return "bg-blue-500";
      case "financial": return "bg-green-500";
      case "document": return "bg-orange-500";
      case "system": return "bg-purple-500";
      default: return "bg-gray-400";
    }
  }

  function renderNotifications(data) {
    const container = $("notifications-list");
    container.replaceChildren();
    const notifications = data.notifications || data.dashboard?.notifications || [];
    if (!notifications.length) {
      container.innerHTML = '<div class="p-8 text-center text-gray-500">لا توجد إشعارات جديدة.</div>';
      return;
    }
    notifications.forEach((item) => {
      const element = document.createElement("div");
      element.className = "flex items-start gap-4 p-5 hover:bg-gray-50 transition";
      element.innerHTML = `<div class="w-3 h-3 rounded-full mt-2 ${notificationColor(item.type)}"></div><div class="flex-1"><h3 class="font-semibold">${item.title}</h3><p class="mt-1 text-sm text-gray-500">${item.message}</p><p class="mt-2 text-xs text-gray-400">${item.time}</p></div>`;
      container.appendChild(element);
    });
  }

  function setKPI(id, value) {
    const card = document.getElementById(id);
    if (!card) return;
    const number = card.querySelector("h2");
    if (number) number.textContent = value;
  }

  function renderKPIs(data) {
    const dashboard = data.dashboard || {};
    const statistics = dashboard.statistics || dashboard;
    const financial = dashboard.financial || {};

    setKPI("kpi-total-clients", statistics.totalClients ?? statistics.clients ?? 0);
    setKPI("kpi-active-cases", statistics.activeCases ?? 0);
    setKPI("kpi-hearings", statistics.hearingsToday ?? dashboard.hearingsToday ?? 0);
    setKPI("kpi-tasks", dashboard.summary?.urgentTasks ?? dashboard.urgentTasks ?? 0);
    setKPI("kpi-revenue", (financial.monthlyRevenue ?? dashboard.monthRevenue ?? 0).toLocaleString("ar-EG"));
    setKPI("kpi-outstanding", (financial.outstandingAmount ?? dashboard.outstandingPayments ?? 0).toLocaleString("ar-EG"));
    setKPI("kpi-notifications", dashboard.summary?.notifications ?? dashboard.notifications?.length ?? 0);

    const successRate = dashboard.successRate ?? statistics.successRate ?? 0;
    setKPI("kpi-success-rate", `${successRate}%`);
  }

  function navigate(route) {
    global.location.href = route;
  }

  function initializeQuickActions() {
    const actions = [
      ["action-new-client", ROUTES.CLIENTS],
      ["action-new-case", ROUTES.CASES],
      ["action-new-hearing", ROUTES.CALENDAR],
      ["action-payment", ROUTES.REVENUES],
      ["action-search", ROUTES.REPORTS],
    ];
    actions.forEach(([id, route]) => {
      const button = document.getElementById(id);
      if (button) button.addEventListener("click", () => navigate(route));
    });
    document.getElementById("action-upload-document")?.remove();
  }

  async function initialize() {
    if (state.initialized || state.loading) return;
    setLoading(true);
    try {
      cacheElements();
      initializeQuickActions();
      const data = await fetchDashboard();
      renderDashboard(data);
      updateClock();
      if (state.clockTimer) clearInterval(state.clockTimer);
      state.clockTimer = setInterval(updateClock, 1000);
      state.initialized = true;
    } finally {
      setLoading(false);
    }
  }

  function hearingStatusBadge(status) {
    const map = {
      scheduled: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      postponed: "bg-yellow-100 text-yellow-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-gray-100 text-gray-700";
  }

  function renderHearings(data) {
    const tbody = document.getElementById("today-hearings-body");
    if (!tbody) return;
    tbody.replaceChildren();
    const hearings = data.dashboard?.todayHearings || [];
    if (!hearings.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="7" class="py-12 text-center text-gray-500">لا توجد جلسات اليوم.</td>';
      tbody.appendChild(row);
      return;
    }
    hearings.forEach((hearing) => {
      const row = document.createElement("tr");
      row.className = "border-b border-gray-100 hover:bg-gray-50";
      row.innerHTML = `<td class="px-6 py-4">${hearing.time}</td><td class="px-6 py-4">${hearing.caseNumber}</td><td class="px-6 py-4">${hearing.clientName}</td><td class="px-6 py-4">${hearing.courtName}</td><td class="px-6 py-4">${hearing.caseType}</td><td class="px-6 py-4 text-center"><span class="rounded-full px-3 py-1 text-xs font-medium ${hearingStatusBadge(hearing.status)}">${hearing.statusText}</span></td><td class="px-6 py-4 text-center"><a href="case-profile.html?id=${hearing.caseId}" class="text-primary font-semibold hover:underline">فتح</a></td>`;
      tbody.appendChild(row);
    });
  }

  function destroy() {
    if (state.abortController) state.abortController.abort();
    if (state.clockTimer) {
      clearInterval(state.clockTimer);
      state.clockTimer = null;
    }
    state.initialized = false;
    state.loading = false;
    state.abortController = null;
    state.data = null;
    state.elements = {};
  }

  global.Page = Object.freeze({ initialize, destroy });
})(window);
