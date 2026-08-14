(function (global) {
  "use strict";

  const DEFAULT_BASE_URL = "/api";
  const FORBIDDEN_MESSAGE = "ليس لديك صلاحية لتنفيذ هذا الإجراء";
  const DEFAULT_ERROR_MESSAGE = "حدث خطأ في الطلب";
  const DEFAULT_TIMEOUT = 30000;

  const HTTP_STATUS = Object.freeze({
    OK: 200,
    NO_CONTENT: 204,
    RESET_CONTENT: 205,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    VALIDATION: 422,
    REQUEST_TIMEOUT: 408,
    NETWORK_ERROR: 0,
  });

  function isLiveServerEnvironment() {
    try {
      const location = global.location;

      if (!location) return false;

      return (
        (location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
        location.port === "5500"
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
    if (!url) return baseUrl;
    if (/^https?:\/\//i.test(url)) return url;
    if (url === "/api" || url.startsWith("/api/")) return url;

    const normalizedBase = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;
    const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

    return `${normalizedBase}${normalizedUrl}`;
  }

  function appendQueryParams(url, params) {
    if (!params || typeof params !== "object") return url;

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      searchParams.append(key, value);
    });

    const query = searchParams.toString();
    if (!query) return url;

    return `${url}${url.includes("?") ? "&" : "?"}${query}`;
  }

  function isFormData(value) {
    return typeof FormData !== "undefined" && value instanceof FormData;
  }

  function isJsonSerializable(value) {
    return (
      value !== undefined &&
      value !== null &&
      !isFormData(value) &&
      typeof value !== "string" &&
      !(typeof Blob !== "undefined" && value instanceof Blob) &&
      !(typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) &&
      !(typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value)) &&
      !(typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams)
    );
  }

  async function parseResponse(response, responseType = "json") {
    if (
      response.status === HTTP_STATUS.NO_CONTENT ||
      response.status === HTTP_STATUS.RESET_CONTENT
    ) {
      return null;
    }

    if (responseType === "blob") return response.blob();
    if (responseType === "text") return response.text();

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!text) return null;

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

    if (isFormData(body)) {
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

  function getPayloadMessage(payload, fallback = DEFAULT_ERROR_MESSAGE) {
    if (!payload) return fallback;
    if (typeof payload === "string") return payload || fallback;

    return (
      payload.message ||
      payload.error ||
      payload.detail ||
      (Array.isArray(payload.errors) && payload.errors[0]?.message) ||
      fallback
    );
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

    const timeout = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT);

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
    }

    clearTimeout(timeout);

    if (response.status === HTTP_STATUS.UNAUTHORIZED) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {}

      throw createError("انتهت جلسة تسجيل الدخول", HTTP_STATUS.UNAUTHORIZED, null, requestUrl);
    }

    if (response.status === HTTP_STATUS.FORBIDDEN) {
      const payload = await parseResponse(response, options.responseType ?? "json");
      throw createError(
        getPayloadMessage(payload, FORBIDDEN_MESSAGE),
        HTTP_STATUS.FORBIDDEN,
        payload,
        requestUrl,
      );
    }

    if (!response.ok) {
      const payload = await parseResponse(response, options.responseType ?? "json");
      throw createError(
        getPayloadMessage(payload),
        response.status,
        payload,
        requestUrl,
      );
    }

    return parseResponse(response, options.responseType ?? "json");
  }

  function api(endpoint, options = {}) {
    return api.get(endpoint, options);
  }

  api.get = (url, options = {}) => request("GET", url, options);
  api.post = (url, data, options = {}) => request("POST", url, { ...options, data });
  api.put = (url, data, options = {}) => request("PUT", url, { ...options, data });
  api.patch = (url, data, options = {}) => request("PATCH", url, { ...options, data });
  api.delete = (url, options = {}) => request("DELETE", url, options);
  api.upload = (url, formData, options = {}) =>
    request("POST", url, { ...options, body: formData, data: formData });
  api.download = (url, options = {}) =>
    request("GET", url, { ...options, responseType: "blob" });
  api.request = request;
  api.ApiError = ApiError;
  api.HTTP_STATUS = HTTP_STATUS;

  Object.freeze(api);
  global.api = api;
})(window);
