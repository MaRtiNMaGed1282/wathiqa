(function (global) {
  const DEFAULT_BASE_URL = "/api";
  const FORBIDDEN_MESSAGE = "ليس لديك صلاحية لتنفيذ هذا الإجراء";
  const DUPLICATE_REQUEST_MESSAGE = "هذا الطلب قيد التنفيذ بالفعل";
  const HTTP_STATUS = Object.freeze({
    OK: 200,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    REQUEST_TIMEOUT: 408,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NETWORK_ERROR: 0,
  });
  const DEFAULT_TIMEOUT = 30000;
  const activeMutationKeys = new Set();
  const busyElements = new Map();
  let activeRequestCount = 0;
  let loadingBar = null;

  function ensureLoadingBar() {
    if (loadingBar || !global.document?.body) {
      return loadingBar;
    }

    loadingBar = global.document.createElement("div");
    loadingBar.id = "wathiqa-api-loading";
    loadingBar.setAttribute("aria-hidden", "true");
    loadingBar.style.cssText = [
      "position:fixed",
      "top:0",
      "right:0",
      "left:0",
      "height:3px",
      "z-index:99999",
      "background:linear-gradient(90deg,transparent,#0f766e,transparent)",
      "background-size:200% 100%",
      "animation:wathiqaApiLoading 1s linear infinite",
      "display:none",
      "pointer-events:none",
    ].join(";");

    if (!global.document.getElementById("wathiqa-api-loading-style")) {
      const style = global.document.createElement("style");
      style.id = "wathiqa-api-loading-style";
      style.textContent =
        "@keyframes wathiqaApiLoading{0%{background-position:200% 0}100%{background-position:-200% 0}}";
      global.document.head?.appendChild(style);
    }

    global.document.body.appendChild(loadingBar);
    return loadingBar;
  }

  function setRequestLoading(active) {
    activeRequestCount = Math.max(0, activeRequestCount + (active ? 1 : -1));

    const bar = ensureLoadingBar();
    if (bar) {
      bar.style.display = activeRequestCount > 0 ? "block" : "none";
    }

    try {
      global.dispatchEvent(
        new CustomEvent("wathiqa:api-state", {
          detail: {
            loading: activeRequestCount > 0,
            activeRequests: activeRequestCount,
          },
        }),
      );
    } catch {}
  }

  function markElementBusy(element) {
    if (!element || !(element instanceof global.HTMLElement)) {
      return;
    }

    const count = busyElements.get(element) || 0;
    busyElements.set(element, count + 1);

    if (count === 0) {
      element.dataset.wathiqaBusy = "true";
      element.setAttribute("aria-busy", "true");
      element.dataset.wathiqaOriginalDisabled = element.disabled ? "true" : "false";
      element.disabled = true;
    }
  }

  function unmarkElementBusy(element) {
    if (!element) {
      return;
    }

    const count = busyElements.get(element) || 0;

    if (count <= 1) {
      busyElements.delete(element);
      element.removeAttribute("aria-busy");
      delete element.dataset.wathiqaBusy;

      if (element.dataset.wathiqaOriginalDisabled !== "true") {
        element.disabled = false;
      }

      delete element.dataset.wathiqaOriginalDisabled;
      return;
    }

    busyElements.set(element, count - 1);
  }

  function findBusyElement() {
    const active = global.document?.activeElement;

    if (active instanceof global.HTMLButtonElement) {
      return active;
    }

    if (active instanceof global.HTMLInputElement && active.type === "submit") {
      return active;
    }

    return null;
  }

  function findFormSubmitButton() {
    const active = global.document?.activeElement;
    const form = active?.form || active?.closest?.("form");

    if (!form) {
      return null;
    }

    return form.querySelector('button[type="submit"], input[type="submit"]');
  }

  function getBusyElement(options) {
    if (options?.busyElement instanceof global.HTMLElement) {
      return options.busyElement;
    }

    return findBusyElement() || findFormSubmitButton();
  }

  function serializeMutationBody(body) {
    if (body instanceof FormData) {
      const entries = [];
      body.forEach((value, key) => {
        if (value instanceof File) {
          entries.push([key, value.name, value.size, value.lastModified]);
        } else {
          entries.push([key, String(value)]);
        }
      });
      return JSON.stringify(entries);
    }

    if (body === undefined || body === null) {
      return "";
    }

    try {
      return JSON.stringify(body);
    } catch {
      return String(body);
    }
  }

  function getMutationKey(method, requestUrl, body) {
    return `${method}:${requestUrl}:${serializeMutationBody(body)}`;
  }

  function isLiveServerEnvironment() {
    try {
      const location = global.location;

      if (!location) {
        return false;
      }

      const hostname = location.hostname;
      const port = location.port;

      return (
        (hostname === "localhost" || hostname === "127.0.0.1") &&
        port === "5500"
      );
    } catch {
      return false;
    }
  }

  function getConfiguredBaseUrl() {
    try {
      const configuredBaseUrl =
        global.__APP_CONFIG__?.BASE_URL ?? DEFAULT_BASE_URL;

      if (configuredBaseUrl === DEFAULT_BASE_URL && isLiveServerEnvironment()) {
        return "http://localhost:5000/api";
      }

      return configuredBaseUrl;
    } catch {
      return DEFAULT_BASE_URL;
    }
  }

  function getToken() {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }

  function resolveUrl(url, baseUrl) {
    if (!url) {
      return baseUrl;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    if (url === "/api" || url.startsWith("/api/")) {
      return url;
    }

    const normalizedBase = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;

    const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

    return `${normalizedBase}${normalizedUrl}`;
  }

  function appendQueryParams(url, params) {
    if (!params || typeof params !== "object") {
      return url;
    }

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      searchParams.append(key, value);
    });

    const query = searchParams.toString();

    if (!query) {
      return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}${query}`;
  }

  function isFormData(value) {
    return value instanceof FormData;
  }

  function isJsonSerializable(value) {
    return (
      value !== undefined &&
      value !== null &&
      !isFormData(value) &&
      typeof value !== "string" &&
      !(value instanceof Blob) &&
      !(value instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(value) &&
      !(value instanceof URLSearchParams)
    );
  }

  async function parseResponse(response, responseType) {
    if (
      response.status === HTTP_STATUS.NO_CONTENT ||
      response.status === HTTP_STATUS.RESET_CONTENT
    ) {
      return null;
    }

    if (responseType === "blob") {
      return response.blob();
    }

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!text) {
      return null;
    }

    if (
      contentType.includes("application/json") ||
      text.trim().startsWith("{") ||
      text.trim().startsWith("[")
    ) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    return text;
  }

  function buildHeaders(options = {}, body) {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }
    const token = getToken();

    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (isJsonSerializable(body) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (isFormData(body) && !headers.has("Content-Type")) {
      headers.delete("Content-Type");
    }

    return headers;
  }

  class ApiError extends Error {
    constructor(message, status, body = null, url = "") {
      super(message);

      this.name = "ApiError";
      this.status = status;
      this.body = body;
      this.url = url;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ApiError);
      }
    }
  }

  function createError(message, status, body, url) {
    return new ApiError(message, status, body, url);
  }

  async function request(method, url, options = {}) {
    const baseUrl = options.baseUrl ?? getConfiguredBaseUrl();
    const requestUrl = appendQueryParams(
      resolveUrl(url, baseUrl),
      options.params,
    );
    const body = options.body !== undefined ? options.body : options.data;
    const shouldSerializeJson = isJsonSerializable(body);
    const requestBody = shouldSerializeJson ? JSON.stringify(body) : body;
    const headers = buildHeaders(options, body);
    const controller = new AbortController();
    const isMutation = method !== "GET" && method !== "HEAD";
    const mutationKey = isMutation
      ? getMutationKey(method, requestUrl, body)
      : null;
    const busyElement = isMutation ? getBusyElement(options) : null;

    if (mutationKey && activeMutationKeys.has(mutationKey)) {
      throw createError(
        DUPLICATE_REQUEST_MESSAGE,
        409,
        null,
        requestUrl,
      );
    }

    if (mutationKey) {
      activeMutationKeys.add(mutationKey);
    }

    if (busyElement) {
      markElementBusy(busyElement);
    }

    setRequestLoading(true);

    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeout ?? DEFAULT_TIMEOUT);

    let response;

    try {
      response = await fetch(requestUrl, {
        ...options,
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);

      if (error?.name === "AbortError") {
        throw createError(
          "انتهت مهلة الاتصال بالخادم",
          HTTP_STATUS.REQUEST_TIMEOUT,
          null,
          requestUrl,
        );
      }

      if (error instanceof TypeError) {
        throw createError(
          "تعذر الاتصال بالخادم",
          HTTP_STATUS.NETWORK_ERROR,
          null,
          requestUrl,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      setRequestLoading(false);

      if (busyElement) {
        unmarkElementBusy(busyElement);
      }

      if (mutationKey) {
        activeMutationKeys.delete(mutationKey);
      }
    }

    if (response.status === HTTP_STATUS.UNAUTHORIZED) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {}

      throw createError("غير مصرح", HTTP_STATUS.UNAUTHORIZED, null, requestUrl);
    }

    if (response.status === HTTP_STATUS.FORBIDDEN) {
      throw createError(
        FORBIDDEN_MESSAGE,
        HTTP_STATUS.FORBIDDEN,
        null,
        requestUrl,
      );
    }

    if (!response.ok) {
      const payload = await parseResponse(
        response,
        options.responseType ?? "json",
      );
      const message =
        (payload && payload.message) ||
        (payload && payload.error) ||
        "حدث خطأ في الطلب";

      throw createError(message, response.status, payload, requestUrl);
    }

    return parseResponse(response, options.responseType ?? "json");
  }

  function api(endpoint, options = {}) {
    return api.get(endpoint, options);
  }

  api.get = function (url, options = {}) {
    return request("GET", url, options);
  };

  api.post = function (url, data, options = {}) {
    return request("POST", url, { ...options, data });
  };

  api.put = function (url, data, options = {}) {
    return request("PUT", url, { ...options, data });
  };

  api.patch = function (url, data, options = {}) {
    return request("PATCH", url, { ...options, data });
  };

  api.delete = function (url, options = {}) {
    return request("DELETE", url, options);
  };

  api.upload = function (url, formData, options = {}) {
    return request("POST", url, {
      ...options,
      body: formData,
      data: formData,
    });
  };

  api.download = function (url, options = {}) {
    return request("GET", url, { ...options, responseType: "blob" });
  };

  api.request = request;
  Object.freeze(api);
  global.api = api;
})(window);
