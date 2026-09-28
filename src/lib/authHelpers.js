
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
  localStorage.setItem(`${role}User`, JSON.stringify(user));
  if (user && user.id) {
    document.cookie = `session_id=${user.id}; path=/; max-age=86400; SameSite=Lax`;
  }
};

// Logout
export const logoutUser = (role) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${role}User`);
  document.cookie = "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  window.location.href = `/${role}/login`;
};
