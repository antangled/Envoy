import type { Metadata } from "next";
import { Brygada_1918, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { StatusProvider } from "@/components/status";
import { Shell } from "@/components/shell";
import { THEME_SCRIPT } from "@/components/ThemeToggle";

// Brygada 1918: a revived 1918 book face with letterhead formality, for display type and the letter itself.
// Schibsted Grotesk: a crisp newspaper grotesk for every interface label, control, and table.
const serif = Brygada_1918({ subsets: ["latin"], variable: "--font-display", style: ["normal", "italic"], weight: ["400", "500", "600", "700"] });
const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-ui", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Envoy",
  description: "Find the right organizations, understand why they fit, and send a sourced, personal email from your own Gmail.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <StatusProvider>
          <Shell>{children}</Shell>
        </StatusProvider>
      </body>
    </html>
  );
}
