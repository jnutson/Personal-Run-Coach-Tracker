import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { branding } from "@/config/user";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: branding.appName,
  description: branding.appDescription,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${nunito.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
