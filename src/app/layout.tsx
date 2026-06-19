import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { M_PLUS_1_Code } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const mPlus1Code = M_PLUS_1_Code({
  variable: "--font-mplus1code-base",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_NAME,
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body className={`${mPlus1Code.variable} font-mplus1code antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
