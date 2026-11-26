import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: { default: "منصة الرياضيات التفاعلية – مدارس الطالب الذكي الخاصة", template: "%s | منصة الرياضيات التفاعلية" },
  description: "منصة الرياضيات التفاعلية للصف العاشر – مدارس الطالب الذكي الخاصة، محافظة مسقط. إعداد الأستاذ محمد عبد الحافظ. دروس ومختبرات واختبارات وألعاب للفصل الدراسي الأول.",
  applicationName: "رياضيات العاشر",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "رياضيات العاشر", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1d63c9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
