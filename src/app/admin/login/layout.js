export const metadata = {
  title: "Admin Login",
  icons: {
    icon: "/real-logo.png",
    shortcut: "/real-logo.png",
    apple: "/real-logo.png",
  },
};

export default function AdminLoginLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      {children}
    </div>
  );
}