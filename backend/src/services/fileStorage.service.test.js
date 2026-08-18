const assert = require("assert");
const os = require("os");
const path = require("path");

const testRoot = path.join(os.tmpdir(), `wathiqa-storage-test-${process.pid}`);
process.env.WATHIQA_DATA_DIR = testRoot;

const storage = require("./fileStorage.service");

assert.strictEqual(storage.getUploadDirectory(), path.join(testRoot, "uploads"));
assert.ok(storage.ensureUploadDirectory());

const safe = storage.resolveStoredFile("example.pdf");
assert.strictEqual(safe, path.join(testRoot, "uploads", "example.pdf"));

assert.strictEqual(storage.resolveStoredFile("../example.pdf"), path.join(testRoot, "uploads", "example.pdf"));
assert.strictEqual(storage.resolveStoredFile(""), null);

console.log("fileStorage.service tests passed");
