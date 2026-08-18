const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function walkFiles(root) {
  const results = [];
  if (!fs.existsSync(root)) return results;

  async function visit(current, relativeBase = "") {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.join(relativeBase, entry.name);
      if (entry.isDirectory()) await visit(absolute, relative);
      else if (entry.isFile()) results.push({ absolute, relative: relative.replace(/\\/g, "/") });
    }
  }

  await visit(root);
  return results;
}

async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(file);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function createManifest(root, entries) {
  const files = [];
  for (const entry of entries) {
    const stat = await fs.promises.stat(entry.absolute);
    files.push({
      path: entry.relative,
      size: stat.size,
      sha256: await sha256File(entry.absolute),
    });
  }

  return {
    format: 1,
    generatedAt: new Date().toISOString(),
    files,
    fileCount: files.length,
  };
}

async function verifyManifest(root, manifest) {
  if (!manifest || manifest.format !== 1 || !Array.isArray(manifest.files)) {
    throw new Error("النسخة الاحتياطية لا تحتوي على بيان سلامة صالح");
  }

  const failures = [];
  for (const item of manifest.files) {
    const file = path.resolve(root, item.path);
    const rootResolved = path.resolve(root) + path.sep;
    if (!file.startsWith(rootResolved)) {
      failures.push({ path: item.path, reason: "invalid-path" });
      continue;
    }
    if (!fs.existsSync(file)) {
      failures.push({ path: item.path, reason: "missing" });
      continue;
    }
    const stat = await fs.promises.stat(file);
    if (!stat.isFile() || stat.size !== item.size) {
      failures.push({ path: item.path, reason: "size-mismatch" });
      continue;
    }
    const actual = await sha256File(file);
    if (actual !== item.sha256) failures.push({ path: item.path, reason: "checksum-mismatch" });
  }

  return {
    valid: failures.length === 0,
    fileCount: manifest.fileCount,
    failures,
  };
}

module.exports = { walkFiles, createManifest, verifyManifest };
