import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Specter | Synthetic User Testing',
  description: 'Deploy autonomous synthetic users to test your web applications.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined, // You can add dark theme here if you want
        variables: { colorPrimary: '#6366f1' }
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-[#0f1117] antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
