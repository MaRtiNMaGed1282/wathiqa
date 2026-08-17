(function () {
  "use strict";

  const form = document.getElementById("addClientForm");
  if (!form) return;

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const fullName = document.getElementById("full_name")?.value.trim() || "";
      if (!fullName) {
        Toastify({
          text: "اسم الموكل مطلوب",
          duration: 2500,
          gravity: "top",
          position: "left",
          close: true,
          style: { background: "#dc2626" },
        }).showToast();
        return;
      }

      const formData = new FormData(form);
      const file = document.getElementById("attorney_file")?.files?.[0];
      if (file) formData.set("attorney_file", file);

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton?.textContent || "إضافة موكل";

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = "جاري الحفظ...";
        }

        const response = await api.upload("/clients", formData, { busyElement: submitButton });

        Toastify({
          text: response?.message || "تم إضافة الموكل بنجاح",
          duration: 1800,
          gravity: "top",
          position: "left",
          close: true,
          style: { background: "#16a34a" },
        }).showToast();

        form.reset();
        setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        Toastify({
          text: error?.message || "تعذر إضافة الموكل",
          duration: 3000,
          gravity: "top",
          position: "left",
          close: true,
          style: { background: "#dc2626" },
        }).showToast();
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      }
    },
    true,
  );
})();
