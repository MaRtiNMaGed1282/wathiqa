async function loadSidebar() {
  try {
    const sidebarContainer = document.getElementById("sidebar-container");

    const sidebarPath = new URL(
      "../components/sidebar.html",
      window.location.href,
    );

    const response = await fetch(sidebarPath);

    const html = await response.text();

    sidebarContainer.innerHTML = html;
  } catch (err) {
    console.error(err);
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

loadSidebar();
