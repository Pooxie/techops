import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "TechOps",
  description: "GMAO pour hôtels haut de gamme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${dmSerifDisplay.variable} h-full`}>
      <body
        className="h-full antialiased"
        style={{
          backgroundColor: "#F5F5F7",
          color: "#1D1D1F",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
