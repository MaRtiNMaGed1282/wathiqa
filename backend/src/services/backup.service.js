const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const db = require("../config/sqlite");
const upload = require("../config/upload");
const attorneyUpload = require("../config/attorneyUpload");
const { loadConfig } = require("../../../electron/deployment-config");
const { walkFiles, createManifest, verifyManifest } = require("./backup-manifest.service");

const execFileAsync = promisify(execFile);

function getBackupRoot() {
  return process.env.WATHIQA_BACKUP_DIR || path.join(os.homedir(), "Wathiqa", "backups");
}

function getUserDataDir() {
  try {
    const { app } = require("electron");
    if (app && typeof app.getPath === "function") return app.getPath("userData");
  } catch (_) {}
  return path.join(os.homedir(), "Wathiqa");
}

function getSafeDeploymentConfig() {
  const config = loadConfig();
  return {
    mode: config.mode,
    host: config.host,
    serverUrl: config.serverUrl,
    serverIdentity: config.serverIdentity,
    port: config.port,
  };
}

async function copyIfExists(source, destination) {
  if (!fs.existsSync(source)) return false;
  await fs.promises.cp(source, destination, { recursive: true });
  return true;
}

async function createBackup() {
  const backupRoot = getBackupRoot();
  await fs.promises.mkdir(backupRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const staging = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-backup-"));
  const archive = path.join(backupRoot, `Wathiqa-Backup-${stamp}.zip`);

  try {
    await fs.promises.copyFile(db.dbPath, path.join(staging, "wathiqa.db"));
    await copyIfExists(upload.getUploadDir(), path.join(staging, "uploads"));
    await copyIfExists(attorneyUpload.getUploadDir(), path.join(staging, "attorneys"));

    const userDataDir = getUserDataDir();
    const officeAssets = path.join(userDataDir, "office-assets");
    await copyIfExists(officeAssets, path.join(staging, "office-assets"));

    await fs.promises.writeFile(
      path.join(staging, "deployment-config.json"),
      JSON.stringify(getSafeDeploymentConfig(), null, 2),
      "utf8"
    );

    const entries = await walkFiles(staging);
    const manifest = await createManifest(staging, entries);
    await fs.promises.writeFile(
      path.join(staging, "backup-manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    await fs.promises.writeFile(path.join(staging, "backup-metadata.json"), JSON.stringify({
      application: "Wathiqa",
      createdAt: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      database: "wathiqa.db",
      includes: ["database", "case-and-service-files", "attorney-files", "office-assets", "safe-deployment-config"],
      manifestFormat: 1,
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

async function extractArchive(archive, destination) {
  if (process.platform === "win32") {
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Expand-Archive -LiteralPath '${archive.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`]);
  } else {
    await execFileAsync("unzip", ["-q", archive, "-d", destination]);
  }
}

async function verifyBackup(name) {
  if (!/^Wathiqa-Backup-.*\.zip$/i.test(name) || path.basename(name) !== name) throw new Error("اسم النسخة الاحتياطية غير صالح");
  const archive = path.join(getBackupRoot(), name);
  if (!fs.existsSync(archive)) throw new Error("النسخة الاحتياطية غير موجودة");

  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-verify-"));
  try {
    await extractArchive(archive, temp);
    if (!fs.existsSync(path.join(temp, "wathiqa.db"))) throw new Error("النسخة الاحتياطية لا تحتوي على قاعدة البيانات المطلوبة");
    const manifestFile = path.join(temp, "backup-manifest.json");
    if (!fs.existsSync(manifestFile)) throw new Error("النسخة الاحتياطية لا تحتوي على بيان السلامة المطلوب");
    const manifest = JSON.parse(await fs.promises.readFile(manifestFile, "utf8"));
    return await verifyManifest(temp, manifest);
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

async function scheduleRestore(name) {
  if (!/^Wathiqa-Backup-.*\.zip$/i.test(name) || path.basename(name) !== name) throw new Error("اسم النسخة الاحتياطية غير صالح");
  const archive = path.join(getBackupRoot(), name);
  if (!fs.existsSync(archive)) throw new Error("النسخة الاحتياطية غير موجودة");

  // Restore must use the full verifier, including manifest checks and SQLite integrity.
  // Require lazily to avoid the verifier -> backup.service dependency cycle.
  const { verifyBackup: verifyBackupForRestore } = require("./backup-verification.service");
  const verification = await verifyBackupForRestore(name);
  if (!verification.valid) throw new Error("لا يمكن الاستعادة من نسخة احتياطية غير سليمة");

  // Preserve the current office state before replacing it at the next startup.
  await createBackup();

  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-restore-"));
  const pending = path.join(getBackupRoot(), "pending-restore");
  try {
    await extractArchive(archive, temp);
    const database = path.join(temp, "wathiqa.db");
    if (!fs.existsSync(database)) throw new Error("النسخة الاحتياطية لا تحتوي على قاعدة البيانات المطلوبة");
    await fs.promises.rm(pending, { recursive: true, force: true });
    await fs.promises.cp(temp, pending, { recursive: true });
    return { name, restartRequired: true, verification };
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

module.exports = { createBackup, listBackups, scheduleRestore, verifyBackup, getBackupRoot };
