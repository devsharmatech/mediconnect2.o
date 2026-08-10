export const setTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
};

export const getTheme = () => localStorage.getItem("theme") || "light";
