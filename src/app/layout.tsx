import type { Metadata } from "next"
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "Painter's Palette",
  description:
    "Drop in a photo and get the colour groups to paint it with — matched to real oil paints, with mixing ratios.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="painters-palette:theme"
          disableTransitionOnChange
        >
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-10">
            <span className="text-sm font-semibold tracking-tight">Painter&apos;s Palette</span>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <main className="p-6 md:p-10">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
