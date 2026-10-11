
// Send OTP
export const sendOtp = async (phone_number, role) => {
  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_number, role }),
  });
  return res.json();
};

// Verify OTP
export const verifyOtp = async (user_id, otp) => {
  const res = await fetch("/api/auth/validate-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, otp }),
  });
  return res.json();
};

// Check if user is logged in
export const getLoggedInUser = (role) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${role}User`);
    if (!raw) return null;
    const user = JSON.parse(raw);

    // Auto-migrate legacy dummy user IDs in localStorage
    if (user?.id === "10000000-0000-4000-8000-000000000001") {
      user.id = "c4b12f6a-8d7e-49b2-a3c5-92f14890c23e";
      if (user.details) {
        user.details.id = "c4b12f6a-8d7e-49b2-a3c5-92f14890c23e";
        user.details.pharmacy_name = "Apex Healthcare & Medicos";
      }
      localStorage.setItem(`${role}User`, JSON.stringify(user));
      document.cookie = `session_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
    } else if (user?.id === "10000000-0000-4000-8000-000000000002") {
      user.id = "e8d2491a-7b3f-4e92-bc10-7299a9a3f821";
      if (user.details) {
        user.details.id = "e8d2491a-7b3f-4e92-bc10-7299a9a3f821";
        user.details.lab_name = "Apex Diagnostic & Pathology Lab";
      }
      localStorage.setItem(`${role}User`, JSON.stringify(user));
      document.cookie = `session_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
    }

    return user;
  } catch (e) {
    return null;
  }
};

// Save user
export const setLoggedInUser = (role, user) => {
  if (typeof window === "undefined") return;

  // Clear stale conflicting role session keys
  const allRoles = ["patient", "doctor", "chemist", "lab", "admin", "staff", "partner"];
  allRoles.forEach((r) => {
    if (r !== role) {
      localStorage.removeItem(`${r}User`);
    }
  });

  localStorage.setItem(`${role}User`, JSON.stringify(user));
  if (user && user.id) {
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("userRole", role);
    localStorage.setItem("userData", JSON.stringify(user));
    document.cookie = `session_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
  }
};

// Clear all authentication session data completely
export const clearAuthSession = () => {
  if (typeof window === "undefined") return;

  const preservedTheme = localStorage.getItem("theme");
  try {
    localStorage.clear();
    if (preservedTheme) {
      localStorage.setItem("theme", preservedTheme);
    }
  } catch (e) {}

  try {
    sessionStorage.clear();
  } catch (e) {}

  // Expire all auth cookies across paths and root domain
  const cookiesToClear = [
    "session_id",
    "token",
    "authToken",
    "sb-access-token",
    "sb-refresh-token",
    "lab_catalog_consent",
  ];

  cookiesToClear.forEach((name) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    try {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}; SameSite=Lax`;
    } catch (_) {}
  });

  // Call server-side logout route with keepalive so server clears cookies too
  try {
    fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => {});
  } catch (e) {}

  try {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("userProfileUpdated"));
    window.dispatchEvent(new CustomEvent("adminProfileUpdated"));
  } catch (e) {}
};

// Complete Logout with hard page reload to clear in-memory state
export const logoutUser = (role, redirectTo) => {
  if (typeof window === "undefined") return;
  clearAuthSession();

  let target = redirectTo;
  if (!target) {
    if (role === "admin") target = "/admin/login";
    else if (role === "chemist") target = "/chemist/login";
    else if (role === "lab") target = "/lab/login";
    else if (role === "doctor") target = "/doctor/login";
    else if (role === "staff") target = "/staff/login";
    else if (role === "partner") target = "/partner/login";
    else target = "/";
  }

  window.location.replace(target);
};
