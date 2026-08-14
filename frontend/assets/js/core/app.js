"use strict";

(function (global) {
  const state = { initialized: false };

  async function initializeAuthentication() {
    if (!global.auth || typeof global.auth.requireAuth !== "function") {
      throw new Error("Authentication module is not available.");
    }
    await global.auth.requireAuth();
  }

  async function initializeComponents() {
    if (!global.Sidebar || typeof global.Sidebar.load !== "function") {
      throw new Error("Sidebar module is not available.");
    }
    if (!global.Navbar || typeof global.Navbar.load !== "function") {
      throw new Error("Navbar module is not available.");
    }
    await global.Sidebar.load();
    await global.Navbar.load();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatNumber(value) { return Number(value || 0).toLocaleString("ar-EG"); }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function setDashboardKpi(id, value) {
    const node = document.getElementById(id)?.querySelector("h2");
    if (node) node.textContent = value;
  }

  function dashboardGreeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "صباح الخير" : hour < 17 ? "مساء الخير" : "أهلاً بعودتك";
  }

  function cleanupDashboardLegacy() {
    document.getElementById("action-upload-document")?.remove();
    document.querySelectorAll('a[href*="documents.html"], a[href*="templates.html"]').forEach((element) => element.remove());
  }

  function renderDashboard(data) {
    const dashboard = data.dashboard || {};
    const summary = dashboard.summary || {};
    const statistics = dashboard.statistics || {};
    const financial = dashboard.financial || null;
    const office = data.office || {};

    document.getElementById("dashboard-greeting")?.replaceChildren(document.createTextNode(dashboardGreeting()));
    document.getElementById("dashboard-office-name")?.replaceChildren(document.createTextNode(office.officeName || "مكتب المحاماة"));
    const summaryNode = document.getElementById("dashboard-summary");
    if (summaryNode) summaryNode.textContent = `لديك اليوم ${summary.hearingsToday ?? 0} جلسات، ${summary.urgentTasks ?? 0} مهام عاجلة و${summary.notifications ?? 0} إشعارات جديدة.`;
    const timeNode = document.getElementById("dashboard-time");
    if (timeNode) timeNode.textContent = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const dateNode = document.getElementById("dashboard-date");
    if (dateNode) dateNode.textContent = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const backupNode = document.getElementById("dashboard-backup");
    if (backupNode) backupNode.textContent = office.lastBackup || "غير متوفر";

    setDashboardKpi("kpi-total-clients", formatNumber(statistics.totalClients));
    setDashboardKpi("kpi-active-cases", formatNumber(statistics.activeCases));
    setDashboardKpi("kpi-hearings", formatNumber(statistics.hearingsToday));
    setDashboardKpi("kpi-tasks", formatNumber(summary.urgentTasks));
    setDashboardKpi("kpi-notifications", formatNumber(summary.notifications));
    setDashboardKpi("kpi-success-rate", "—");

    const clientSub = document.getElementById("kpi-total-clients")?.querySelector("p.text-xs");
    if (clientSub) clientSub.textContent = `+${formatNumber(statistics.clientsThisMonth)} هذا الشهر`;
    const caseSub = document.getElementById("kpi-active-cases")?.querySelector("p.text-xs");
    if (caseSub) caseSub.textContent = `${formatNumber(statistics.newCasesThisMonth)} جديدة`;

    const revenueCard = document.getElementById("kpi-revenue");
    const outstandingCard = document.getElementById("kpi-outstanding");
    if (!financial) {
      revenueCard?.classList.add("hidden");
      outstandingCard?.classList.add("hidden");
      document.getElementById("action-payment")?.remove();
      document.getElementById("dashboard-financial-chart")?.classList.add("hidden");
    } else {
      setDashboardKpi("kpi-revenue", formatNumber(financial.monthlyRevenue));
      setDashboardKpi("kpi-outstanding", formatNumber(financial.outstandingAmount));
      const financialContainer = document.getElementById("dashboard-financial-chart");
      if (financialContainer) {
        financialContainer.classList.remove("hidden");
        financialContainer.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm p-6"><div class="flex items-center justify-between"><div><h2 class="text-xl font-bold">النظرة المالية</h2><p class="mt-1 text-sm text-gray-500">ملخص مالي مباشر من قاعدة البيانات</p></div><a href="revenues.html" class="text-primary font-semibold hover:underline">عرض الإيرادات</a></div><div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6"><div class="rounded-2xl bg-green-50 p-4"><p class="text-sm text-gray-500">إيرادات الشهر</p><p class="mt-2 text-2xl font-bold">${formatNumber(financial.monthlyRevenue)}</p></div><div class="rounded-2xl bg-amber-50 p-4"><p class="text-sm text-gray-500">المستحقات</p><p class="mt-2 text-2xl font-bold">${formatNumber(financial.outstandingAmount)}</p></div><div class="rounded-2xl bg-blue-50 p-4"><p class="text-sm text-gray-500">إجمالي المحصل</p><p class="mt-2 text-2xl font-bold">${formatNumber(financial.totalRevenue)}</p></div><div class="rounded-2xl bg-purple-50 p-4"><p class="text-sm text-gray-500">صافي الربح</p><p class="mt-2 text-2xl font-bold">${formatNumber(financial.netProfit)}</p></div></div></div>`;
      }
    }

    const tbody = document.getElementById("today-hearings-body");
    if (tbody) {
      tbody.replaceChildren();
      const hearings = dashboard.todayHearings || [];
      if (!hearings.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-gray-500">لا توجد جلسات اليوم.</td></tr>`;
      } else {
        hearings.forEach((hearing) => {
          const row = document.createElement("tr");
          row.className = "border-b border-gray-100 hover:bg-gray-50";
          row.innerHTML = `<td class="px-6 py-4">${escapeHtml(hearing.time)}</td><td class="px-6 py-4">${escapeHtml(hearing.caseNumber)}</td><td class="px-6 py-4">${escapeHtml(hearing.clientName)}</td><td class="px-6 py-4">${escapeHtml(hearing.courtName)}</td><td class="px-6 py-4">${escapeHtml(hearing.caseType)}</td><td class="px-6 py-4 text-center"><span class="rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700">${escapeHtml(hearing.statusText)}</span></td><td class="px-6 py-4 text-center"><a href="case-profile.html?id=${encodeURIComponent(hearing.caseId)}" class="text-primary font-semibold hover:underline">فتح</a></td>`;
          tbody.appendChild(row);
        });
      }
    }

    const notifications = document.getElementById("notifications-list");
    if (notifications) {
      notifications.replaceChildren();
      const items = dashboard.notifications || [];
      notifications.innerHTML = items.length ? items.map((item) => `<div class="flex items-start gap-4 p-5 hover:bg-gray-50 transition"><div class="w-3 h-3 rounded-full mt-2 bg-primary"></div><div class="flex-1"><h3 class="font-semibold">${escapeHtml(item.title)}</h3><p class="mt-1 text-sm text-gray-500">${escapeHtml(item.message)}</p><p class="mt-2 text-xs text-gray-400">${formatDateTime(item.created_at)}</p></div></div>`).join("") : `<div class="p-8 text-center text-gray-500">لا توجد إشعارات جديدة.</div>`;
    }

    const recentCases = document.getElementById("dashboard-recent-cases");
    if (recentCases) recentCases.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"><div class="px-6 py-5 border-b border-gray-100"><h2 class="text-xl font-bold">أحدث القضايا</h2><p class="mt-1 text-sm text-gray-500">آخر القضايا المضافة إلى النظام</p></div><div class="divide-y divide-gray-100">${(dashboard.recentCases || []).length ? dashboard.recentCases.map((item) => `<a href="case-profile.html?id=${encodeURIComponent(item.case_id)}" class="block px-6 py-4 hover:bg-gray-50"><div class="flex items-center justify-between gap-4"><div><p class="font-semibold">${escapeHtml(item.case_title || "بدون عنوان")}</p><p class="text-sm text-gray-500 mt-1">${escapeHtml(item.court_case_number || "—")} · ${escapeHtml(item.client_name || "—")}</p></div><span class="text-xs rounded-full bg-gray-100 px-3 py-1">${escapeHtml(item.case_status || "—")}</span></div></a>`).join("") : `<div class="p-8 text-center text-gray-500">لا توجد قضايا حديثة.</div>`}</div></div>`;

    const recentClients = document.getElementById("dashboard-recent-clients");
    if (recentClients) recentClients.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"><div class="px-6 py-5 border-b border-gray-100"><h2 class="text-xl font-bold">أحدث الموكلين</h2><p class="mt-1 text-sm text-gray-500">آخر الموكلين المسجلين</p></div><div class="divide-y divide-gray-100">${(dashboard.recentClients || []).length ? dashboard.recentClients.map((item) => `<a href="client-profile.html?id=${encodeURIComponent(item.id)}" class="block px-6 py-4 hover:bg-gray-50"><div class="flex items-center justify-between gap-4"><div><p class="font-semibold">${escapeHtml(item.full_name)}</p><p class="text-sm text-gray-500 mt-1">${escapeHtml(item.phone || item.client_code || "—")}</p></div><span class="text-xs text-gray-400">${formatDate(item.created_at)}</span></div></a>`).join("") : `<div class="p-8 text-center text-gray-500">لا توجد بيانات.</div>`}</div></div>`;

    const deadlines = document.getElementById("dashboard-deadlines");
    if (deadlines) deadlines.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"><div class="px-6 py-5 border-b border-gray-100"><h2 class="text-xl font-bold">المواعيد النهائية</h2><p class="mt-1 text-sm text-gray-500">مواعيد الخدمات القادمة</p></div><div class="divide-y divide-gray-100">${(dashboard.deadlines || []).length ? dashboard.deadlines.map((item) => `<a href="service-profile.html?id=${encodeURIComponent(item.record_id)}" class="block px-6 py-4 hover:bg-gray-50"><div class="flex items-center justify-between gap-4"><p class="font-semibold">${escapeHtml(item.title || "خدمة")}</p><span class="text-sm text-gray-500">${formatDate(item.due_date)}</span></div></a>`).join("") : `<div class="p-8 text-center text-gray-500">لا توجد مواعيد نهائية قادمة.</div>`}</div></div>`;

    const activity = document.getElementById("dashboard-activity");
    if (activity) activity.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"><div class="px-6 py-5 border-b border-gray-100"><h2 class="text-xl font-bold">آخر النشاطات</h2><p class="mt-1 text-sm text-gray-500">آخر العمليات المسجلة في النظام</p></div><div class="divide-y divide-gray-100">${(dashboard.recentActivity || []).length ? dashboard.recentActivity.map((item) => `<div class="px-6 py-4"><div class="flex items-start justify-between gap-4"><div><p class="font-semibold">${escapeHtml(item.description || item.action || "نشاط")}</p><p class="text-sm text-gray-500 mt-1">${escapeHtml(item.user_name || "النظام")}</p></div><span class="text-xs text-gray-400">${formatDateTime(item.created_at)}</span></div></div>`).join("") : `<div class="p-8 text-center text-gray-500">لا توجد نشاطات.</div>`}</div></div>`;

    const calendar = document.getElementById("dashboard-calendar");
    if (calendar) calendar.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden"><div class="px-6 py-5 border-b border-gray-100"><h2 class="text-xl font-bold">الجلسات القادمة</h2><p class="mt-1 text-sm text-gray-500">أقرب المواعيد المسجلة</p></div><div class="divide-y divide-gray-100">${(dashboard.upcomingHearings || []).length ? dashboard.upcomingHearings.map((item) => `<a href="case-profile.html?id=${encodeURIComponent(item.case_id)}" class="block px-6 py-4 hover:bg-gray-50"><div class="flex items-center justify-between gap-4"><div><p class="font-semibold">${escapeHtml(item.case_title || item.court_case_number || "جلسة")}</p><p class="text-sm text-gray-500 mt-1">${escapeHtml(item.client_name || "—")}</p></div><div class="text-left"><p class="font-semibold">${formatDate(item.hearing_date)}</p><p class="text-xs text-gray-400">${escapeHtml(item.hearing_time || "—")}</p></div></div></a>`).join("") : `<div class="p-8 text-center text-gray-500">لا توجد جلسات قادمة.</div>`}</div></div>`;

    const distribution = document.getElementById("dashboard-case-distribution");
    if (distribution) {
      const rows = dashboard.caseDistribution || [];
      const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
      distribution.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm p-6"><h2 class="text-xl font-bold">توزيع القضايا</h2><p class="mt-1 text-sm text-gray-500">حسب نوع القضية</p><div class="mt-6 space-y-4">${rows.length ? rows.map((row) => { const count = Number(row.count || 0); const percentage = total ? Math.round((count / total) * 100) : 0; return `<div><div class="flex items-center justify-between text-sm mb-2"><span>${escapeHtml(row.case_type || "غير محدد")}</span><span class="font-semibold">${count} (${percentage}%)</span></div><div class="h-2 rounded-full bg-gray-100 overflow-hidden"><div class="h-full rounded-full bg-primary" style="width:${percentage}%"></div></div></div>`; }).join("") : `<div class="text-center text-gray-500 py-8">لا توجد بيانات.</div>`}</div></div>`;
    }

    const officeStatus = document.getElementById("dashboard-office-status");
    if (officeStatus) {
      const license = dashboard.license;
      officeStatus.innerHTML = `<div class="card rounded-3xl bg-white border border-gray-100 shadow-sm p-6"><h2 class="text-xl font-bold">حالة النظام والترخيص</h2><div class="mt-5 space-y-4"><div class="flex items-center justify-between"><span class="text-gray-500">قاعدة البيانات</span><span class="font-semibold text-green-600">${escapeHtml(dashboard.system?.database || "غير معروف")}</span></div><div class="flex items-center justify-between"><span class="text-gray-500">الخادم</span><span class="font-semibold text-green-600">${escapeHtml(dashboard.system?.server || "غير معروف")}</span></div><div class="flex items-center justify-between"><span class="text-gray-500">حالة الترخيص</span><span class="font-semibold">${license?.active ? "نشط" : "غير نشط"}</span></div><div class="flex items-center justify-between"><span class="text-gray-500">تاريخ الانتهاء</span><span class="font-semibold">${license?.expiryDate ? formatDate(license.expiryDate) : "غير متوفر"}</span></div></div></div>`;
    }

    cleanupDashboardLegacy();
    if (typeof global.lucide !== "undefined") global.lucide.createIcons();
  }

  async function initializeDashboard() {
    const data = await global.api.get("/dashboard");
    renderDashboard(data);
  }

  async function initializePage() {
    if (global.location.pathname.endsWith("/dashboard.html") || global.location.pathname.endsWith("dashboard.html")) {
      await initializeDashboard();
      return;
    }
    if (!global.Page || typeof global.Page.initialize !== "function") return;
    await global.Page.initialize();
  }

  async function initialize() {
    if (state.initialized) return;
    try {
      await initializeAuthentication();
      await initializeComponents();
      await initializePage();
      state.initialized = true;
    } catch (error) {
      console.error("Application initialization failed.", error);
      throw error;
    }
  }

  async function destroy() {
    if (global.Page && typeof global.Page.destroy === "function") await global.Page.destroy();
    if (global.Navbar && typeof global.Navbar.destroy === "function") global.Navbar.destroy();
    if (global.Sidebar && typeof global.Sidebar.destroy === "function") global.Sidebar.destroy();
    state.initialized = false;
  }

  document.addEventListener("DOMContentLoaded", () => initialize().catch((error) => console.error(error)));
  global.App = Object.freeze({ initialize, destroy });
})(window);
