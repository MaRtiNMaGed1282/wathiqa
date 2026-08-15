'use strict';

const { listSessions, revokeSession, revokeAllSessions } = require('../services/session.service');
const logActivity = require('../utils/activityLogger');

function cleanUserAgent(value) { return String(value || '').slice(0, 300); }

exports.listMySessions = async (req, res) => {
  try {
    const sessions = await listSessions(req.user.id);
    res.json(sessions.map((session) => ({
      id: session.id,
      current: session.jti === req.auth.jti,
      ipAddress: session.ip_address,
      userAgent: cleanUserAgent(session.user_agent),
      createdAt: session.created_at,
      lastSeenAt: session.last_seen_at,
      expiresAt: session.expires_at,
      revokedAt: session.revoked_at,
      active: !session.revoked_at && new Date(session.expires_at) > new Date(),
    })));
  } catch (error) { res.status(500).json({ message: 'تعذر تحميل جلسات الدخول' }); }
};

exports.revokeMySession = async (req, res) => {
  const sessionId = Number(req.params.id);
  if (!Number.isInteger(sessionId) || sessionId <= 0) return res.status(400).json({ message: 'رقم الجلسة غير صالح' });
  try {
    const sessions = await listSessions(req.user.id);
    const target = sessions.find((session) => Number(session.id) === sessionId);
    if (!target) return res.status(404).json({ message: 'جلسة الدخول غير موجودة' });
    if (target.jti === req.auth.jti) return res.status(400).json({ message: 'استخدم تسجيل الخروج لإنهاء الجلسة الحالية' });
    await revokeSession(target.jti, req.user.id);
    logActivity({ module: 'auth', record_id: req.user.id, action: 'session_revoked', description: 'تم إنهاء جلسة دخول أخرى', user_id: req.user.id });
    res.json({ message: 'تم إنهاء الجلسة بنجاح' });
  } catch (error) { res.status(500).json({ message: 'تعذر إنهاء جلسة الدخول' }); }
};

exports.revokeAllOtherSessions = async (req, res) => {
  try {
    const revoked = await revokeAllSessions(req.user.id, req.auth.jti);
    logActivity({ module: 'auth', record_id: req.user.id, action: 'logout_all', description: `تم إنهاء ${revoked} جلسة أخرى`, user_id: req.user.id });
    res.json({ message: 'تم إنهاء جلسات الدخول الأخرى', revoked });
  } catch (error) { res.status(500).json({ message: 'تعذر إنهاء جلسات الدخول' }); }
};
