import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import { Providers } from "./providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClarifyMe - pixelation recovery lab",
  description: "Upload a pixelated screenshot and recover the text behind it with pluggable recovery engines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "var(--color-panel-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
