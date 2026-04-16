export const metadata = {
  title: 'Üye Takip Sistemi',
  description: 'AK Parti Başakşehir BİT Komisyonu - Tutanak Takip Sistemi',
  manifest: '/manifest.json',
  themeColor: '#1A2942',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Üye Takip',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
