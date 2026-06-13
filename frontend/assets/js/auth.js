const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

const user = JSON.parse(localStorage.getItem("user") || "{}");
