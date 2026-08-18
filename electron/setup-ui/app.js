const $ = (id) => document.getElementById(id);

const steps = ["step-choice", "step-office", "step-server", "step-client", "step-done"];
let selectedMode = null;
let selectedRole = null;
let lastServerUrl = null;

function showStep(id) {
  for (const step of steps) $(step).classList.toggle("active", step === id);
}

function setResult(element, type, title, message, details = "") {
  element.className = `result ${type}`;
  element.innerHTML = `<strong>${title}</strong><span>${message}</span>${details ? `<small>${details}</small>` : ""}`;
}

function clearResult(element) {
  element.className = "result hidden";
  element.textContent = "";
}

function formatError(error) {
  return error?.message || "حدث خطأ غير متوقع";
}

function localAddress(network) {
  return network?.preferredAddress || network?.addresses?.[0] || "127.0.0.1";
}

async function loadState() {
  try {
    const state = await window.wathiqaSetup.getState();
    const config = state.config || {};

    if (config.mode === "server") {
      selectedMode = "office";
      selectedRole = "server";
      $("server-hostname").textContent = config.serverIdentity || state.network?.hostname || "—";
      $("server-address").textContent = `${localAddress(state.network)}:${config.port || 5000}`;
    } else if (config.mode === "client" && config.serverUrl) {
      selectedMode = "office";
      selectedRole = "client";
      $("server-url").value = config.serverUrl;
      $("server-identity").value = config.serverIdentity || "";
    }
  } catch (error) {
    console.error(error);
  }
}

for (const button of document.querySelectorAll("[data-mode]")) {
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    if (selectedMode === "standalone") {
      saveStandalone();
      return;
    }
    showStep("step-office");
  });
}

for (const button of document.querySelectorAll("[data-role]")) {
  button.addEventListener("click", () => {
    selectedRole = button.dataset.role;
    if (selectedRole === "server") {
      showStep("step-server");
      refreshServerPreview();
    } else {
      showStep("step-client");
    }
  });
}

for (const button of document.querySelectorAll("[data-back]")) {
  button.addEventListener("click", () => showStep(button.dataset.back === "choice" ? "step-choice" : "step-office"));
}

async function refreshServerPreview() {
  try {
    const state = await window.wathiqaSetup.getState();
    $("server-hostname").textContent = state.network?.hostname || "—";
    $("server-address").textContent = `${localAddress(state.network)}:${$("server-port").value || 5000}`;
  } catch (error) {
    console.error(error);
  }
}

$("server-port").addEventListener("input", refreshServerPreview);

async function saveStandalone() {
  try {
    await window.wathiqaSetup.saveStandalone({ port: 5000 });
    showStep("step-done");
    $("done-title").textContent = "تم إعداد هذا الكمبيوتر كوضع مستقل";
    $("done-text").textContent = "سيستخدم Wathiqa قاعدة البيانات المحلية على هذا الكمبيوتر.";
    $("done-details").innerHTML = "<div class='status-row'><span>الوضع</span><strong>Standalone</strong></div><div class='status-row'><span>الخادم</span><strong>Localhost</strong></div>";
  } catch (error) {
    alert(formatError(error));
  }
}

$("save-server").addEventListener("click", async () => {
  const result = $("server-result");
  clearResult(result);

  try {
    const port = Number($("server-port").value || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("رقم المنفذ غير صالح");

    const response = await window.wathiqaSetup.saveServer({ port });
    lastServerUrl = `http://${localAddress(response.network)}:${response.config.port}`;

    setResult(
      result,
      "success",
      "تم حفظ إعداد الخادم",
      `عنوان الاتصال: ${lastServerUrl}`,
      "شغّل Wathiqa على هذا الكمبيوتر ليبدأ الخادم. بعد ذلك يمكن إعداد أجهزة المكتب الأخرى باستخدام هذا العنوان."
    );

    $("done-title").textContent = "تم إعداد خادم المكتب";
    $("done-text").textContent = "هذا الكمبيوتر أصبح صاحب قاعدة البيانات والملفات المركزية للمكتب.";
    $("done-details").innerHTML = `<div class='status-row'><span>الخادم</span><strong>${response.config.serverIdentity}</strong></div><div class='status-row'><span>عنوان الاتصال</span><strong dir='ltr'>${lastServerUrl}</strong></div><div class='status-row'><span>المنفذ</span><strong>${response.config.port}</strong></div>`;
    showStep("step-done");
  } catch (error) {
    setResult(result, "error", "تعذر حفظ الإعداد", formatError(error));
  }
});

async function testClientConnection() {
  const result = $("connection-result");
  clearResult(result);
  const serverUrl = $("server-url").value.trim();
  if (!serverUrl) {
    setResult(result, "error", "عنوان الخادم مطلوب", "أدخل عنوان الخادم مثل http://192.168.1.100:5000");
    return false;
  }

  setResult(result, "loading", "جارٍ الاختبار", "يتم الاتصال بخادم Wathiqa...");

  try {
    const response = await window.wathiqaSetup.testServer({ serverUrl });
    lastServerUrl = response.serverUrl;
    const identity = response.info?.serverIdentity || response.health?.serverIdentity || "غير محدد";
    const mode = response.info?.mode || response.health?.mode || "غير محدد";

    setResult(
      result,
      "success",
      "تم العثور على خادم Wathiqa",
      "الخادم وقاعدة البيانات متاحان عبر الشبكة.",
      `الخادم: ${identity} — الوضع: ${mode}`
    );
    return true;
  } catch (error) {
    setResult(
      result,
      "error",
      "تعذر الاتصال بالخادم",
      formatError(error),
      "تحقق من عنوان الخادم، اتصال الشبكة، تشغيل Wathiqa على الكمبيوتر الرئيسي، وإتاحة المنفذ 5000 في Windows Firewall."
    );
    return false;
  }
}

$("test-client").addEventListener("click", testClientConnection);

$("save-client").addEventListener("click", async () => {
  const ok = await testClientConnection();
  if (!ok) return;

  try {
    const config = await window.wathiqaSetup.saveClient({
      serverUrl: lastServerUrl,
      serverIdentity: $("server-identity").value.trim() || null,
      port: 5000,
    });

    $("done-title").textContent = "تم ربط هذا الكمبيوتر بالمكتب";
    $("done-text").textContent = "سيعمل Wathiqa على هذا الكمبيوتر كعميل ويستخدم خادم المكتب كمصدر البيانات الوحيد.";
    $("done-details").innerHTML = `<div class='status-row'><span>الوضع</span><strong>Client</strong></div><div class='status-row'><span>الخادم</span><strong dir='ltr'>${config.serverUrl}</strong></div>`;
    showStep("step-done");
  } catch (error) {
    setResult($("connection-result"), "error", "تعذر حفظ إعداد العميل", formatError(error));
  }
});

$("restart-setup").addEventListener("click", () => showStep("step-choice"));

$("open-wathiqa").addEventListener("click", () => {
  // Opening the main application is intentionally left to the installed Wathiqa shortcut.
  // The setup utility never guesses an installation path.
  window.wathiqaSetup.openUrl("file:///C:/ProgramData/Wathiqa/Wathiqa.exe").catch(() => {});
});

loadState();
