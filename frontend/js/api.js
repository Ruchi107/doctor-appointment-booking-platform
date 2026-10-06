const API_BASE = "/api";

function getToken() { return localStorage.getItem("dab_token"); }
function getUser() {
  const raw = localStorage.getItem("dab_user");
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem("dab_token", token);
  localStorage.setItem("dab_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("dab_token");
  localStorage.removeItem("dab_user");
}
function requireLogin(allowedRoles) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = "login.html";
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    alert("You don't have access to this page.");
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function apiRequest(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function renderNav() {
  const user = getUser();
  const navEl = document.getElementById("nav");
  if (!navEl) return;

  let links = "";
  if (user) {
    links += `<a href="search.html">Find a Doctor</a>`;
    if (user.role === "patient") {
      links += `<a href="my-appointments.html">My Appointments</a>`;
      links += `<a href="my-prescriptions.html">My Prescriptions</a>`;
    }
    if (user.role === "provider") {
      links += `<a href="provider-slots.html">Manage Slots</a>`;
      links += `<a href="provider-appointments.html">Appointment Requests</a>`;
    }
    links += `<a href="#" id="logoutLink">Logout (${user.name})</a>`;
  } else {
    links += `<a href="login.html">Login</a>`;
    links += `<a href="register.html">Register</a>`;
  }

  navEl.innerHTML = `<div class="brand">🩺 Doctor Appointment Platform</div><div>${links}</div>`;

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = "login.html";
    });
  }
}

function showAlert(containerId, message, type = "error") {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert ${type}">${message}</div>`;
}
