import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { meta } from "@/lib/data";
import { NavList } from "@/components/nav";

export const metadata: Metadata = {
  title: "PriceTruth — where is your everyday product really cheapest?",
  description:
    "Compare exact branded products across Dutch supermarkets, drugstores and discounters: shelf price, promotion, member price, price per unit and how fresh the data is. MVP.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-base font-black text-white">€</span>
              <span className="text-base font-bold tracking-tight sm:text-lg">PriceTruth</span>
              <span className="hidden rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 sm:inline">MVP · data {meta.built_at.slice(8, 10)} Aug 2026</span>
            </Link>
            <nav className="flex items-center gap-0.5 whitespace-nowrap text-xs sm:gap-1 sm:text-sm">
              <Link href="/" className="rounded px-1.5 py-1 hover:bg-slate-100 sm:px-2">Search</Link>
              <NavList />
              <Link href="/scout" className="rounded px-1.5 py-1 hover:bg-slate-100 sm:px-2">Scout</Link>
              <Link href="/data" className="rounded px-1.5 py-1 hover:bg-slate-100 sm:px-2">Data</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-xs text-slate-500">
          <p>
            PriceTruth is an independent MVP and is not affiliated with any retailer. Prices are chain-level observations (online, flyer or scout) with date and confidence;
            the price in your local store may differ. Sources and method: <Link href="/data" className="underline">Data</Link>.
          </p>
        </footer>
      </body>
    </html>
  );
}
