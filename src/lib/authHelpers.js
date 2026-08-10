
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
  return JSON.parse(localStorage.getItem(`${role}User`));
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
