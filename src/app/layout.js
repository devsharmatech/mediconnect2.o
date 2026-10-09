import "./globals.css";
import { Toaster } from "react-hot-toast";
import Script from "next/script";

export const metadata = {
  title: "Mediconnect.fit - Your Trusted Healthcare Platform",
  description:
    "Your trusted healthcare companion connecting patients, doctors, labs, and chemists seamlessly.",
  icons: {
    icon: "/real-logo.png",
    shortcut: "/real-logo.png",
    apple: "/real-logo.png",
  },
  verification: {
    other: {
      "facebook-domain-verification": "co3uw7usq90ci14nl52zcbodnbn5qu",
    }, 
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ "--font-poppins": "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
          rel="stylesheet"
        />
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5PKM6T29');
          `}
        </Script>
        {/* End Google Tag Manager */}
      </head>
      <body
        suppressHydrationWarning
        className="antialiased"
        style={{ fontFamily: "var(--font-poppins), 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5PKM6T29"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1f2937",
              color: "#fff",
              backdropFilter: "blur(10px)",
            },
          }}
        />
      </body>
    </html>
  );
}
