import "./globals.css";

export const metadata = {
  title: "graMY — платформа турниров и рейтинга",
  description: "Турниры, сетки, счёт и индивидуальный рейтинг для любительского спорта",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="font-body">{children}</body>
    </html>
  );
}
