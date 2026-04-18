import type { Metadata } from 'next'
import { Inter, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  variable: '--font-barlow',
  weight: ['500', '700', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Sports Day Tournament',
    template: '%s | Sports Day Tournament',
  },
  description: 'Live scores, brackets, standings and results for the Sports Day Futsal and Badminton tournaments.',
  keywords: ['futsal', 'badminton', 'tournament', 'live scores', 'sports day'],
  openGraph: {
    title: 'Sports Day Tournament',
    description: 'Live tournament scores and brackets',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${barlowCondensed.variable} antialiased min-h-screen bg-background`}>
        {children}
      </body>
    </html>
  )
}
