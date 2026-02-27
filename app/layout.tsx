import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Golf War Room',
  description: 'Event → course → field → props edges (DataGolf-powered)'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
