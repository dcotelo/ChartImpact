import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chart Impact',
  description: 'Compare differences between two Helm chart versions',
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

