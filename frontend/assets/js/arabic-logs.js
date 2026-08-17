(function (global) {
  "use strict";

  const original = {
    log: global.console.log.bind(global.console),
    info: global.console.info.bind(global.console),
    warn: global.console.warn.bind(global.console),
    error: global.console.error.bind(global.console),
  };

  const translations = new Map([
    ["Failed to fetch clients:", "فشل تحميل الموكلين:"],
    ["Search Error:", "خطأ أثناء البحث:"],
    ["Delete Error:", "خطأ أثناء الحذف:"],
    ["Add Client Error:", "خطأ أثناء إضافة الموكل:"],
    ["Notification error:", "خطأ في الإشعار:"],
    ["Clients initialization failed.", "فشل تهيئة صفحة الموكلين."],
    ["Activity Log Error:", "خطأ في سجل النشاط:"],
    ["SQLite connection failed:", "فشل الاتصال بقاعدة البيانات:"],
    ["SQLite Database Connected", "تم الاتصال بقاعدة البيانات بنجاح"],
    ["Database Path:", "مسار قاعدة البيانات:"],
    ["Failed to create notifications table:", "فشل إنشاء جدول الإشعارات:"],
    ["Failed to create user_permissions table:", "فشل إنشاء جدول صلاحيات المستخدمين:"],
    ["Failed to initialize user permissions:", "فشل تهيئة صلاحيات المستخدمين:"],
    ["Failed to create user_sessions table:", "فشل إنشاء جدول جلسات المستخدمين:"],
  ]);

  function translate(value) {
    if (typeof value !== "string") return value;
    return translations.get(value) || value;
  }

  function sanitizeArgs(args, isError) {
    if (isError) {
      const first = args.find((value) => typeof value === "string");
      return [translate(first || "حدث خطأ أثناء تنفيذ العملية")];
    }

    return args.map((value) => {
      if (value instanceof Error) return "حدث خطأ أثناء تنفيذ العملية";
      if (typeof value === "string") return translate(value);
      return value;
    });
  }

  global.console.log = (...args) => original.log(...sanitizeArgs(args, false));
  global.console.info = (...args) => original.info(...sanitizeArgs(args, false));
  global.console.warn = (...args) => original.warn(...sanitizeArgs(args, false));
  global.console.error = (...args) => original.error(...sanitizeArgs(args, true));
})(window);
