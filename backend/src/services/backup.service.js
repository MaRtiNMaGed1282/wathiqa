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
    if (fs.existsSync(upload.getUploadDir())) {
      await fs.promises.cp(upload.getUploadDir(), path.join(staging, "uploads"), { recursive: true });
    }
    if (fs.existsSync(attorneyUpload.getUploadDir())) {
      await fs.promises.cp(attorneyUpload.getUploadDir(), path.join(staging, "attorneys"), { recursive: true });
    }

    await fs.promises.writeFile(
      path.join(staging, "backup-metadata.json"),
      JSON.stringify({
        application: "Wathiqa",
        createdAt: new Date().toISOString(),
        version: process.env.npm_package_version || "unknown",
        database: "wathiqa.db",
        includes: ["database", "case-and-service-files", "attorney-files"],
      }, null, 2),
      "utf8",
    );

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

module.exports = { createBackup, listBackups, getBackupRoot };
