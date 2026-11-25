/** @type {import('next').NextConfig} */
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig = isStatic
  ? {
      // النسخة المبسّطة للطلاب: موقع ثابت يُرفع على أي استضافة دون خادم
      output: "export",
      images: { unoptimized: true },
      reactStrictMode: true,
      env: { NEXT_PUBLIC_STATIC: "1" },
    }
  : {
      reactStrictMode: true,
      poweredByHeader: false,
      async headers() {
        return [
          {
            source: "/sw.js",
            headers: [
              { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
              { key: "Service-Worker-Allowed", value: "/" },
            ],
          },
        ];
      },
    };
export default nextConfig;
