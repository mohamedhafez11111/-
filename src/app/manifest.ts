import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "منصة الرياضيات التفاعلية – مدارس الطالب الذكي الخاصة",
    short_name: "رياضيات العاشر",
    description: "دروس ومختبرات واختبارات وألعاب ومعلم ذكي لرياضيات الصف العاشر – سلطنة عُمان – الفصل الأول",
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    orientation: "any",
    background_color: "#f6f8fb",
    theme_color: "#1d63c9",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
