(function (global) {
  "use strict";

  const CONFIG = Object.freeze({
    endpoint: "/activity",
    pageSize: 20,
    cacheTTL: 60_000,
    requestTimeout: 30_000,
    loadingDelay: 120,
    emptyMessage: "لا يوجد نشاط",
    animationDuration: 200,
  });

  const ACTIONS = Object.freeze({
    created: Object.freeze({
      label: "إنشاء",
      icon: "➕",
      color: "bg-green-100 text-green-700",
    }),

    updated: Object.freeze({
      label: "تعديل",
      icon: "✏️",
      color: "bg-blue-100 text-blue-700",
    }),

    deleted: Object.freeze({
      label: "حذف",
      icon: "🗑️",
      color: "bg-red-100 text-red-700",
    }),

    uploaded: Object.freeze({
      label: "رفع",
      icon: "📎",
      color: "bg-purple-100 text-purple-700",
    }),

    attached: Object.freeze({
      label: "ربط",
      icon: "🔗",
      color: "bg-orange-100 text-orange-700",
    }),

    detached: Object.freeze({
      label: "إلغاء ربط",
      icon: "🔓",
      color: "bg-gray-100 text-gray-700",
    }),

    default: Object.freeze({
      label: "نشاط",
      icon: "📄",
      color: "bg-gray-100 text-gray-700",
    }),
  });

  const MODULE_FILTERS = Object.freeze([
    { label: "الكل", value: "all" },
    { label: "القضايا", value: "case" },
    { label: "الموكلين", value: "client" },
    { label: "الجلسات", value: "hearing" },
    { label: "الخدمات", value: "service" },
    { label: "المدفوعات", value: "payment" },
    { label: "المصروفات", value: "expense" },
    { label: "الملفات", value: "file" },
  ]);

  const state = {
    cache: new Map(),

    instances: new Map(),
  };

  Object.seal(state);

  /* -------------------------------------------------------------------------- */
  /*                                   HELPERS                                  */
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

    if (text !== "") {
      element.textContent = text;
    }

    return element;
  }

  function isPositiveInteger(value) {
    return /^\d+$/.test(String(value)) && Number(value) > 0;
  }

  function buildCacheKey(endpoint) {
    return endpoint;
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

  function getCached(key) {
    const cached = state.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > CONFIG.cacheTTL) {
      state.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  function setCached(key, data) {
    state.cache.set(key, {
      timestamp: Date.now(),
      data,
    });

    pruneCache();
  }

  function normalizeActivity(activity = {}) {
    const normalized = {
      id: activity.id == null ? null : String(activity.id),

      action:
        typeof activity.action === "string"
          ? activity.action.toLowerCase()
          : "default",

      description:
        typeof activity.description === "string"
          ? activity.description.trim()
          : "",

      user_name:
        typeof activity.user_name === "string" ? activity.user_name.trim() : "",

      module:
        typeof activity.module === "string"
          ? activity.module.toLowerCase()
          : "",

      record_id: activity.record_id == null ? null : String(activity.record_id),

      created_at: activity.created_at || null,
    };

    if (!ACTIONS[normalized.action]) {
      normalized.action = "default";
    }

    if (!normalized.description) {
      normalized.description = "بدون وصف";
    }

    return normalized;
  }

  function getPageSize(endpoint, options = {}) {
    if (isPositiveInteger(options.pageSize)) {
      return Number(options.pageSize);
    }

    try {
      const url = new URL(endpoint, global.location.origin);

      const limit = url.searchParams.get("limit");

      if (isPositiveInteger(limit)) {
        return Number(limit);
      }
    } catch {}

    return CONFIG.pageSize;
  }
  function buildEndpoint(endpoint, pageSize, offset, module) {
    const url = new URL(endpoint, global.location.origin);

    url.searchParams.set("limit", pageSize);

    url.searchParams.set("offset", offset);

    if (module && module !== "all") {
      url.searchParams.set("module", module);
    } else {
      url.searchParams.delete("module");
    }

    return `${url.pathname}${url.search}`;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatRelativeDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const diff = Date.now() - date.getTime();

    const minutes = Math.floor(diff / 60000);

    const hours = Math.floor(minutes / 60);

    const days = Math.floor(hours / 24);

    if (minutes < 1) {
      return "الآن";
    }

    if (minutes < 60) {
      return minutes === 1 ? "منذ دقيقة" : `منذ ${minutes} دقائق`;
    }

    if (hours < 24) {
      if (hours === 1) {
        return "منذ ساعة";
      }

      if (hours === 2) {
        return "منذ ساعتين";
      }

      return `منذ ${hours} ساعات`;
    }

    if (days === 1) {
      return "أمس";
    }

    if (days === 2) {
      return "منذ يومين";
    }

    return formatDate(value);
  }
  function getDayKey(value) {
    if (!value) {
      return "غير محدد";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "غير محدد";
    }

    const today = new Date();

    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    const currentDay = date.toISOString().slice(0, 10);

    const todayDay = today.toISOString().slice(0, 10);

    const yesterdayDay = yesterday.toISOString().slice(0, 10);

    if (currentDay === todayDay) {
      return "اليوم";
    }

    if (currentDay === yesterdayDay) {
      return "أمس";
    }

    return date.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function groupActivities(activities = []) {
    return activities.reduce((groups, activity) => {
      const day = getDayKey(activity.created_at);

      if (!groups[day]) {
        groups[day] = [];
      }

      groups[day].push(activity);

      return groups;
    }, {});
  }

  function getAction(action) {
    return ACTIONS[action] || ACTIONS.default;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  RENDERER                                  */
  /* -------------------------------------------------------------------------- */

  function renderLoading(container) {
    clear(container);

    const wrapper = create("div", "space-y-3 animate-pulse");

    for (let index = 0; index < 3; index += 1) {
      const card = create("div", "flex gap-4 rounded-xl border bg-white p-4");

      card.appendChild(
        create("div", "h-10 w-10 rounded-full bg-gray-200 shrink-0"),
      );

      const content = create("div", "flex-1 space-y-2");

      content.appendChild(create("div", "h-4 w-1/3 rounded bg-gray-200"));

      content.appendChild(create("div", "h-3 w-full rounded bg-gray-200"));
      content.appendChild(create("div", "h-3 w-2/3 rounded bg-gray-200"));

      card.appendChild(content);

      wrapper.appendChild(card);
    }

    container.appendChild(wrapper);
  }

  function renderEmpty(container, message) {
    clear(container);
    const wrapper = create("div", "py-10 text-center text-gray-500");

    wrapper.appendChild(create("div", "mb-3 text-4xl", "📭"));

    wrapper.appendChild(
      create("div", "font-medium", message || CONFIG.emptyMessage),
    );

    container.appendChild(wrapper);
  }

  function renderError(container, message) {
    clear(container);

    const wrapper = create(
      "div",
      "rounded-xl border border-red-200 bg-red-50 p-6 text-center",
    );

    wrapper.appendChild(create("div", "mb-3 text-4xl", "⚠️"));

    wrapper.appendChild(
      create("div", "font-semibold text-red-700", "تعذر تحميل النشاط"),
    );

    wrapper.appendChild(
      create("p", "mt-2 text-sm text-red-600", message || "حدث خطأ غير متوقع."),
    );

    container.appendChild(wrapper);
  }

  function renderInlineError(container, message) {
    removeInlineError(container);

    const error = create(
      "div",
      "mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-red-700",
      message || "فشل تحميل المزيد",
    );

    error.dataset.activityError = "true";

    container.appendChild(error);
  }

  function removeInlineError(container) {
    container.querySelector("[data-activity-error]")?.remove();
  }
  function createActivityCard(activity) {
    const action = getAction(activity.action);

    const card = create(
      "article",
      "flex gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:shadow-sm opacity-0",
    );

    card.setAttribute("role", "listitem");

    card.setAttribute(
      "aria-label",
      `${action.label} - ${activity.description}`,
    );

    const icon = create(
      "div",
      `flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${action.color}`,
      action.icon,
    );

    icon.setAttribute("aria-hidden", "true");

    const content = create("div", "min-w-0 flex-1");

    const header = create("div", "mb-2 flex items-start justify-between gap-4");

    const badge = create(
      "span",
      `rounded px-2 py-1 text-xs font-semibold ${action.color}`,
      action.label,
    );

    const time = create(
      "time",
      "shrink-0 text-xs text-gray-500",
      formatRelativeDate(activity.created_at),
    );

    if (activity.created_at) {
      time.dateTime = activity.created_at;

      time.title = formatDate(activity.created_at);
    }

    header.appendChild(badge);

    header.appendChild(time);

    content.appendChild(header);

    content.appendChild(
      create("p", "leading-6 text-sm text-gray-700", activity.description),
    );

    if (activity.user_name) {
      content.appendChild(
        create(
          "div",
          "mt-2 text-xs text-gray-500",
          `بواسطة: ${activity.user_name}`,
        ),
      );
    }

    card.appendChild(icon);

    card.appendChild(content);

    requestAnimationFrame(() => {
      card.classList.remove("opacity-0");

      card.classList.add("opacity-100");
    });

    return card;
  }

  function createDaySection(day) {
    const section = create("section", "mb-6");
    section.dataset.activityDay = day;

    const title = create("h3", "mb-3 font-bold text-primary", day);

    const list = create("div", "space-y-3 rounded-xl bg-white p-4 shadow-sm");

    list.dataset.activityList = "true";

    list.setAttribute("role", "list");

    list.setAttribute("aria-live", "polite");

    section.appendChild(title);

    section.appendChild(list);

    return {
      section,
      list,
    };
  }

  function appendActivities(instance, activities) {
    const groups = groupActivities(activities);

    const fragment = document.createDocumentFragment();

    Object.entries(groups).forEach(([day, items]) => {
      let group = instance.dayGroups.get(day);

      let list = group?.list;

      if (!list) {
        const group = createDaySection(day);

        list = group.list;

        instance.dayGroups.set(day, {
          section: group.section,
          list: group.list,
        });

        fragment.appendChild(instance.dayGroups.get(day).section);
      }
      items.forEach((activity) => {
        list.appendChild(createActivityCard(activity));
      });
    });

    instance.elements.content.appendChild(fragment);
  }

  function renderActivities(instance, activities, emptyMessage) {
    if (instance.offset === 0) {
      clear(instance.elements.content);
    }

    if (activities.length === 0) {
      renderEmpty(instance.elements.content, emptyMessage);

      return false;
    }

    appendActivities(instance, activities);

    return true;
  }

  function createLoadMoreButton(onClick) {
    const wrapper = create("div", "flex justify-center pt-4");

    const button = create(
      "button",
      "rounded-lg bg-primary px-5 py-2 text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60",
      "تحميل المزيد",
    );
    button.type = "button";

    button.setAttribute("aria-label", "تحميل المزيد من النشاط");

    button.addEventListener("click", onClick);

    wrapper.appendChild(button);

    return {
      wrapper,
      button,
    };
  }

  function createFilterButton(filter, active, onClick) {
    const button = create(
      "button",
      active
        ? "rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white"
        : "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50",
      filter.label,
    );

    button.type = "button";

    button.dataset.module = filter.value;

    button.addEventListener("click", () => onClick(filter.value));

    return button;
  }

  function renderFilterBar(container, activeModule, onSelect) {
    clear(container);

    const fragment = document.createDocumentFragment();

    MODULE_FILTERS.forEach((filter) => {
      fragment.appendChild(
        createFilterButton(filter, filter.value === activeModule, onSelect),
      );
    });

    container.appendChild(fragment);
  }

  /* -------------------------------------------------------------------------- */
  /*                                    API                                     */
  /* -------------------------------------------------------------------------- */

  async function fetchActivities(instance, endpoint, params = {}) {
    const cacheKey = buildCacheKey(endpoint);

    const cached = getCached(cacheKey);

    if (cached) {
      return cached;
    }

    if (instance.abortController) {
      instance.abortController.abort();
    }

    const controller = new AbortController();

    instance.abortController = controller;

    const requestId = ++instance.requestId;

    try {
      const response = await global.api.get(endpoint, {
        params,
        timeout: CONFIG.requestTimeout,
        signal: controller.signal,
      });
      if (requestId !== instance.requestId) {
        return null;
      }

      const activities = Array.isArray(response)
        ? response.map(normalizeActivity)
        : [];

      setCached(cacheKey, activities);

      return activities;
    } catch (error) {
      if (error.name === "AbortError") {
        return null;
      }

      throw error;
    } finally {
      if (instance.abortController === controller) {
        instance.abortController = null;
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                 INSTANCE                                   */
  /* -------------------------------------------------------------------------- */

  function createInstance(containerId, options = {}) {
    const container = $(containerId);

    if (!container) {
      return null;
    }

    const endpoint = options.endpoint || CONFIG.endpoint;

    const instance = {
      container,

      endpoint,

      pageSize: getPageSize(endpoint, options),

      emptyMessage: options.emptyMessage || CONFIG.emptyMessage,

      module: options.moduleFilter ? "all" : null,

      offset: 0,

      hasMore: true,

      loading: false,

      elements: Object.seal({
        timeline: null,
        content: null,
        footer: null,
        filterBar: null,
        loadMoreButton: null,
      }),

      dayGroups: new Map(),

      abortController: null,

      requestId: 0,

      pendingRequest: null,
    };

    Object.seal(instance);

    state.instances.set(containerId, instance);

    return instance;
  }

  function updateControls(instance) {
    if (instance.elements.loadMoreButton) {
      instance.elements.loadMoreButton.disabled = instance.loading;
      if (instance.loading) {
        instance.elements.loadMoreButton.innerHTML =
          '<span class="inline-flex items-center gap-2"><span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>جاري التحميل...</span>';
      } else {
        instance.elements.loadMoreButton.textContent = "تحميل المزيد";
      }

      instance.elements.loadMoreButton.classList.toggle(
        "hidden",
        !instance.hasMore,
      );
    }

    if (instance.elements.filterBar) {
      instance.elements.filterBar
        .querySelectorAll("button")
        .forEach((button) => {
          button.disabled = instance.loading;
        });
    }
  }
  function renderShell(instance, onModuleChange, onLoadMore) {
    clear(instance.container);

    if (instance.module !== null) {
      instance.elements.filterBar = create("div", "mb-4 flex flex-wrap gap-2");

      renderFilterBar(
        instance.elements.filterBar,
        instance.module,
        onModuleChange,
      );

      instance.container.appendChild(instance.elements.filterBar);
    }

    instance.elements.timeline = create("div");

    instance.elements.content = create("div");

    instance.elements.footer = create("div");

    instance.elements.timeline.appendChild(instance.elements.content);

    instance.container.appendChild(instance.elements.timeline);

    instance.container.appendChild(instance.elements.footer);

    const loadMore = createLoadMoreButton(onLoadMore);

    instance.elements.footer.appendChild(loadMore.wrapper);

    instance.elements.loadMoreButton = loadMore.button;

    updateControls(instance);
  }

  async function loadNextPage(instance) {
    if (instance.loading || !instance.hasMore) {
      return;
    }

    if (instance.pendingRequest) {
      return instance.pendingRequest;
    }

    instance.loading = true;

    removeInlineError(instance.container);

    updateControls(instance);

    const showInitialLoader = instance.offset === 0;

    const loadingTimer = setTimeout(() => {
      if (instance.loading && showInitialLoader) {
        renderLoading(instance.elements.content);
      }
    }, CONFIG.loadingDelay);

    const request = (async () => {
      try {
        const endpoint = buildEndpoint(
          instance.endpoint,
          instance.pageSize,
          instance.offset,
          instance.module,
        );

        const activities = await fetchActivities(instance, endpoint, {
          limit: instance.pageSize,
          offset: instance.offset,
          module: instance.module,
        });

        if (activities === null) {
          return;
        }

        if (instance.offset === 0) {
          const hasData = renderActivities(
            instance,
            activities,
            instance.emptyMessage,
          );

          instance.hasMore = hasData && activities.length === instance.pageSize;
        } else {
          appendActivities(instance, activities);

          instance.hasMore = activities.length === instance.pageSize;
        }

        instance.offset += activities.length;
      } catch (error) {
        console.error(error);

        if (instance.offset === 0) {
          renderError(instance.elements.content, error.message);
        } else {
          renderInlineError(instance.container, error.message);
        }
      } finally {
        clearTimeout(loadingTimer);

        instance.loading = false;

        updateControls(instance);
      }
    })();

    instance.pendingRequest = request.finally(() => {
      instance.pendingRequest = null;
    });

    return instance.pendingRequest;
  }

  function reload(instance) {
    const scrollTop = instance.container.scrollTop;
    instance.offset = 0;

    instance.hasMore = true;

    instance.dayGroups.clear();

    removeInlineError(instance.container);

    instance.container.scrollTop = scrollTop;

    return loadNextPage(instance);
  }

  function initialize(instance) {
    renderShell(
      instance,
      (module) => {
        if (instance.loading || module === instance.module) {
          return;
        }

        instance.module = module;

        reload(instance);
      },
      () => loadNextPage(instance),
    );

    return reload(instance);
  }

  function destroy() {
    for (const instance of state.instances.values()) {
      if (instance.abortController) {
        instance.abortController.abort();
      }

      instance.dayGroups.clear();

      instance.pendingRequest = null;
    }

    clearCache();

    state.instances.clear();
  }
  function load(containerId, options = {}) {
    const instance = createInstance(containerId, options);

    if (!instance) {
      return null;
    }

    return (
      initialize(instance).finally(() => {
        // optional startup hook
      }),
      Object.freeze({
        reload() {
          reload(instance);
        },

        destroy() {
          if (instance.abortController) {
            instance.abortController.abort();
          }
          instance.dayGroups.clear();

          instance.pendingRequest = null;

          clear(instance.container);

          state.instances.delete(containerId);
        },
      })
    );
  }

  global.ActivityTimeline = Object.freeze({
    load,
    destroy,
    clearCache,
  });
})(window);
