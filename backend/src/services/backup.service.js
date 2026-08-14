const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function getBackupRoot() {
  return process.env.WATHIQA_BACKUP_DIR || path.join(os.homedir(), "Wathiqa", "backups");
}

function getStorageRoot() {
  return process.env.WATHIQA_STORAGE_DIR || path.join(os.homedir(), "Wathiqa");
}

async function createBackup() {
  const root = getStorageRoot();
  const backupRoot = getBackupRoot();
  await fs.promises.mkdir(backupRoot, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const staging = await fs.promises.mkdtemp(path.join(os.tmpdir(), "wathiqa-backup-"));
  const archive = path.join(backupRoot, `Wathiqa-Backup-${stamp}.zip`);

  try {
    const entries = ["database", "uploads", "attorney-files", "exports"];
    for (const entry of entries) {
      const source = path.join(root, entry);
      if (fs.existsSync(source)) {
        await fs.promises.cp(source, path.join(staging, entry), { recursive: true });
      }
    }

    await fs.promises.writeFile(
      path.join(staging, "backup-metadata.json"),
      JSON.stringify({
        application: "Wathiqa",
        createdAt: new Date().toISOString(),
        version: process.env.npm_package_version || "unknown"
      }, null, 2),
      "utf8"
    );

    if (process.platform === "win32") {
      await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Compress-Archive -Path '${staging}\\*' -DestinationPath '${archive}' -Force`]);
    } else {
      await execFileAsync("zip", ["-qr", archive, "."], { cwd: staging });
    }

    return { archive, createdAt: new Date().toISOString() };
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
