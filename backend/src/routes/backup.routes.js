const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { createBackup, listBackups, scheduleRestore, getBackupRoot } = require("../services/backup.service");
const { verifyBackup } = require("../services/backup-verification.service");
const requireAuth = require("../middlewares/auth.middleware");
const requireAdmin = require("../middlewares/admin.middleware");

router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  try {
    const names = await listBackups();
    const root = getBackupRoot();
    const backups = await Promise.all(names.map(async (name) => {
      const stat = await fs.promises.stat(path.join(root, name));
      return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
    }));
    res.json({ success: true, backups });
  } catch (_) {
    res.status(500).json({ success: false, message: "تعذر قراءة النسخ الاحتياطية" });
  }
});

router.post("/", async (req, res) => {
  try {
    const backup = await createBackup();
    res.status(201).json({ success: true, message: "تم إنشاء النسخة الاحتياطية بنجاح", backup });
  } catch (_) {
    res.status(500).json({ success: false, message: "تعذر إنشاء النسخة الاحتياطية" });
  }
});

router.post("/restore", async (req, res) => {
  try {
    const result = await scheduleRestore(req.body?.name);
    res.json({ success: true, message: "تم تجهيز الاستعادة. يجب إعادة تشغيل النظام لإكمالها.", restore: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error?.message || "تعذر تجهيز الاستعادة" });
  }
});

router.get("/:name/verify", async (req, res) => {
  try {
    const result = await verifyBackup(req.params.name);
    res.json({ success: true, message: "النسخة الاحتياطية سليمة وقابلة للقراءة.", verification: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error?.message || "فشل التحقق من النسخة الاحتياطية" });
  }
});

router.get("/:name/download", async (req, res) => {
  const name = req.params.name;
  if (!/^Wathiqa-Backup-.*\.zip$/i.test(name) || path.basename(name) !== name) {
    return res.status(400).json({ success: false, message: "اسم النسخة الاحتياطية غير صالح" });
  }
  const file = path.join(getBackupRoot(), name);
  if (!fs.existsSync(file)) return res.status(404).json({ success: false, message: "النسخة الاحتياطية غير موجودة" });
  return res.download(file, name);
});

module.exports = router;
