import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'everloved',
  description: 'A companion for those we cherish',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
