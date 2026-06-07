import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://mikrogent.com";
const OG_TITLE = "MikroGent";
const OG_DESC = "AI Agent yang Kelola Mikrotik Kamu";
const OG_IMAGE = "/agent-logo.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: OG_TITLE,
  description: OG_DESC,
  applicationName: "MikroGent",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MikroGent",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESC,
    url: SITE_URL,
    siteName: OG_TITLE,
    images: [{ url: OG_IMAGE, width: 640, height: 640, alt: OG_TITLE }],
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary",
    title: OG_TITLE,
    description: OG_DESC,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
