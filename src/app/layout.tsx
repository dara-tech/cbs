import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { DatabaseGate } from "@/components/DatabaseGate"

export const metadata: Metadata = {
  title: "Case Base Surveillance (CBS)",
  description: "NCHADS — Case Base Surveillance management system",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="km" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Validated Google Fonts: Inter for Latin/Numbers, Kantumruy Pro & Koulen for Khmer */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Kantumruy+Pro:ital,wght@0,300..700;1,300..700&family=Koulen&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased font-sans">
        <ThemeProvider>
          <DatabaseGate>{children}</DatabaseGate>
        </ThemeProvider>
      </body>
    </html>
  )
}
