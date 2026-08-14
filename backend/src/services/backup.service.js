const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const db = require("../config/sqlite");
const upload = require("../config/upload");
const attorneyUpload = require("../config/attorneyUpload");

const execFileAsync = promisify(execFile);

function getBackupRoot() {
  return process.env.WATHIQA_BACKUP_DIR || path.join(os.homedir(), "Wathiqa", "backups");
}

async function createBackup() {
  const backupRoot = getBackupRoot();
  await fs.promises.mkdir(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const staging = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-backup-"));
  const archive = path.join(backupRoot, `Wathiqa-Backup-${stamp}.zip`);

  try {
    await fs.promises.copyFile(db.dbPath, path.join(staging, "wathiqa.db"));
    if (fs.existsSync(upload.getUploadDir())) await fs.promises.cp(upload.getUploadDir(), path.join(staging, "uploads"), { recursive: true });
    if (fs.existsSync(attorneyUpload.getUploadDir())) await fs.promises.cp(attorneyUpload.getUploadDir(), path.join(staging, "attorneys"), { recursive: true });
    await fs.promises.writeFile(path.join(staging, "backup-metadata.json"), JSON.stringify({
      application: "Wathiqa",
      createdAt: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      database: "wathiqa.db",
      includes: ["database", "case-and-service-files", "attorney-files"],
    }, null, 2), "utf8");

    if (process.platform === "win32") {
      const command = `Compress-Archive -Path '${staging}\\*' -DestinationPath '${archive}' -Force`;
      await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command]);
    } else {
      await execFileAsync("zip", ["-qr", archive, "."], { cwd: staging });
    }
    return { archive, name: path.basename(archive), createdAt: new Date().toISOString() };
  } finally {
    await fs.promises.rm(staging, { recursive: true, force: true });
  }
}

async function listBackups() {
  const root = getBackupRoot();
  await fs.promises.mkdir(root, { recursive: true });
  const names = await fs.promises.readdir(root);
  return names.filter((name) => /^Wathiqa-Backup-.*\.zip$/i.test(name)).sort().reverse();
}

async function scheduleRestore(name) {
  if (!/^Wathiqa-Backup-.*\.zip$/i.test(name) || path.basename(name) !== name) throw new Error("اسم النسخة الاحتياطية غير صالح");
  const archive = path.join(getBackupRoot(), name);
  if (!fs.existsSync(archive)) throw new Error("النسخة الاحتياطية غير موجودة");

  await createBackup();
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-restore-"));
  const pending = path.join(getBackupRoot(), "pending-restore");
  try {
    if (process.platform === "win32") {
      await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${temp}' -Force`]);
    } else {
      await execFileAsync("unzip", ["-q", archive, "-d", temp]);
    }
    const database = path.join(temp, "wathiqa.db");
    if (!fs.existsSync(database)) throw new Error("النسخة الاحتياطية لا تحتوي على قاعدة البيانات المطلوبة");
    await fs.promises.rm(pending, { recursive: true, force: true });
    await fs.promises.cp(temp, pending, { recursive: true });
    return { name, restartRequired: true };
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

module.exports = { createBackup, listBackups, scheduleRestore, getBackupRoot };
