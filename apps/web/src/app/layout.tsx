export const metadata = {
  title: 'HR Tool',
  description: 'Internal HR tool — chấm công & nghỉ phép',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f6f7' }}>
        {children}
      </body>
    </html>
  );
}
