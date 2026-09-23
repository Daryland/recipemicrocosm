import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TopNav } from "@/components/TopNav";
import { SideMenu } from "@/components/SideMenu";
import { AlphabetRail } from "@/components/AlphabetRail";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  weight: ["400", "500", "600", "700", "800"],
});

// SideMenu (on every page) and the home page read recipes from the database,
// so render on request instead of baking stale data in at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recipe MicroCosm",
  description: "A personal recipe library — just the recipes, no backstory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={schibsted.variable}>
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <SideMenu />
            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <TopNav />
              <main className="flex-1 px-5 py-10 sm:px-8">{children}</main>
            </div>
            <AlphabetRail />
          </div>
        </Providers>
      </body>
    </html>
  );
}
