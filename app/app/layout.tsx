import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Asoul一个魂生活日记',
  description: '躺着也能轻松记录的温馨生活日记。',
  applicationName: 'Asoul一个魂生活日记',
  manifest: '/manifest.webmanifest?v=4',
  icons: {
    icon: [
      { url: '/icon-192.png?v=4', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=4', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png?v=4',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '一个魂日记',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fffaf5',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-accent="jiaran" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var a=localStorage.getItem('asoul-diary-theme-hint');if(a==='jiaran'||a==='bella'||a==='nailin')document.documentElement.dataset.accent=a}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
