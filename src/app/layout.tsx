import type { Metadata } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Content Factory — Studio de Transformation",
  description:
    "An editorial synthesis engine for turning raw intellectual property into precision communication artifacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${playfair.variable} ${inter.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-[#0a0a0c] text-[#f7f7f5] font-sans antialiased selection:bg-[#f7f7f5] selection:text-[#0a0a0c]">
        {children}
      </body>
    </html>
  );
}