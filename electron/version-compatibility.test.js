const assert = require("assert");
const {
  parseVersion,
  isCompatible,
  getCompatibility,
} = require("./version-compatibility");

assert.deepStrictEqual(parseVersion("1.2.3"), { major: 1, minor: 2, patch: 3 });
assert.strictEqual(parseVersion("1.2"), null);
assert.strictEqual(parseVersion("v1.2.3"), null);

assert.strictEqual(isCompatible("1.0.0", "1.0.0"), true);
assert.strictEqual(isCompatible("1.2.0", "1.0.0"), true);
assert.strictEqual(isCompatible("1.0.0", "1.2.0"), true);
assert.strictEqual(isCompatible("1.0.0", "2.0.0"), false);
assert.strictEqual(isCompatible("2.0.0", "1.9.9"), false);

assert.deepStrictEqual(getCompatibility("1.0.0", "1.9.9"), {
  compatible: true,
  reason: "COMPATIBLE",
});
assert.deepStrictEqual(getCompatibility("1.0.0", "2.0.0"), {
  compatible: false,
  reason: "MAJOR_VERSION_MISMATCH",
});
assert.deepStrictEqual(getCompatibility("1.0.0", "invalid"), {
  compatible: false,
  reason: "INVALID_VERSION",
});
assert.deepStrictEqual(getCompatibility("invalid", "1.0.0"), {
  compatible: false,
  reason: "INVALID_VERSION",
});

console.log("Version compatibility tests passed.");
