(function (global) {
  "use strict";

  const CONFIG = Object.freeze({
    endpoint: "/search",
    minQueryLength: 2,
    debounceDelay: 300,
    maxRecentSearches: 10,
    cacheDuration: 60 * 1000,
    maxCacheSize: 100,
    loadingIndicatorDelay: 120,

    loadingSkeletonRows: 5,
    recentStorageKey: "global-search-recents",
  });

  const DEFAULT_GROUPS = Object.freeze({
    clients: {
      label: "👤 الموكلون",
      badge: "موكل",

      titleField: "full_name",

      subtitleField: "phone",

      buildUrl: (item) =>
        `client-profile.html?id=${encodeURIComponent(item.id)}`,
    },
    cases: {
      label: "⚖️ القضايا",
      badge: "قضية",

      titleField: "case_number",

      subtitleField: "court_name",
      buildUrl: (item) => `case-profile.html?id=${encodeURIComponent(item.id)}`,
    },

    services: {
      label: "📋 الخدمات",
      badge: "خدمة",
      titleField: "service_name",

      subtitleField: "description",
      buildUrl: (item) =>
        `service-profile.html?id=${encodeURIComponent(item.id)}`,
    },

    hearings: {
      label: "📅 الجلسات",
      badge: "جلسة",
      titleField: "case_number",

      subtitleField: "court_name",
      buildUrl: (item) =>
        `calendar.html?hearing=${encodeURIComponent(item.id)}`,
    },

    payments: {
      label: "💰 المدفوعات",
      badge: "دفعة",
      titleField: "payment_reference",

      subtitleField: "description",
      buildUrl: (item) =>
        `revenues.html?payment=${encodeURIComponent(item.id)}`,
    },

    files: {
      label: "📄 الملفات",
      badge: "ملف",
      titleField: "original_name",

      subtitleField: "case_number",
      buildUrl: (item) =>
        `case-profile.html?id=${encodeURIComponent(item.case_id || item.id)}&tab=files`,
    },

    templates: {
      label: "📝 القوالب",
      badge: "قالب",
      titleField: "title",

      subtitleField: "description",
      buildUrl: (item) => `templates.html?id=${encodeURIComponent(item.id)}`,
    },
  });

  const state = {
    input: null,
    dropdown: null,

    groups: DEFAULT_GROUPS,

    query: "",

    selectedIndex: -1,

    items: [],

    cache: new Map(),

    recent: [],

    debounceTimer: null,

    abortController: null,

    initialized: false,

    requestId: 0,

    handlers: {},
  };

  Object.seal(state);

  function createElement(tag, className = "") {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    return element;
  }

  function clear(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function renderIcons() {
    if (typeof lucide === "undefined") {
      return;
    }

    requestAnimationFrame(() => {
      lucide.createIcons();
    });
  }

  function debounce(callback, delay) {
    return (...args) => {
      clearTimeout(state.debounceTimer);

      state.debounceTimer = setTimeout(() => {
        callback(...args);
      }, delay);
    };
  }

  function normalizeQuery(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function highlight(text, query) {
    if (!query) {
      return escapeHtml(text);
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return escapeHtml(text).replace(
      new RegExp(`(${escaped})`, "ig"),
      "<mark>$1</mark>",
    );
  }
  function loadRecentSearches() {
    try {
      const data = JSON.parse(
        localStorage.getItem(CONFIG.recentStorageKey) || "[]",
      );

      state.recent = Array.isArray(data) ? data : [];
    } catch {
      state.recent = [];
    }
  }

  function saveRecentSearch(query) {
    if (!query) return;

    state.recent = state.recent.filter((item) => item !== query);

    state.recent.unshift(query);

    if (state.recent.length > CONFIG.maxRecentSearches) {
      state.recent.length = CONFIG.maxRecentSearches;
    }

    localStorage.setItem(CONFIG.recentStorageKey, JSON.stringify(state.recent));
  }

  function getCachedResult(query) {
    const cached = state.cache.get(query);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > CONFIG.cacheDuration) {
      state.cache.delete(query);
      return null;
    }

    return cached.data;
  }

  function setCachedResult(query, data) {
    if (state.cache.has(query)) {
      state.cache.delete(query);
    }

    while (state.cache.size >= CONFIG.maxCacheSize) {
      const oldestKey = state.cache.keys().next().value;
      state.cache.delete(oldestKey);
    }

    state.cache.set(query, {
      timestamp: Date.now(),
      data,
    });

    pruneCache();
  }

  function pruneCache() {
    const now = Date.now();

    for (const [key, entry] of state.cache.entries()) {
      if (now - entry.timestamp > CONFIG.cacheDuration) {
        state.cache.delete(key);
      }
    }
  }

  async function search(query) {
    const normalized = normalizeQuery(query);

    if (normalized.length < CONFIG.minQueryLength) {
      return null;
    }

    const cached = getCachedResult(normalized);

    if (cached) {
      return cached;
    }

    if (state.abortController) {
      state.abortController.abort();
    }

    const controller = new AbortController();

    state.abortController = controller;

    try {
      const result = await api.get(CONFIG.endpoint, {
        params: {
          q: normalized,
        },
        signal: controller.signal,
      });

      setCachedResult(normalized, result);

      saveRecentSearch(normalized);

      return result;
    } catch (error) {
      if (error?.name === "AbortError") {
        return null;
      }

      console.error("Global Search:", error);

      return null;
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  function buildItemUrl(group, item) {
    const config = state.groups[group];

    if (!config || typeof config.buildUrl !== "function") {
      return "#";
    }

    return config.buildUrl(item);
  }
  function getItemTitle(group, item) {
    const field = state.groups[group]?.titleField;

    return field ? item[field] || "" : "";
  }

  function getItemSubtitle(group, item) {
    const field = state.groups[group]?.subtitleField;

    return field ? item[field] || "" : "";
  }
  function openDropdown() {
    state.dropdown.classList.remove("hidden");
    state.dropdown.classList.add("opacity-100", "translate-y-0");
    state.dropdown.classList.remove("opacity-0", "-translate-y-2");

    state.input.setAttribute("aria-expanded", "true");
  }

  function closeDropdown() {
    state.dropdown.classList.add("hidden");
    state.dropdown.classList.remove("opacity-100", "translate-y-0");
    state.dropdown.classList.add("opacity-0", "-translate-y-2");

    state.input.setAttribute("aria-expanded", "false");

    state.selectedIndex = -1;
    state.items = [];
  }

  function renderLoading() {
    clear(state.dropdown);

    for (let i = 0; i < CONFIG.loadingSkeletonRows; i++) {
      const row = createElement(
        "div",
        "px-5 py-4 animate-pulse border-b last:border-b-0",
      );

      row.innerHTML = `
        <div class="h-4 rounded bg-gray-200 w-2/3 mb-2"></div>
        <div class="h-3 rounded bg-gray-100 w-1/3"></div>
      `;

      state.dropdown.appendChild(row);
    }

    openDropdown();
  }

  function renderEmpty() {
    clear(state.dropdown);

    const wrapper = createElement("div", "p-8 text-center text-gray-500");

    wrapper.innerHTML = `
      <div class="text-5xl mb-3">🔍</div>

      <h3 class="font-semibold text-gray-700 mb-2">
        لم يتم العثور على نتائج
      </h3>

      <p class="text-sm leading-7">
        جرّب البحث باسم الموكل<br>
        أو رقم القضية<br>
        أو رقم الهاتف
      </p>
    `;

    state.dropdown.appendChild(wrapper);

    openDropdown();
  }

  function renderRecents() {
    clear(state.dropdown);

    if (!state.recent.length) {
      renderEmpty();
      return;
    }

    const title = createElement(
      "div",
      "px-5 py-3 text-xs font-semibold text-gray-500 border-b bg-gray-50",
    );

    title.textContent = "آخر عمليات البحث";

    state.dropdown.appendChild(title);

    state.recent.forEach((query) => {
      const button = createElement(
        "button",
        "w-full text-right px-5 py-3 hover:bg-gray-50 transition",
      );

      button.type = "button";

      button.innerHTML = `
        <div class="flex items-center justify-between">

          <span class="font-medium">${escapeHtml(query)}</span>

          <i data-lucide="history" class="w-4 h-4 text-gray-400"></i>

        </div>
      `;

      button.addEventListener("click", () => {
        state.input.value = query;
        performSearch(query);
      });

      state.dropdown.appendChild(button);
    });
    renderIcons();

    openDropdown();
  }

  function renderGroupHeader(group) {
    const header = createElement(
      "div",
      "sticky top-0 bg-white px-5 py-3 border-b text-xs font-bold text-gray-500",
    );

    header.textContent = state.groups[group].label;

    state.dropdown.appendChild(header);
  }
  function renderItem(group, item) {
    const row = createElement(
      "button",
      "group w-full text-right px-5 py-4 hover:bg-gray-50 transition duration-150 border-b last:border-b-0",
    );

    row.type = "button";

    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", "false");

    row.dataset.index = state.items.length;

    row.dataset.url = buildItemUrl(group, item);

    const title = getItemTitle(group, item);

    const subtitle = getItemSubtitle(group, item);

    row.innerHTML = `
      <div class="flex items-start justify-between gap-4">

        <div class="min-w-0 flex-1">

          <div class="font-semibold text-gray-800 truncate">

            ${highlight(title, state.query)}

          </div>

          ${
            subtitle
              ? `
          <div class="text-sm text-gray-500 truncate mt-1">

            ${highlight(subtitle, state.query)}

          </div>`
              : ""
          }

        </div>

        <span
          class="shrink-0 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">

          ${state.groups[group].badge}

        </span>

      </div>
    `;

    row.addEventListener("mouseenter", () => {
      state.selectedIndex = Number(row.dataset.index);
      updateSelection();
    });

    row.addEventListener("click", () => {
      global.location.href = row.dataset.url;
    });

    state.items.push(row);

    state.dropdown.appendChild(row);
  }

  function renderResults(data) {
    clear(state.dropdown);

    state.items = [];

    let hasResults = false;

    Object.entries(state.groups).forEach(([group]) => {
      const results = data[group];

      if (!results || !results.length) {
        return;
      }

      hasResults = true;

      renderGroupHeader(group);

      results.forEach((item) => {
        renderItem(group, item);
      });
    });

    if (!hasResults) {
      renderEmpty();
      return;
    }

    renderIcons();
    openDropdown();
  }

  function updateSelection() {
    state.items.forEach((item, index) => {
      const selected = index === state.selectedIndex;

      item.setAttribute("aria-selected", selected ? "true" : "false");

      if (selected) {
        item.classList.add("bg-primary/5", "border-r-4", "border-primary");

        item.scrollIntoView({
          block: "nearest",
        });
      } else {
        item.classList.remove("bg-primary/5", "border-r-4", "border-primary");
      }
    });
  }
  async function performSearch(query) {
    state.query = normalizeQuery(query);

    if (state.query.length < CONFIG.minQueryLength) {
      renderRecents();
      return;
    }

    const currentRequest = ++state.requestId;

    const loadingTimer = setTimeout(() => {
      renderLoading();
    }, CONFIG.loadingIndicatorDelay);

    const results = await search(state.query);

    clearTimeout(loadingTimer);

    if (currentRequest !== state.requestId) {
      return;
    }

    if (!results || typeof results !== "object" || Array.isArray(results)) {
      renderEmpty();
      return;
    }

    renderResults(results);
  }
  function handleKeyDown(event) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();

        if (!state.items.length) {
          return;
        }

        state.selectedIndex++;

        if (state.selectedIndex >= state.items.length) {
          state.selectedIndex = 0;
        }

        updateSelection();
        break;

      case "ArrowUp":
        event.preventDefault();

        if (!state.items.length) {
          return;
        }

        state.selectedIndex--;

        if (state.selectedIndex < 0) {
          state.selectedIndex = state.items.length - 1;
        }

        updateSelection();
        break;

      case "Enter":
        if (state.selectedIndex >= 0 && state.items[state.selectedIndex]) {
          event.preventDefault();
          state.items[state.selectedIndex].click();
        }
        break;

      case "Escape":
        closeDropdown();
        state.input.blur();
        break;
    }
  }

  function handleInput() {
    performSearch(state.input.value);
  }

  function handleFocus() {
    if (!normalizeQuery(state.input.value)) {
      renderRecents();
      return;
    }

    performSearch(state.input.value);
  }

  function handleOutsideClick(event) {
    if (
      !state.dropdown.contains(event.target) &&
      event.target !== state.input
    ) {
      closeDropdown();
    }
  }

  function handleGlobalShortcut(event) {
    const active = document.activeElement;

    if (
      active &&
      (active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable)
    ) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().includes("MAC");

    const shortcut =
      (isMac && event.metaKey && event.key.toLowerCase() === "k") ||
      (!isMac && event.ctrlKey && event.key.toLowerCase() === "k");

    if (!shortcut) {
      return;
    }

    event.preventDefault();

    state.input.focus();
    state.input.select();

    handleFocus();
  }

  function init(options = {}) {
    if (options.groups && typeof options.groups === "object") {
      state.groups = Object.freeze({
        ...state.groups,
        ...options.groups,
      });
    }
    if (state.initialized) {
      return;
    }

    state.input = document.getElementById(options.inputId);
    state.dropdown = document.getElementById(options.resultsId);

    if (!state.input || !state.dropdown) {
      console.error("GlobalSearch initialization failed.");
      return;
    }

    state.input.setAttribute("role", "combobox");
    state.input.setAttribute("aria-autocomplete", "list");
    state.input.setAttribute("aria-expanded", "false");

    state.dropdown.setAttribute("role", "listbox");

    loadRecentSearches();

    state.dropdown.classList.add(
      "hidden",
      "opacity-0",
      "-translate-y-2",
      "transition-all",
      "duration-200",
    );

    state.handlers.input = debounce(
      handleInput,
      options.debounce ?? CONFIG.debounceDelay,
    );

    state.handlers.keydown = handleKeyDown;
    state.handlers.focus = handleFocus;
    state.handlers.outsideClick = handleOutsideClick;
    state.handlers.shortcut = handleGlobalShortcut;

    state.input.addEventListener("input", state.handlers.input);

    state.input.addEventListener("keydown", state.handlers.keydown);

    state.input.addEventListener("focus", state.handlers.focus);

    document.addEventListener("click", state.handlers.outsideClick);

    document.addEventListener("keydown", state.handlers.shortcut);

    state.initialized = true;
  }

  function destroy() {
    if (!state.initialized) {
      return;
    }

    if (state.abortController) {
      state.abortController.abort();
    }

    clearTimeout(state.debounceTimer);

    state.input.removeEventListener("input", state.handlers.input);

    state.input.removeEventListener("keydown", state.handlers.keydown);

    state.input.removeEventListener("focus", state.handlers.focus);

    document.removeEventListener("click", state.handlers.outsideClick);

    document.removeEventListener("keydown", state.handlers.shortcut);

    closeDropdown();

    state.handlers = {};

    state.input = null;
    state.dropdown = null;
    state.items = [];
    state.query = "";
    state.selectedIndex = -1;
    state.abortController = null;
    state.cache.clear();
    state.recent = [];

    state.initialized = false;
  }

  global.GlobalSearch = Object.freeze({
    init,
    destroy,
    open: openDropdown,
    close: closeDropdown,
    search: performSearch,
    clear() {
      if (!state.input) {
        return;
      }

      state.input.value = "";
      state.query = "";
      renderRecents();
    },
  });
})(window);
