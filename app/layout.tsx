import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'
import { LanguageProvider } from '@/lib/i18n/context'
import { Toaster } from '@/components/ui/toaster'
import { RealtimeAlerts } from '@/components/realtime-alerts'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <LanguageProvider>
            {children}
            <RealtimeAlerts />
            <Toaster />
            <Analytics />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
