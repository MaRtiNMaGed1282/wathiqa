(function (global) {
  'use strict';
  if (!/\/users\.html$/i.test(global.location.pathname)) return;

  const ACTION_LABELS = { view: 'عرض', create: 'إضافة', edit: 'تعديل', delete: 'حذف' };
  const ROLE_BY_LABEL = { 'مدير النظام': 'admin', 'محامي': 'lawyer', 'مساعد': 'assistant' };
  let definitions = null;
  let selectedUserId = null;
  let modal = null;

  function toast(message, success = true) { if (global.Toastify) global.Toastify({ text: message, duration: 3200, gravity: 'top', position: 'left', close: true }).showToast(); else if (!success) global.alert(message); }
  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div'); modal.id = 'userPermissionsModal'; modal.className = 'hidden fixed inset-0 z-[70] bg-black/40 items-center justify-center p-4';
    modal.innerHTML = `<div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"><div class="p-6 border-b flex items-center justify-between"><div><h2 class="text-xl font-bold">صلاحيات المستخدم</h2><p id="permissionsUserLabel" class="text-sm text-gray-500 mt-1"></p></div><button type="button" id="closePermissionsModal" class="text-gray-500 text-2xl" aria-label="إغلاق">×</button></div><div id="permissionsBody" class="p-6 overflow-auto"></div><div class="p-5 border-t flex justify-end gap-3"><button type="button" id="cancelPermissions" class="px-5 py-3 rounded-xl border">إلغاء</button><button type="button" id="savePermissions" class="bg-primary text-white px-5 py-3 rounded-xl">حفظ الصلاحيات</button></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('#closePermissionsModal, #cancelPermissions')) closeModal(); if (event.target.id === 'savePermissions') savePermissions(); });
    return modal;
  }
  function closeModal() { if (!modal) return; modal.classList.add('hidden'); modal.classList.remove('flex'); selectedUserId = null; }
  async function loadDefinitions() { if (!definitions) definitions = await global.api.get('/permissions/definitions'); return definitions; }

  async function openPermissions(userId, userName) {
    ensureModal(); selectedUserId = Number(userId); document.getElementById('permissionsUserLabel').textContent = userName || `المستخدم #${userId}`;
    const body = document.getElementById('permissionsBody'); body.innerHTML = '<div class="py-12 text-center text-gray-500">جاري تحميل الصلاحيات...</div>'; modal.classList.remove('hidden'); modal.classList.add('flex');
    try {
      const [defs, current] = await Promise.all([loadDefinitions(), global.api.get(`/permissions/users/${encodeURIComponent(userId)}`)]);
      body.innerHTML = `<div class="overflow-x-auto border rounded-xl"><table class="w-full text-right min-w-[760px]"><thead class="bg-gray-50"><tr><th class="p-4">الوحدة</th>${defs.actions.map((action) => `<th class="p-4 text-center">${escapeHtml(ACTION_LABELS[action.key] || action.label || action.key)}</th>`).join('')}</tr></thead><tbody>${defs.modules.map((module) => `<tr class="border-t"><td class="p-4 font-semibold">${escapeHtml(module.label)}</td>${defs.actions.map((action) => { const checked = current.permissions?.[module.key]?.[action.key] ? 'checked' : ''; const disabled = current.role === 'admin' ? 'disabled' : ''; return `<td class="p-4 text-center"><input type="checkbox" class="permission-check h-5 w-5" data-module="${escapeHtml(module.key)}" data-action="${escapeHtml(action.key)}" ${checked} ${disabled}></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>${current.role === 'admin' ? '<p class="text-sm text-gray-500 mt-4">مدير النظام لديه جميع الصلاحيات ولا يمكن تقييده من هذه الشاشة.</p>' : '<p class="text-sm text-gray-500 mt-4">الصلاحيات تطبق من الخادم.</p>'}`;
    } catch (error) { body.innerHTML = `<div class="py-12 text-center text-red-600">${escapeHtml(error?.message || 'تعذر تحميل الصلاحيات')}</div>`; }
  }

  async function savePermissions() {
    if (!selectedUserId) return; const button = document.getElementById('savePermissions'); button.disabled = true;
    try {
      const permissions = {};
      document.querySelectorAll('.permission-check').forEach((input) => { const module = input.dataset.module; const action = input.dataset.action; permissions[module] ||= {}; permissions[module][action] = input.checked; });
      await global.api.put(`/permissions/users/${encodeURIComponent(selectedUserId)}`, { permissions }); toast('تم حفظ الصلاحيات بنجاح'); closeModal();
    } catch (error) { toast(error?.message || 'تعذر حفظ الصلاحيات', false); } finally { button.disabled = false; }
  }

  async function editUser(user) {
    if (!global.Swal) return;
    const result = await global.Swal.fire({
      title: 'تعديل المستخدم',
      html: `<div class="text-right space-y-3"><input id="editUserName" class="swal2-input" placeholder="الاسم الكامل" value="${escapeHtml(user.full_name)}"><input id="editUserUsername" class="swal2-input" placeholder="اسم المستخدم" value="${escapeHtml(user.username)}"><select id="editUserRole" class="swal2-select"><option value="admin">مدير النظام</option><option value="lawyer">محامي</option><option value="assistant">مساعد</option></select></div>`,
      didOpen: () => { document.getElementById('editUserRole').value = user.role; }, showCancelButton: true, confirmButtonText: 'حفظ', cancelButtonText: 'إلغاء',
      preConfirm: () => ({ full_name: document.getElementById('editUserName').value.trim(), username: document.getElementById('editUserUsername').value.trim(), role: document.getElementById('editUserRole').value }),
    });
    if (!result.isConfirmed) return;
    try { await global.api.put(`/permissions/users/${encodeURIComponent(user.id)}/profile`, result.value); toast('تم تحديث المستخدم بنجاح'); global.location.reload(); } catch (error) { toast(error?.message || 'تعذر تحديث المستخدم', false); }
  }

  function enhanceUsersTable() {
    const body = document.getElementById('usersTableBody'); if (!body) return;
    body.querySelectorAll('tr').forEach((row) => {
      if (row.dataset.permissionsEnhanced === '1') return;
      const statusButton = row.querySelector('[data-action="status"]'); const deleteButton = row.querySelector('[data-action="delete"]'); const id = statusButton?.dataset.id;
      if (!id || !deleteButton) return;
      const name = row.querySelector('td .font-semibold')?.textContent?.trim() || `المستخدم #${id}`;
      const roleLabel = row.querySelector('td:nth-child(2)')?.textContent?.trim() || 'مساعد';
      const email = row.querySelector('td .text-sm.text-gray-500')?.textContent?.trim() || '';
      const user = { id: Number(id), full_name: name, email, username: email.split('@')[0], role: ROLE_BY_LABEL[roleLabel] || 'assistant' };
      const container = deleteButton.parentElement;
      const permissionsButton = document.createElement('button'); permissionsButton.type = 'button'; permissionsButton.className = 'px-3 py-2 rounded-lg border text-sm'; permissionsButton.textContent = 'الصلاحيات'; permissionsButton.addEventListener('click', () => openPermissions(id, name));
      const editButton = document.createElement('button'); editButton.type = 'button'; editButton.className = 'px-3 py-2 rounded-lg border text-sm'; editButton.textContent = 'تعديل'; editButton.addEventListener('click', () => editUser(user));
      container.insertBefore(editButton, deleteButton); container.insertBefore(permissionsButton, deleteButton); row.dataset.permissionsEnhanced = '1';
    });
  }

  function init() {
    if (global.auth?.getUser?.()?.role !== 'admin') return; ensureModal(); const target = document.getElementById('usersTableBody') || document.body; new MutationObserver(enhanceUsersTable).observe(target, { childList: true, subtree: true }); enhanceUsersTable(); global.__WATHIQA_USER_PERMISSIONS_LOADED__ = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(window);
