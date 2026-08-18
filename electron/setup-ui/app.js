const $ = (id) => document.getElementById(id);

const steps = ["step-choice", "step-office", "step-server", "step-client", "step-done"];
let selectedMode = null;
let selectedRole = null;
let lastServerUrl = null;
let pairingToken = null;
let pairingPayload = null;
let pairingAccepted = false;
let scannerStream = null;
let scannerTimer = null;

function showStep(id) {
  stopScanner();
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

function parsePairingPayload(raw) {
  const value = String(raw || "").trim();
  if (!value) throw new Error("بيانات QR فارغة");
  let payload = null;
  try { payload = JSON.parse(value); } catch (_) {}

  if (!payload && value.startsWith("WATHIQA://")) {
    const parsed = new URL(value.replace("WATHIQA://", "http://wathiqa.local/"));
    payload = {
      scheme: "WATHIQA_PAIRING",
      version: Number(parsed.searchParams.get("version") || 1),
      serverUrl: parsed.searchParams.get("server"),
      serverIdentity: parsed.searchParams.get("identity"),
      token: parsed.searchParams.get("token"),
      expiresAt: parsed.searchParams.get("expiresAt"),
    };
  }

  if (!payload || payload.scheme !== "WATHIQA_PAIRING") throw new Error("QR ليس رمز ربط صالحاً لخادم وثيقة");
  if (!payload.serverUrl) throw new Error("QR لا يحتوي على عنوان الخادم");
  if (payload.expiresAt && Date.parse(payload.expiresAt) <= Date.now()) throw new Error("انتهت صلاحية رمز الربط");

  $("server-url").value = payload.serverUrl;
  $("server-identity").value = payload.serverIdentity || "";
  $("pairing-token").value = payload.token || "";
  pairingToken = payload.token || null;
  pairingPayload = value;
  pairingAccepted = false;
  return payload;
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
  } catch (error) { console.error(error); }
}

