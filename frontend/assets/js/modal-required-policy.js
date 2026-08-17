(function (global) {
  "use strict";

  function isClientNameField(element) {
    const id = String(element.id || "").toLowerCase();
    const name = String(element.name || "").toLowerCase();
    return id === "full_name" || id === "edit_full_name" || name === "full_name";
  }

  function applyPolicy(root = document) {
    root.querySelectorAll?.(".fixed [required], [role=dialog] [required], dialog [required]").forEach((field) => {
      if (!isClientNameField(field)) field.removeAttribute("required");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyPolicy(), { once: true });
  } else {
    applyPolicy();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) applyPolicy(node);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})(window);
