import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Labor Force Link — CRM",
  description: "Internal operations hub — CRM, tasks, team processes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Inline boot script — applies the saved theme BEFORE first paint to avoid
// a light-flash for dark-mode users. Keep it tiny; it runs synchronously.
const themeBoot = `
(function(){
  try {
    var t = localStorage.getItem('em-theme');
    if (!t) {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    }
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
