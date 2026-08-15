'use strict';

const MODULES = Object.freeze([
  { key: 'clients', label: 'الموكلين' },
  { key: 'cases', label: 'القضايا' },
  { key: 'services', label: 'الخدمات' },
  { key: 'calendar', label: 'التقويم' },
  { key: 'documents', label: 'المستندات' },
  { key: 'laws', label: 'المكتبة القانونية' },
  { key: 'revenues', label: 'الإيرادات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'users', label: 'المستخدمون' },
  { key: 'backup', label: 'النسخ الاحتياطي' },
]);

const ACTIONS = Object.freeze([
  { key: 'view', label: 'عرض' },
  { key: 'create', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
]);

const ROLE_DEFAULTS = Object.freeze({
  admin: Object.fromEntries(MODULES.map(({ key }) => [key, { view: 1, create: 1, edit: 1, delete: 1 }])),
  lawyer: {
    clients: { view: 1, create: 1, edit: 1, delete: 0 },
    cases: { view: 1, create: 1, edit: 1, delete: 0 },
    services: { view: 1, create: 1, edit: 1, delete: 0 },
    calendar: { view: 1, create: 1, edit: 1, delete: 0 },
    documents: { view: 1, create: 1, edit: 1, delete: 0 },
    laws: { view: 1, create: 1, edit: 1, delete: 0 },
    revenues: { view: 1, create: 1, edit: 1, delete: 0 },
    reports: { view: 1, create: 0, edit: 0, delete: 0 },
    users: { view: 0, create: 0, edit: 0, delete: 0 },
    backup: { view: 0, create: 0, edit: 0, delete: 0 },
  },
  assistant: {
    clients: { view: 1, create: 1, edit: 1, delete: 0 },
    cases: { view: 1, create: 1, edit: 1, delete: 0 },
    services: { view: 1, create: 1, edit: 1, delete: 0 },
    calendar: { view: 1, create: 1, edit: 1, delete: 0 },
    documents: { view: 1, create: 1, edit: 1, delete: 0 },
    laws: { view: 1, create: 0, edit: 0, delete: 0 },
    revenues: { view: 0, create: 0, edit: 0, delete: 0 },
    reports: { view: 0, create: 0, edit: 0, delete: 0 },
    users: { view: 0, create: 0, edit: 0, delete: 0 },
    backup: { view: 0, create: 0, edit: 0, delete: 0 },
  },
});

function getRoleDefaults(role) {
  const source = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.assistant;
  return JSON.parse(JSON.stringify(source));
}

module.exports = { MODULES, ACTIONS, ROLE_DEFAULTS, getRoleDefaults };
