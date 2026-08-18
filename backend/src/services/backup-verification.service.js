const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const sqlite3 = require("sqlite3").verbose();
const { getBackupRoot } = require("./backup.service");
const { verifyManifest } = require("./backup-manifest.service");

const execFileAsync = promisify(execFile);

function isValidBackupName(name) {
  return typeof name === "string" && /^Wathiqa-Backup-.*\.zip$/i.test(name) && path.basename(name) === name;
}

function checkDatabaseIntegrity(databasePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) return reject(openError);
      database.get("PRAGMA integrity_check", (error, row) => {
        database.close(() => {
          if (error) return reject(error);
          resolve(String(row?.integrity_check || "").toLowerCase() === "ok");
        });
      });
    });
  });
}

async function extractBackup(archive, destination) {
  if (process.platform === "win32") {
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Expand-Archive -LiteralPath '${archive.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
    ]);
    return;
  }
  await execFileAsync("unzip", ["-q", archive, "-d", destination]);
}

async function verifyBackup(name) {
  if (!isValidBackupName(name)) throw new Error("اسم النسخة الاحتياطية غير صالح");

  const archive = path.join(getBackupRoot(), name);
  if (!fs.existsSync(archive)) throw new Error("النسخة الاحتياطية غير موجودة");

  const stat = await fs.promises.stat(archive);
  if (!stat.isFile() || stat.size <= 0) throw new Error("ملف النسخة الاحتياطية غير صالح");

  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-verify-"));
  try {
    await extractBackup(archive, temp);

    const databasePath = path.join(temp, "wathiqa.db");
    const manifestPath = path.join(temp, "backup-manifest.json");
    const metadataPath = path.join(temp, "backup-metadata.json");

    if (!fs.existsSync(databasePath)) throw new Error("النسخة الاحتياطية لا تحتوي على قاعدة البيانات المطلوبة");
    if (!fs.existsSync(manifestPath)) throw new Error("النسخة الاحتياطية لا تحتوي على بيان السلامة المطلوب");

    let manifest;
    try {
      manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
    } catch (_) {
      throw new Error("بيان سلامة النسخة الاحتياطية غير صالح");
    }

    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf8"));
      } catch (_) {
        throw new Error("ملف بيانات النسخة الاحتياطية غير صالح");
      }
    }

    const manifestResult = await verifyManifest(temp, manifest);
    if (!manifestResult.valid) {
      throw new Error(`فشل التحقق من سلامة ملفات النسخة الاحتياطية (${manifestResult.failures.length} ملف)`);
    }

    const databaseHealthy = await checkDatabaseIntegrity(databasePath);
    if (!databaseHealthy) throw new Error("فشل فحص سلامة قاعدة البيانات داخل النسخة الاحتياطية");

    const included = ["uploads", "attorneys", "office-assets"].filter((entry) => fs.existsSync(path.join(temp, entry)));

    return {
      valid: true,
      name,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
      databaseIntegrity: "ok",
      manifestIntegrity: "ok",
      fileCount: manifestResult.fileCount,
      metadata,
      included,
    };
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

module.exports = { verifyBackup, isValidBackupName };
