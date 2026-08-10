export const metadata = {
  title: "Chemist Login",
  icons: {
    icon: "/real-logo.png",
    shortcut: "/real-logo.png",
    apple: "/real-logo.png",
  },
};

export default function ChemistLoginLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center  dark:bg-gray-900">
      {children}
    </div>
  );
}