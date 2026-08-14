"use strict";

const assert = require("assert");

const BASE_URL = (process.env.SECURITY_TEST_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
const ORIGIN = BASE_URL.replace(/\/api$/, "");

const credentials = {
  admin: {
    email: process.env.SECURITY_ADMIN_EMAIL,
    password: process.env.SECURITY_ADMIN_PASSWORD,
  },
  lawyer: {
    email: process.env.SECURITY_LAWYER_EMAIL,
    password: process.env.SECURITY_LAWYER_PASSWORD,
  },
  assistant: {
    email: process.env.SECURITY_ASSISTANT_EMAIL,
    password: process.env.SECURITY_ASSISTANT_PASSWORD,
  },
};

const results = [];

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let body = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  return { status: response.status, headers: response.headers, body };
}

async function requestOrigin(path, options = {}) {
  const response = await fetch(`${ORIGIN}${path}`, {
    redirect: "manual",
    ...options,
  });

  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
  };
}

async function login(role) {
  const { email, password } = credentials[role];
  if (!email || !password) return null;

  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert.strictEqual(result.status, 200, `${role} login failed`);
  assert.ok(result.body && result.body.token, `${role} login returned no token`);
  assert.strictEqual(result.body.user.role, role, `${role} credentials returned a different role`);

  return result.body.token;
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
  } catch (error) {
    results.push({ name, status: "FAIL", error: error.message });
  }
}

async function main() {
  console.log(`Wathiqa security tests: ${BASE_URL}`);

  await test("Missing token is rejected", async () => {
    const result = await request("/clients");
    assert.strictEqual(result.status, 401);
  });

  await test("Malformed token is rejected", async () => {
    const result = await request("/clients", {
      headers: { Authorization: "Bearer not-a-valid-jwt" },
    });
    assert.strictEqual(result.status, 401);
  });

  await test("Wrong email is rejected", async () => {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "security-test-invalid@example.invalid",
        password: "wrong-password",
      }),
    });
    assert.strictEqual(result.status, 401);
  });

  await test("Wrong password is rejected", async () => {
    const known = Object.values(credentials).find((value) => value.email);
    if (!known) return;

    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: known.email, password: "definitely-wrong-password" }),
    });
    assert.strictEqual(result.status, 401);
  });

  await test("Public uploads path is not exposed", async () => {
    const result = await requestOrigin("/uploads/../package.json");
    assert.notStrictEqual(result.status, 200);
  });

  await test("Public attorney-files path is not exposed", async () => {
    const result = await requestOrigin("/attorney-files/../package.json");
    assert.notStrictEqual(result.status, 200);
  });

  const tokens = {};
  for (const role of ["admin", "lawyer", "assistant"]) {
    await test(`${role} authentication`, async () => {
      tokens[role] = await login(role);
    });
  }

  await test("Assistant is denied financial revenues", async () => {
    if (!tokens.assistant) return;
    const result = await request("/revenues/summary", {
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant is denied financial reports", async () => {
    if (!tokens.assistant) return;
    const result = await request("/reports/financial", {
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant is denied payments", async () => {
    if (!tokens.assistant) return;
    const result = await request("/payments/case/1", {
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant is denied expenses", async () => {
    if (!tokens.assistant) return;
    const result = await request("/expenses/service/1", {
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant is denied financial PDF", async () => {
    if (!tokens.assistant) return;
    const result = await request("/pdfs/financial", {
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant cannot delete clients", async () => {
    if (!tokens.assistant) return;
    const result = await request("/clients/1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant cannot delete cases", async () => {
    if (!tokens.assistant) return;
    const result = await request("/cases/1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant cannot delete services", async () => {
    if (!tokens.assistant) return;
    const result = await request("/services/1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant cannot delete case files", async () => {
    if (!tokens.assistant) return;
    const result = await request("/files/1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Assistant cannot delete service files", async () => {
    if (!tokens.assistant) return;
    const result = await request("/files/service/1", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokens.assistant}` },
    });
    assert.strictEqual(result.status, 403);
  });

  await test("Financial PDF requires authentication", async () => {
    const result = await request("/pdfs/financial");
    assert.strictEqual(result.status, 401);
  });

  await test("Change password requires authentication", async () => {
    const result = await request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "SecurityTest123!" }),
    });
    assert.strictEqual(result.status, 401);
  });

  const failed = results.filter((result) => result.status === "FAIL");
  console.table(results);

  if (failed.length) {
    console.error(`Security test failures: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log("Security test suite completed without failures.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
