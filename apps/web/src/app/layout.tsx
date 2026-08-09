import './globals.css';

export const metadata = {
  title: 'HR Tool',
  description: 'Internal HR tool — chấm công & nghỉ phép',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