for (const button of document.querySelectorAll("[data-mode]")) {
  button.addEventListener("click", () => {
    selectedMode = button.dataset.mode;
    if (selectedMode === "standalone") return saveStandalone();
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
      discoverServers();
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
  } catch (error) { console.error(error); }
}

$("server-port").addEventListener("input", refreshServerPreview);

async function saveStandalone() {
  try {
    await window.wathiqaSetup.saveStandalone({ port: 5000 });
    $("done-title").textContent = "تم إعداد هذا الكمبيوتر كوضع مستقل";
    $("done-text").textContent = "سيستخدم Wathiqa قاعدة البيانات المحلية على هذا الكمبيوتر.";
    $("done-details").innerHTML = "<div class='status-row'><span>الوضع</span><strong>Standalone</strong></div><div class='status-row'><span>الخادم</span><strong>Localhost</strong></div>";
    showStep("step-done");
  } catch (error) { alert(formatError(error)); }
}

$("save-server").addEventListener("click", async () => {
  const result = $("server-result");
  clearResult(result);
  try {
    const port = Number($("server-port").value || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("رقم المنفذ غير صالح");
    const response = await window.wathiqaSetup.saveServer({ port });
    lastServerUrl = response.config.serverUrl;
    setResult(result, "success", "تم حفظ إعداد الخادم", `عنوان الاتصال: ${lastServerUrl}`, "يمكنك الآن تشغيل Wathiqa ثم إنشاء QR لربط جهاز آخر.");
    $("pairing-panel").classList.remove("hidden");
    $("done-title").textContent = "تم إعداد خادم المكتب";
    $("done-text").textContent = "هذا الكمبيوتر أصبح صاحب قاعدة البيانات والملفات المركزية للمكتب.";
    $("done-details").innerHTML = `<div class='status-row'><span>الخادم</span><strong>${response.config.serverIdentity}</strong></div><div class='status-row'><span>عنوان الاتصال</span><strong dir='ltr'>${lastServerUrl}</strong></div><div class='status-row'><span>المنفذ</span><strong>${response.config.port}</strong></div>`;
  } catch (error) { setResult(result, "error", "تعذر حفظ الإعداد", formatError(error)); }
});

$("generate-pairing").addEventListener("click", async () => {
  try {
    const response = await window.wathiqaSetup.generatePairing();
    pairingPayload = response.payload;
    $("pairing-qr").innerHTML = response.svg;
    $("pairing-url").textContent = response.serverUrl;
    $("pairing-expiry").textContent = new Date(response.expiresAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    setResult($("server-result"), "error", "تعذر إنشاء QR", formatError(error));
  }
});

$("copy-pairing").addEventListener("click", async () => {
  if (!pairingPayload) return;
  try {
    await navigator.clipboard.writeText(pairingPayload);
    setResult($("server-result"), "success", "تم النسخ", "يمكن لصق البيانات في جهاز العميل إذا تعذر استخدام الكاميرا.");
  } catch (_) {
    setResult($("server-result"), "error", "تعذر النسخ", "انسخ البيانات من مربع الربط يدوياً.");
  }
});

function renderDiscoveredServers(servers) {
  const list = $("server-list");
  list.innerHTML = "";
  if (!servers?.length) {
    list.classList.add("hidden");
    setResult($("discovery-result"), "error", "لم يتم العثور على خادم", "يمكنك إدخال عنوان الخادم يدوياً أو استخدام QR.");
    return;
  }
  list.classList.remove("hidden");
  for (const server of servers) {
    const button = document.createElement("button");
    button.className = "server-option";
    button.innerHTML = `<strong>${server.serverIdentity}</strong><span dir='ltr'>${server.serverUrl}</span>`;
    button.addEventListener("click", () => {
      $("server-url").value = server.serverUrl;
      $("server-identity").value = server.serverIdentity || "";
      pairingToken = null;
      pairingAccepted = false;
      $("pairing-token").value = "";
      setResult($("discovery-result"), "success", "تم اختيار الخادم", "اختبر الاتصال قبل الحفظ.");
    });
    list.appendChild(button);
  }
  setResult($("discovery-result"), "success", `تم العثور على ${servers.length} خادم`, "اختر الخادم المطلوب من القائمة.");
}

async function discoverServers() {
  setResult($("discovery-result"), "loading", "جارٍ البحث", "يتم البحث عن خوادم وثيقة داخل شبكة المكتب...");
  try { renderDiscoveredServers(await window.wathiqaSetup.discoverServers()); }
  catch (error) { setResult($("discovery-result"), "error", "فشل البحث", formatError(error)); }
}

$("discover-servers").addEventListener("click", discoverServers);

async function startScanner() {
  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    setResult($("connection-result"), "error", "المسح بالكاميرا غير متاح", "استخدم حقل لصق بيانات QR أو أدخل عنوان الخادم يدوياً.");
    return;
  }
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    $("qr-video").srcObject = scannerStream;
    $("scanner-panel").classList.remove("hidden");
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const scan = async () => {
      if (!scannerStream) return;
      try {
        const codes = await detector.detect($("qr-video"));
        if (codes?.[0]?.rawValue) {
          parsePairingPayload(codes[0].rawValue);
          setResult($("connection-result"), "success", "تم قراءة QR", "تم إدخال بيانات الخادم ورمز الربط. اختبر الاتصال الآن.");
          stopScanner();
          return;
        }
      } catch (_) {}
      scannerTimer = setTimeout(scan, 250);
    };
    scannerTimer = setTimeout(scan, 500);
  } catch (error) {
    setResult($("connection-result"), "error", "تعذر تشغيل الكاميرا", formatError(error));
  }
}

function stopScanner() {
  if (scannerTimer) clearTimeout(scannerTimer);
  scannerTimer = null;
  if (scannerStream) scannerStream.getTracks().forEach((track) => track.stop());
  scannerStream = null;
  if ($("qr-video")) $("qr-video").srcObject = null;
  if ($("scanner-panel")) $("scanner-panel").classList.add("hidden");
}

$("scan-qr").addEventListener("click", startScanner);
$("stop-scanner").addEventListener("click", stopScanner);
$("apply-pairing-payload").addEventListener("click", () => {
  try {
    parsePairingPayload($("pairing-payload").value);
    setResult($("connection-result"), "success", "تم تطبيق بيانات QR", "تم إدخال عنوان الخادم ورمز الربط.");
  } catch (error) { setResult($("connection-result"), "error", "بيانات QR غير صالحة", formatError(error)); }
});

async function testClientConnection() {
  const result = $("connection-result");
  clearResult(result);
  const serverUrl = $("server-url").value.trim();
  pairingToken = $("pairing-token").value.trim() || null;
  if (!serverUrl) {
    setResult(result, "error", "عنوان الخادم مطلوب", "أدخل العنوان أو اختر خادماً من الاكتشاف أو استخدم QR.");
    return false;
  }
  setResult(result, "loading", "جارٍ الاختبار", "يتم الاتصال بخادم Wathiqa...");
  try {
    const response = await window.wathiqaSetup.testServer({ serverUrl, pairingToken });
    lastServerUrl = response.serverUrl;
    pairingAccepted = Boolean(response.pairing?.paired);
    const identity = response.info?.serverIdentity || response.health?.serverIdentity || "غير محدد";
    const mode = response.info?.mode || response.health?.mode || "غير محدد";
    setResult(result, "success", "تم العثور على خادم Wathiqa", "الخادم متاح عبر الشبكة.", `الخادم: ${identity} — الوضع: ${mode}${pairingAccepted ? " — تم قبول رمز الربط" : ""}`);
    return true;
  } catch (error) {
    pairingAccepted = false;
    setResult(result, "error", "تعذر الاتصال بالخادم", formatError(error), "تحقق من عنوان الخادم، تشغيل Wathiqa على الكمبيوتر الرئيسي، واتصال الشبكة.");
    return false;
  }
}

$("test-client").addEventListener("click", testClientConnection);

$("save-client").addEventListener("click", async () => {
  let ok = pairingAccepted;
  if (!ok) ok = await testClientConnection();
  if (!ok) return;
  try {
    const config = await window.wathiqaSetup.saveClient({ serverUrl: lastServerUrl, serverIdentity: $("server-identity").value.trim() || null, port: 5000 });
    $("done-title").textContent = "تم ربط هذا الكمبيوتر بالمكتب";
    $("done-text").textContent = "سيعمل Wathiqa على هذا الكمبيوتر كعميل ويستخدم خادم المكتب كمصدر البيانات الوحيد.";
    $("done-details").innerHTML = `<div class='status-row'><span>الوضع</span><strong>Client</strong></div><div class='status-row'><span>الخادم</span><strong dir='ltr'>${config.serverUrl}</strong></div>`;
    showStep("step-done");
  } catch (error) { setResult($("connection-result"), "error", "تعذر حفظ إعداد العميل", formatError(error)); }
});

$("restart-setup").addEventListener("click", () => showStep("step-choice"));
$("open-wathiqa").addEventListener("click", async () => {
  const result = await window.wathiqaSetup.launchWathiqa();
  if (!result?.launched) alert(result?.message || "تعذر فتح Wathiqa");
});

loadState();
