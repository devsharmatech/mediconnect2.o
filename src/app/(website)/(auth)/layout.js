import dynamic from 'next/dynamic';

const Navbar = dynamic(
  () => import('@/components/public-site/layout/Navbar'),
  { ssr: true }
);

export const metadata = {
  title: "mediconnect.fit - Authentication",
  description: "Sign in or create an account",
  icons: {
    icon: "/real-logo.png",
    shortcut: "/real-logo.png",
    apple: "/real-logo.png",
  },
};

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
