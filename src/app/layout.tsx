import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import AuthGate from '@/components/AuthGate';

export const metadata: Metadata = {
  title: 'Adranna Spa CRM Clínico',
  description: 'CRM Clínico especializado en Podología y Terapias de Masaje con Ficha y Agenda',
  manifest: '/manifest.json',
  icons: { icon: '/brand/logo.jpg', apple: '/brand/logo.jpg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Adranna Spa',
  },
};

export const viewport: Viewport = {
  themeColor: '#6F3612',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Noto+Serif:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-sans text-on-surface flex flex-col min-h-screen">
        <AuthProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </AuthProvider>

        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Adranna PWA ServiceWorker registrado con éxito');
                    },
                    function(err) {
                      console.log('Error al registrar ServiceWorker:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
