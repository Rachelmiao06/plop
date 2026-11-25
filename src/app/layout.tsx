import type { Metadata, Viewport } from "next";
import { Gaegu, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

// Headings: round handwritten. Small text: clean rounded sans.
const gaegu = Gaegu({
  variable: "--font-gaegu",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Icons (favicon.ico, icon.png, apple-icon.png) and the share card (opengraph-image.png) are files next to this
// layout; Next.js adds their tags. Previews on Vercel point the share card at their own address automatically.
const description = "Paper bowling on snow: pull a snowman back, roll a snowball bigger, let go. Plop!";

export const metadata: Metadata = {
  metadataBase: new URL("https://plop-two.vercel.app"),
  title: "Plop!",
  description,
  applicationName: "Plop!",
  openGraph: { title: "Plop!", description, type: "website", siteName: "Plop!" },
  twitter: { card: "summary_large_image", title: "Plop!", description },
};

// --paper from globals.css (meta tags cannot read CSS variables).
export const viewport: Viewport = { themeColor: "#fffdf8" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${gaegu.variable} ${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
