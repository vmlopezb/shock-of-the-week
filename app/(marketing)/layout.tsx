import { Inter, Manrope } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-manrope",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${manrope.variable}`}>{children}</div>;
}
