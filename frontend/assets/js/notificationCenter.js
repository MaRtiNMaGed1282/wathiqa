(function (global) {
  "use strict";

  const CONFIG = Object.freeze({ endpoint: "/notifications", pageSize: 20, pollingInterval: 30000 });
  const NAVIGATION = Object.freeze({
    case: (id) => `case-profile.html?id=${encodeURIComponent(id)}`,
    client: (id) => `client-profile.html?id=${encodeURIComponent(id)}`,
    service: (id) => `service-profile.html?id=${encodeURIComponent(id)}`,
    hearing: (id) => `calendar.html?hearing=${encodeURIComponent(id)}`,
    payment: (id) => `revenues.html?payment=${encodeURIComponent(id)}`,
    file: (id) => `case-profile.html?id=${encodeURIComponent(id)}&tab=files`,
    expense: (id) => `case-profile.html?id=${encodeURIComponent(id)}&tab=expenses`,
  });
  const state = { polling: false, timer: null, instances: new Map() };

  function normalize(item) {
    return { ...item, id: item.id == null ? null : String(item.id), title: String(item.title || "بدون عنوان"), message: String(item.message || ""), module: String(item.module || "").toLowerCase(), record_id: item.record_id == null ? null : String(item.record_id), is_read: Boolean(item.is_read) };
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return "منذ لحظات";
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
  }

  function icon(type) {
    return { info: "📩", warning: "⚠️", success: "✅", error: "❌" }[String(type || "").toLowerCase()] || "🔔";
  }

  function navigate(item) {
    const builder = NAVIGATION[item.module];
    if (typeof builder !== "function" || !item.record_id) return false;
    global.location.href = builder(item.record_id);
    return true;
  }

  async function refreshBadge() {
    try {
      const result = await api.get(`${CONFIG.endpoint}/unread-count`);
      if (typeof global.refreshNotificationBadge === "function") global.refreshNotificationBadge(Number(result?.count) || 0);
    } catch (error) {
      console.error("Failed to refresh notification badge:", error);
    }
  }

  async function markAsRead(id) {
    try {
      await api.put(`${CONFIG.endpoint}/${encodeURIComponent(id)}/read`, {});
      await refreshBadge();
      return true;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  }

  async function markAllAsRead() {
    try {
      await api.put(`${CONFIG.endpoint}/read-all`, {});
      await refreshBadge();
      for (const instance of state.instances.values()) reloadInstance(instance);
      return true;
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      return false;
    }
  }

  async function deleteNotification(id) {
    try {
      await api.delete(`${CONFIG.endpoint}/${encodeURIComponent(id)}`);
      await refreshBadge();
      for (const instance of state.instances.values()) reloadInstance(instance);
      return true;
    } catch (error) {
      console.error("Failed to delete notification:", error);
      return false;
    }
  }

  function showToast(item) {
    if (!global.Toastify) return;
    const wrapper = document.createElement("div");
    wrapper.className = "text-right cursor-pointer";
    const title = document.createElement("div");
    title.className = "font-semibold text-white";
    title.textContent = `${icon(item.type)} ${item.title}`;
    const message = document.createElement("div");
    message.className = "text-sm text-white/90 mt-1";
    message.textContent = item.message;
    wrapper.append(title, message);
    global.Toastify({ node: wrapper, duration: 5000, gravity: "top", position: "left", close: true, stopOnFocus: true, onClick: async () => { await markAsRead(item.id); navigate(item); } }).showToast();
  }

  function renderEmpty(container) {
    container.innerHTML = `<div class="py-16 text-center text-gray-500"><div class="text-6xl mb-5">📭</div><h3 class="text-lg font-bold text-gray-700 mb-2">لا توجد إشعارات</h3><p class="text-sm leading-7">ستظهر جميع الإشعارات الجديدة هنا.</p></div>`;
  }

  function renderError(container, message) {
    const wrapper = document.createElement("div");
    wrapper.className = "py-16 text-center text-red-500";
    const title = document.createElement("h3");
    title.className = "font-bold mb-2";
    title.textContent = "تعذر تحميل الإشعارات";
    const text = document.createElement("p");
    text.className = "text-sm";
    text.textContent = message || "حدث خطأ غير متوقع";
    wrapper.append(title, text);
    container.replaceChildren(wrapper);
  }

  function renderSkeleton(container) {
    container.innerHTML = Array.from({ length: 5 }, () => `<div class="animate-pulse rounded-xl border border-gray-200 bg-white p-5 mb-3"><div class="flex gap-4"><div class="w-12 h-12 rounded-full bg-gray-200"></div><div class="flex-1"><div class="h-4 bg-gray-200 rounded w-2/3 mb-3"></div><div class="h-3 bg-gray-100 rounded w-full mb-2"></div><div class="h-3 bg-gray-100 rounded w-3/4"></div></div></div></div>`).join("");
  }

  function createCard(item, instance) {
    const card = document.createElement("div");
    card.className = `group w-full rounded-2xl border border-gray-200 bg-white p-5 text-right transition duration-200 hover:border-primary/40 hover:shadow-md ${item.is_read ? "" : "bg-primary/5 border-primary/20"}`;
    card.dataset.id = item.id;
    card.setAttribute("role", "listitem");

    const row = document.createElement("div");
    row.className = "flex items-start gap-4";
    const iconBox = document.createElement("div");
    iconBox.className = "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl";
    iconBox.textContent = icon(item.type);
    const body = document.createElement("div");
    body.className = "min-w-0 flex-1 cursor-pointer";
    const titleRow = document.createElement("div");
    titleRow.className = "flex items-center gap-3";
    const title = document.createElement("div");
    title.className = "truncate font-semibold text-gray-800 flex-1";
    title.textContent = item.title;
    const time = document.createElement("div");
    time.className = "shrink-0 text-xs text-gray-500";
    time.textContent = relativeTime(item.created_at);
    titleRow.append(title);
    if (!item.is_read) {
      const dot = document.createElement("span");
      dot.className = "w-2.5 h-2.5 rounded-full bg-primary shrink-0";
      dot.dataset.notificationUnread = "true";
      titleRow.append(dot);
    }
    titleRow.append(time);
    const message = document.createElement("div");
    message.className = "mt-2 text-sm leading-7 text-gray-600";
    message.textContent = item.message;
    body.append(titleRow, message);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "no-print shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50";
    deleteButton.textContent = "حذف";
    deleteButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      let confirmed = true;
      if (global.Swal) {
        const result = await global.Swal.fire({ title: "حذف الإشعار؟", icon: "warning", showCancelButton: true, confirmButtonText: "نعم، حذف", cancelButtonText: "إلغاء" });
        confirmed = result.isConfirmed;
      } else {
        confirmed = global.confirm("حذف الإشعار؟");
      }
      if (confirmed) await deleteNotification(item.id);
    });

    row.append(iconBox, body, deleteButton);
    card.appendChild(row);

    body.addEventListener("click", async () => {
      if (!item.is_read) {
        item.is_read = true;
        await markAsRead(item.id);
        if (instance.filter === "unread") {
          instance.notifications = instance.notifications.filter((entry) => entry.id !== item.id);
          card.remove();
          if (!instance.notifications.length) renderEmpty(instance.list);
          return;
        }
        card.classList.remove("bg-primary/5", "border-primary/20");
        card.querySelector("[data-notification-unread]")?.remove();
      }
      navigate(item);
    });
    return card;
  }

  function renderList(instance) {
    instance.list.replaceChildren();
    if (!instance.notifications.length) {
      renderEmpty(instance.list);
      updateLoadMore(instance);
      return;
    }
    const fragment = document.createDocumentFragment();
    instance.notifications.forEach((item) => fragment.appendChild(createCard(item, instance)));
    instance.list.appendChild(fragment);
    updateLoadMore(instance);
  }

  async function fetchPage(instance) {
    const query = new URLSearchParams({ limit: String(instance.pageSize), offset: String(instance.offset) });
    if (instance.filter === "unread") query.set("unread", "true");
    if (instance.filter === "read") query.set("read", "true");
    const result = await api.get(`${instance.endpoint}?${query.toString()}`);
    return Array.isArray(result) ? result.map(normalize) : [];
  }

  function updateLoadMore(instance) {
    let button = instance.list.parentElement.querySelector("[data-notification-load-more]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.notificationLoadMore = "true";
      button.className = "mt-4 w-full rounded-lg border border-primary px-4 py-2 text-primary hover:bg-primary hover:text-white";
      button.textContent = "تحميل المزيد";
      button.addEventListener("click", () => loadMore(instance));
      instance.list.parentElement.appendChild(button);
    }
    button.classList.toggle("hidden", !instance.hasMore || instance.loading);
  }

  async function loadMore(instance) {
    if (instance.loading || !instance.hasMore) return;
    instance.loading = true;
    updateLoadMore(instance);
    try {
      const rows = await fetchPage(instance);
      instance.notifications.push(...rows);
      instance.offset += rows.length;
      instance.hasMore = rows.length === instance.pageSize;
      renderList(instance);
    } catch (error) {
      renderError(instance.list, error?.message);
    } finally {
      instance.loading = false;
      updateLoadMore(instance);
    }
  }

  async function reloadInstance(instance, newFilter) {
    if (newFilter) instance.filter = newFilter;
    instance.offset = 0;
    instance.notifications = [];
    instance.hasMore = true;
    instance.loading = true;
    renderSkeleton(instance.list);
    try {
      const rows = await fetchPage(instance);
      instance.notifications = rows;
      instance.offset = rows.length;
      instance.hasMore = rows.length === instance.pageSize;
      renderList(instance);
      instance.handlers.onLoaded?.(rows);
    } catch (error) {
      renderError(instance.list, error?.message);
      instance.handlers.onError?.(error);
    } finally {
      instance.loading = false;
      updateLoadMore(instance);
    }
  }

  function load(containerId, options = {}) {
    const list = document.getElementById(containerId);
    if (!list) throw new Error(`Notification container not found: ${containerId}`);
    const instance = { endpoint: options.endpoint || CONFIG.endpoint, pageSize: options.pageSize || CONFIG.pageSize, filter: options.filter || "all", list, offset: 0, notifications: [], hasMore: true, loading: false, handlers: options };
    state.instances.set(containerId, instance);
    reloadInstance(instance);
    refreshBadge();
    return Object.freeze({ reload: (filter) => reloadInstance(instance, filter), setFilter: (filter) => reloadInstance(instance, filter), getNotifications: () => [...instance.notifications] });
  }

  function startPolling() {
    if (state.polling) return;
    state.polling = true;
    refreshBadge();
    state.timer = global.setInterval(refreshBadge, CONFIG.pollingInterval);
  }

  function stopPolling() {
    state.polling = false;
    if (state.timer) global.clearInterval(state.timer);
    state.timer = null;
  }

  global.NotificationCenter = Object.freeze({ load, startPolling, stopPolling, markAsRead, markAllAsRead, deleteNotification });
  global.refreshNotificationBadge = refreshBadge;
})(window);
