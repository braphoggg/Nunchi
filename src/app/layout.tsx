import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-kr",
});

export const metadata: Metadata = {
  title: "Room 203 | Korean with Moon-jo",
  description:
    "Learn Korean with Seo Moon-jo, the dentist from Room 203 at Eden Goshiwon.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${notoSansKR.variable} font-sans bg-goshiwon-bg text-goshiwon-text antialiased`}
        style={{ fontFamily: "var(--font-inter), var(--font-noto-kr), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
