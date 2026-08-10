import "../website-globals.css";

export const metadata = {
  title: "mediconnect.fit Website",
  description: "Public website experience",
  icons: {
    icon: "/real-logo.png",
    shortcut: "/real-logo.png",
    apple: "/real-logo.png",
  },
};

import SafeChatbotWrapper from "@/components/public-site/ui/SafeChatbotWrapper";
import FloatingWhatsApp from "@/components/public-site/ui/FloatingWhatsApp";

export default function RootLayout({ children }) {
  return (
    <div className="website-root min-h-screen">
      {children}
      <SafeChatbotWrapper />
      <FloatingWhatsApp />
    </div>
  );
}
