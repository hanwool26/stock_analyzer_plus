import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Asset Manager",
  description: "뉴스 기반 AI 주식 분석 + 자산 포트폴리오 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <Nav />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
          본 서비스의 추천 정보는 자동 생성된 참고 자료이며 투자 권유가 아닙니다. 최종 투자 판단과 책임은 본인에게 있습니다.
        </footer>
      </body>
    </html>
  );
}
