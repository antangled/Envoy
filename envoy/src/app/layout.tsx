import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";
import { StatusProvider } from "@/components/status";
import { Shell } from "@/components/shell";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"], weight: ["400", "500", "600"] });
const sans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Envoy",
  description: "Find the right organizations, understand why they fit, and send a sourced, personal email from your own Gmail.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <StatusProvider>
          <Shell>{children}</Shell>
        </StatusProvider>
      </body>
    </html>
  );
}
