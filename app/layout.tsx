import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

// Platform brand at the root (marketing surface); the portal group layouts
// override with the tenant's identity — LPS Athletic on demo hosts.
export const metadata: Metadata = {
  // Plain string (no template) so the portal group layouts' titles aren't
  // suffixed — they carry the workspace identity untouched.
  title: "POWA Coach — Athlete Operating System",
  description:
    "The white-label operating system for athlete-development businesses — individualized programming, frequency-aware booking, billing, Safe-Sport messaging, and the coach huddle brief under your own brand.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${archivo.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved accent before paint (red is the no-attribute default). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('aos-accent')==='volt')document.documentElement.setAttribute('data-accent','volt')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased scrollbar-slim">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
