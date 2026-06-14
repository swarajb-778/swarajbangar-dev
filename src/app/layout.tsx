import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { FloatingProvider } from '@/lib/floating-context';
import { SiteChrome } from '@/components/layout/SiteChrome';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://swarajbangar.dev'),
  title: {
    default: 'Swaraj Bangar — AI Engineer',
    template: '%s | Swaraj Bangar',
  },
  description:
    'AI Engineer building production agent systems, distributed backends, and interactive demos. Previously Amazon, currently exploring the frontier of agentic AI.',
  openGraph: {
    title: 'Swaraj Bangar — AI Engineer',
    description:
      'AI Engineer building production agent systems and distributed backends.',
    url: 'https://swarajbangar.dev',
    siteName: 'swarajbangar.dev',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Swaraj Bangar — AI Engineer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swaraj Bangar — AI Engineer',
    description:
      'AI Engineer building production agent systems and distributed backends.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      style={{ backgroundColor: '#0A0A0F' }}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <FloatingProvider>
          <SiteChrome>{children}</SiteChrome>
        </FloatingProvider>
      </body>
    </html>
  );
}
