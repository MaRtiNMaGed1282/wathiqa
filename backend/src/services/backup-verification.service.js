const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const sqlite3 = require("sqlite3").verbose();
const { getBackupRoot } = require("./backup.service");

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

async function verifyBackup(name) {
  if (!isValidBackupName(name)) throw new Error("اسم النسخة الاحتياطية غير صالح");

  const archive = path.join(getBackupRoot(), name);
  if (!fs.existsSync(archive)) throw new Error("النسخة الاحتياطية غير موجودة");

  const stat = await fs.promises.stat(archive);
  if (!stat.isFile() || stat.size <= 0) throw new Error("ملف النسخة الاحتياطية غير صالح");

  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-verify-"));
  try {
    if (process.platform === "win32") {
      await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Expand-Archive -LiteralPath '${archive.replace(/'/g, "''")}' -DestinationPath '${temp.replace(/'/g, "''")}' -Force`,
      ]);
    } else {
      await execFileAsync("unzip", ["-q", archive, "-d", temp]);
    }

    const databasePath = path.join(temp, "wathiqa.db");
    const metadataPath = path.join(temp, "backup-metadata.json");
    if (!fs.existsSync(databasePath)) throw new Error("النسخة الاحتياطية لا تحتوي على قاعدة البيانات المطلوبة");

    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf8"));
      } catch (_) {
        throw new Error("ملف بيانات النسخة الاحتياطية غير صالح");
      }
    }

    const databaseHealthy = await checkDatabaseIntegrity(databasePath);
    if (!databaseHealthy) throw new Error("فشل فحص سلامة قاعدة البيانات داخل النسخة الاحتياطية");

    const included = [];
    for (const entry of ["uploads", "attorneys"]) {
      if (fs.existsSync(path.join(temp, entry))) included.push(entry);
    }

    return {
      valid: true,
      name,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
      databaseIntegrity: "ok",
      metadata,
      included,
    };
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

module.exports = { verifyBackup, isValidBackupName };
