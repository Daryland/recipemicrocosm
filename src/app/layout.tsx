import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TopNav } from "@/components/TopNav";
import { SideMenu } from "@/components/SideMenu";
import { AlphabetRail } from "@/components/AlphabetRail";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Recipe MicroCosm",
  description: "A personal recipe library — just the recipes, no backstory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <SideMenu />
            <div className="flex min-h-screen flex-1 flex-col">
              <TopNav />
              <main className="flex-1 px-6 py-8">{children}</main>
            </div>
            <AlphabetRail />
          </div>
        </Providers>
      </body>
    </html>
  );
}
