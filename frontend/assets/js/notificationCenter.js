(function (global) {
  "use strict";

  /* -------------------------------------------------------------------------- */
  /*                                  CONFIG                                    */
  /* -------------------------------------------------------------------------- */

  const CONFIG = Object.freeze({
    endpoint: "/notifications",

    pageSize: 20,

    pollingInterval: 30000,

    cacheTTL: 60000,

    maxCacheEntries: 50,

    maxDisplayedNotifications: 500,
  });

  const ICONS = Object.freeze({
    info: "📩",
    warning: "⚠️",
    success: "✅",
    error: "❌",
    default: "🔔",
  });

  const NAVIGATION = Object.freeze({
    case: (id) => `case-profile.html?id=${encodeURIComponent(id)}`,

    client: (id) => `client-profile.html?id=${encodeURIComponent(id)}`,

    service: (id) => `service-profile.html?id=${encodeURIComponent(id)}`,

    hearing: (id) => `calendar.html?hearing=${encodeURIComponent(id)}`,

    payment: (id) => `revenues.html?payment=${encodeURIComponent(id)}`,

    file: (id) => `case-profile.html?id=${encodeURIComponent(id)}&tab=files`,

    template: (id) => `templates.html?id=${encodeURIComponent(id)}`,
  });

  /* -------------------------------------------------------------------------- */
  /*                                   STATE                                    */
  /* -------------------------------------------------------------------------- */

  const state = {
    initialized: false,

    polling: false,

    shouldPoll: false,

    firstPoll: false,

    pollTimer: null,

    abortController: null,

    requestId: 0,

    displayed: new Set(),

    cache: new Map(),

    handlers: {},

    instances: new Map(),
  };

  Object.seal(state);

  /* -------------------------------------------------------------------------- */
  /*                                  HELPERS                                   */
  /* -------------------------------------------------------------------------- */

  function $(id) {
    return document.getElementById(id);
  }

  function clear(element) {
    if (element) {
      element.innerHTML = "";
    }
  }

  function create(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text) {
      element.textContent = text;
    }

    return element;
  }

  function relativeTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) {
      return "منذ لحظات";
    }

    if (seconds < 3600) {
      return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    }

    if (seconds < 86400) {
      return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    }

    return `منذ ${Math.floor(seconds / 86400)} يوم`;
  }

  function navigate(notification) {
    if (!notification) {
      return false;
    }

    const builder = NAVIGATION[notification.module];

    if (typeof builder !== "function") {
      console.warn("Unknown notification module:", notification.module);
      return false;
    }

    if (!notification.record_id) {
      console.warn("Notification is missing record_id:", notification);
      return false;
    }

    const destination = builder(notification.record_id);

    if (typeof destination !== "string" || destination.trim() === "") {
      console.warn("Invalid navigation destination:", notification);
      return false;
    }

    global.location.href = destination;

    return true;
  }
  /* -------------------------------------------------------------------------- */
  /*                                   CACHE                                    */
  /* -------------------------------------------------------------------------- */

  function getCached(key) {
    const entry = state.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > CONFIG.cacheTTL) {
      state.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  function setCached(key, data) {
    if (state.cache.has(key)) {
      state.cache.delete(key);
    }

    while (state.cache.size >= CONFIG.maxCacheEntries) {
      const oldest = state.cache.keys().next().value;
      state.cache.delete(oldest);
    }

    state.cache.set(key, {
      timestamp: Date.now(),
      data,
    });

    pruneCache();
  }

  function clearCache() {
    state.cache.clear();
  }

  function pruneCache() {
    const now = Date.now();

    for (const [key, entry] of state.cache.entries()) {
      if (now - entry.timestamp > CONFIG.cacheTTL) {
        state.cache.delete(key);
      }
    }
  }

  function addDisplayed(id) {
    if (id == null) {
      return;
    }

    if (state.displayed.has(id)) {
      return;
    }

    while (state.displayed.size >= CONFIG.maxDisplayedNotifications) {
      const oldest = state.displayed.values().next().value;

      state.displayed.delete(oldest);
    }

    state.displayed.add(id);
  }

  /* -------------------------------------------------------------------------- */
  /*                                    API                                     */
  /* -------------------------------------------------------------------------- */

  function buildQuery(endpoint, params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      query.append(key, value);
    });

    const queryString = query.toString();

    return queryString ? `${endpoint}?${queryString}` : endpoint;
  }

  async function fetchNotifications(endpoint, params = {}) {
    const cacheKey = JSON.stringify({
      endpoint,
      params,
    });

    const cached = getCached(cacheKey);

    if (cached) {
      return cached;
    }

    if (state.abortController) {
      state.abortController.abort();
    }
    const controller = new AbortController();

    state.abortController = controller;

    const requestId = ++state.requestId;

    let response;

    try {
      response = await api.get(buildQuery(endpoint, params), {
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        return null;
      }

      throw error;
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }

    if (requestId !== state.requestId) {
      return null;
    }

    const notifications = Array.isArray(response)
      ? response.map(normalizeNotification)
      : [];

    setCached(cacheKey, notifications);

    return notifications;
  }

  async function markAsRead(id) {
    try {
      await api.put(`${CONFIG.endpoint}/${id}/read`, {});

      clearCache();

      if (typeof global.refreshNotificationBadge === "function") {
        global.refreshNotificationBadge();
      }

      return true;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);

      return false;
    }
  }

  async function markAllAsRead() {
    try {
      await api.put(`${CONFIG.endpoint}/mark-all-read`, {});

      clearCache();

      if (typeof global.refreshNotificationBadge === "function") {
        global.refreshNotificationBadge();
      }

      return true;
    } catch (error) {
      console.error(error);

      return false;
    }
  }
  /* -------------------------------------------------------------------------- */
  /*                                  RENDERER                                  */
  /* -------------------------------------------------------------------------- */

  function renderSkeleton(container) {
    clear(container);

    for (let i = 0; i < 5; i++) {
      const card = create(
        "div",
        "animate-pulse rounded-xl border border-gray-200 bg-white p-5 mb-3",
      );

      card.innerHTML = `
        <div class="flex gap-4 items-start">

          <div class="w-12 h-12 rounded-full bg-gray-200"></div>

          <div class="flex-1">

            <div class="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>

            <div class="h-3 bg-gray-100 rounded w-full mb-2"></div>

            <div class="h-3 bg-gray-100 rounded w-3/4"></div>

          </div>

        </div>
      `;

      container.appendChild(card);
    }
  }

  function renderEmpty(container) {
    clear(container);

    const wrapper = create("div", "py-16 text-center text-gray-500");

    wrapper.innerHTML = `
      <div class="text-6xl mb-5">
        📭
      </div>

      <h3 class="text-lg font-bold text-gray-700 mb-2">
        لا توجد إشعارات
      </h3>

      <p class="text-sm leading-7">
        ستظهر جميع الإشعارات الجديدة هنا.
      </p>
    `;

    container.appendChild(wrapper);
  }

  function renderError(container, message) {
    clear(container);

    const wrapper = create("div", "py-16 text-center text-red-500");

    wrapper.innerHTML = `
      <div class="text-5xl mb-4">
        ⚠️
      </div>

      <h3 class="font-bold mb-2">
        تعذر تحميل الإشعارات
      </h3>

      <p class="text-sm">
        ${message || "حدث خطأ غير متوقع"}
      </p>
    `;

    container.appendChild(wrapper);
  }

  function createToastContent(notification) {
    const wrapper = create("div", "text-right");

    wrapper.innerHTML = `
      <div class="font-semibold text-white">

        ${notification.title}

      </div>

      <div class="text-sm text-white/90 mt-1">

        ${notification.message}

      </div>
    `;

    return wrapper;
  }

  function showToast(notification) {
    Toastify({
      node: createToastContent(notification),

      duration: 5000,

      gravity: "top",

      position: "left",

      close: true,

      stopOnFocus: true,

      onClick: async () => {
        await markAsRead(notification.id);

        if (!navigate(notification)) {
          console.warn("Navigation failed.");
        }
      },
    }).showToast();
  }

  function renderIcon(type) {
    return ICONS[type] || ICONS.default;
  }

  function renderUnreadDot() {
    const dot = create("span", "w-2.5 h-2.5 rounded-full bg-primary shrink-0");

    dot.dataset.notificationUnread = "true";

    dot.setAttribute("aria-hidden", "true");

    return dot;
  }

  function normalizeNotification(notification = {}) {
    const normalized = {
      id: notification.id == null ? null : String(notification.id),

      title:
        typeof notification.title === "string" ? notification.title.trim() : "",

      message:
        typeof notification.message === "string"
          ? notification.message.trim()
          : "",

      type:
        typeof notification.type === "string"
          ? notification.type.toLowerCase()
          : "default",

      module:
        typeof notification.module === "string"
          ? notification.module.toLowerCase()
          : "",

      record_id:
        notification.record_id == null ? null : String(notification.record_id),

      created_at: notification.created_at || null,

      is_read: Boolean(notification.is_read),
    };

    if (!normalized.title) {
      normalized.title = "بدون عنوان";
    }

    if (!ICONS[normalized.type]) {
      normalized.type = "default";
    }

    return normalized;
  }

  /* -------------------------------------------------------------------------- */
  /*                           NOTIFICATION COMPONENTS                          */
  /* -------------------------------------------------------------------------- */

  function createNotificationCard(notification, instance) {
    const card = create(
      "button",
      [
        "group",
        "w-full",
        "rounded-2xl",
        "border",
        "border-gray-200",
        "bg-white",
        "p-5",
        "text-right",
        "transition",
        "duration-200",
        "hover:border-primary/40",
        "hover:shadow-md",
        notification.is_read ? "" : "bg-primary/5 border-primary/20",
      ].join(" "),
    );

    card.type = "button";
    card.dataset.id = notification.id;

    card.setAttribute("role", "listitem");

    card.setAttribute(
      "aria-label",
      `${notification.title} - ${notification.message}`,
    );

    card.setAttribute("aria-current", notification.is_read ? "false" : "true");

    const header = create("div", "flex items-start gap-4");

    const icon = create(
      "div",
      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl",
      renderIcon(notification.type),
    );

    const body = create("div", "min-w-0 flex-1");

    const titleRow = create("div", "flex items-center justify-between gap-3");

    const title = create(
      "div",
      "truncate font-semibold text-gray-800",
      notification.title,
    );

    const time = create(
      "div",
      "shrink-0 text-xs text-gray-500",
      relativeTime(notification.created_at),
    );

    titleRow.appendChild(title);

    if (!notification.is_read) {
      titleRow.appendChild(renderUnreadDot());
    }

    titleRow.appendChild(time);

    const message = create(
      "div",
      "mt-2 text-sm leading-7 text-gray-600",
      notification.message,
    );

    body.appendChild(titleRow);
    body.appendChild(message);

    header.appendChild(icon);
    header.appendChild(body);

    card.appendChild(header);

    card.addEventListener("click", async () => {
      if (!notification.is_read) {
        notification.is_read = true;

        await markAsRead(notification.id);

        if (instance.filter === "unread") {
          instance.notifications = instance.notifications.filter(
            (item) => item.id !== notification.id,
          );

          card.remove();

          if (!instance.notifications.length) {
            renderEmpty(instance.list);
          }
        } else {
          markCardAsRead(card);
        }
      }

      if (!navigate(notification)) {
        return;
      }
    });

    return card;
  }

  function renderNotificationList(instance, notifications) {
    clear(instance.list);

    if (!notifications.length) {
      renderEmpty(instance.list);
      return;
    }

    const fragment = document.createDocumentFragment();

    notifications.forEach((notification) => {
      fragment.appendChild(createNotificationCard(notification, instance));
    });

    instance.list.appendChild(fragment);
  }

  function markCardAsRead(card) {
    if (!card) {
      return;
    }

    card.classList.remove("bg-primary/5", "border-primary/20");

    const unreadDot = card.querySelector("[data-notification-unread]");

    if (unreadDot) {
      unreadDot.remove();
    }

    card.setAttribute("aria-current", "false");
  }

  /* -------------------------------------------------------------------------- */
  /*                              INSTANCE LOADER                               */
  /* -------------------------------------------------------------------------- */

  function createInstance(containerId, options = {}) {
    const container = $(containerId);

    if (!container) {
      return null;
    }

    const instance = {
      container,

      list: null,

      footer: null,

      loadMoreButton: null,

      notifications: [],

      filter: options.filter || "all",

      offset: 0,

      loading: false,

      hasMore: true,

      endpoint: options.endpoint || CONFIG.endpoint,

      pageSize: Number(options.pageSize) || CONFIG.pageSize,

      onLoaded:
        typeof options.onLoaded === "function" ? options.onLoaded : null,

      onError: typeof options.onError === "function" ? options.onError : null,

      onItemRead:
        typeof options.onItemRead === "function" ? options.onItemRead : null,
    };

    state.instances.set(containerId, instance);

    return instance;
  }

  function buildParams(instance) {
    const params = {
      limit: instance.pageSize,
      offset: instance.offset,
    };

    if (instance.filter === "read") {
      params.read = true;
    }

    if (instance.filter === "unread") {
      params.unread = true;
    }

    return params;
  }

  function createLoadMoreButton(instance) {
    const wrapper = create("div", "flex justify-center mt-6");

    const button = create(
      "button",
      "px-5 py-2 rounded-xl border border-primary text-primary hover:bg-primary hover:text-white transition",
      "تحميل المزيد",
    );

    button.type = "button";

    button.setAttribute("aria-label", "تحميل المزيد من الإشعارات");

    button.addEventListener("click", () => {
      loadNextPage(instance);
    });

    wrapper.appendChild(button);

    instance.footer = wrapper;
    instance.loadMoreButton = button;

    return wrapper;
  }

  function updateLoadMoreButton(instance) {
    if (!instance.loadMoreButton) {
      return;
    }

    instance.loadMoreButton.disabled = instance.loading || !instance.hasMore;

    if (instance.loading) {
      instance.loadMoreButton.textContent = "جاري التحميل...";
      return;
    }

    instance.loadMoreButton.textContent = instance.hasMore
      ? "تحميل المزيد"
      : "لا يوجد المزيد";
  }

  function renderShell(instance) {
    clear(instance.container);

    instance.list = create("div", "space-y-3");

    instance.list.setAttribute("role", "list");
    instance.list.setAttribute("aria-live", "polite");
    instance.list.setAttribute("aria-label", "قائمة الإشعارات");

    instance.container.appendChild(instance.list);

    instance.container.appendChild(createLoadMoreButton(instance));
  }

  async function loadNextPage(instance) {
    if (instance.loading || !instance.hasMore) {
      return;
    }

    instance.loading = true;

    updateLoadMoreButton(instance);

    if (!instance.list) {
      renderShell(instance);
    }

    const loadingTimer = setTimeout(() => {
      if (instance.loading && instance.list) {
        renderSkeleton(instance.list);
      }
    }, 120);

    try {
      const notifications = await fetchNotifications(
        instance.endpoint,
        buildParams(instance),
      );
      if (!notifications) {
        return;
      }

      if (instance.offset === 0) {
        instance.notifications = [];
      }

      instance.notifications = instance.notifications.concat(notifications);

      instance.offset += notifications.length;

      instance.hasMore = notifications.length === instance.pageSize;

      renderNotificationList(instance, instance.notifications);

      if (instance.onLoaded) {
        instance.onLoaded(instance.notifications, instance.filter);
      }
    } catch (error) {
      renderError(instance.list, error.message);

      instance.hasMore = false;

      if (instance.onError) {
        instance.onError(error);
      }
    } finally {
      clearTimeout(loadingTimer);

      instance.loading = false;

      updateLoadMoreButton(instance);
    }
  }

  function reloadInstance(instance, newFilter) {
    if (newFilter) {
      instance.filter = newFilter;
    }

    instance.offset = 0;

    instance.hasMore = true;

    instance.notifications = [];

    instance.list = null;

    instance.footer = null;

    instance.loadMoreButton = null;

    clear(instance.container);

    loadNextPage(instance);
  }
  /* -------------------------------------------------------------------------- */
  /*                                  POLLING                                   */
  /* -------------------------------------------------------------------------- */

  async function pollNotifications() {
    if (document.hidden) {
      return;
    }

    try {
      const notifications = await fetchNotifications(CONFIG.endpoint, {
        unread: true,
        limit: 10,
      });

      if (!notifications) {
        return;
      }

      if (!state.firstPoll) {
        notifications.forEach((notification) => {
          if (notification.id != null) {
            addDisplayed(notification.id);
          }
        });

        state.firstPoll = true;

        return;
      }

      notifications.forEach((notification) => {
        if (notification.id == null || state.displayed.has(notification.id)) {
          return;
        }

        addDisplayed(notification.id);

        showToast(notification);
      });
    } catch (error) {
      console.error("Notification polling failed:", error);
    }
  }

  function startPolling() {
    if (state.polling) {
      return;
    }

    state.shouldPoll = true;
    state.polling = true;

    pollNotifications();

    if (state.pollTimer) {
      clearInterval(state.pollTimer);
    }

    state.pollTimer = setInterval(() => {
      if (!document.hidden) {
        pollNotifications();
      }
    }, CONFIG.pollingInterval);
  }
  function stopPolling(permanent = true) {
    state.polling = false;

    if (permanent) {
      state.shouldPoll = false;
    }

    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            VISIBILITY HANDLER                              */
  /* -------------------------------------------------------------------------- */

  function handleVisibilityChange() {
    if (document.hidden) {
      stopPolling(false);
      return;
    }

    if (state.shouldPoll) {
      startPolling();
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                 LIFECYCLE                                  */
  /* -------------------------------------------------------------------------- */

  function init() {
    if (state.initialized) {
      return;
    }

    state.handlers.visibility = handleVisibilityChange;

    document.addEventListener("visibilitychange", state.handlers.visibility);

    state.initialized = true;
  }

  function destroy() {
    stopPolling();

    if (state.abortController) {
      state.abortController.abort();
    }

    if (state.handlers.visibility) {
      document.removeEventListener(
        "visibilitychange",
        state.handlers.visibility,
      );
    }

    state.displayed.clear();

    clearCache();

    state.instances.clear();

    state.handlers = {};

    state.abortController = null;

    state.requestId = 0;

    state.firstPoll = false;

    state.shouldPoll = false;

    state.initialized = false;
  }

  /* -------------------------------------------------------------------------- */
  /*                                PUBLIC API                                  */
  /* -------------------------------------------------------------------------- */

  function load(containerId, options = {}) {
    init();

    const instance = createInstance(containerId, options);

    if (!instance) {
      return null;
    }

    loadNextPage(instance);

    return Object.freeze({
      reload(filter) {
        reloadInstance(instance, filter);
      },

      setFilter(filter) {
        reloadInstance(instance, filter);
      },

      getNotifications() {
        return [...instance.notifications];
      },

      getFilter() {
        return instance.filter;
      },
    });
  }

  global.NotificationCenter = Object.freeze({
    load,

    startPolling,

    stopPolling,

    markAsRead,

    markAllAsRead,

    destroy,
  });
})(window);
