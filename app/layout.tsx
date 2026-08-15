import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import HeaderUserStatus from '../components/HeaderUserStatus';
import MobileNav from '../components/MobileNav';
import TrafficTracker from '../components/TrafficTracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'PotentialDS',
  description: 'Unlock Data Potential',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="bg-white text-black antialiased selection:bg-blue-100 selection:text-blue-900">
        <TrafficTracker />
        
        {/* --- 🍎 Apple 风格全局导航栏 --- */}
        <header className="fixed top-0 w-full z-[100] bg-[#fbfbfd]/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
          <div className="max-w-[1024px] mx-auto px-4 h-11 flex items-center justify-between text-[12px] font-normal text-gray-700">
            
            {/* 1. Logo / Home */}
            <Link href="/" className="hover:opacity-60 transition-opacity p-2">
              <span className="font-semibold text-black text-sm tracking-tight">PotentialDS</span>
            </Link>

            {/* 中间菜单区 (Desktop) */}
            <nav className="hidden md:flex items-center justify-center gap-8 w-full max-w-md mx-auto h-full">
              <Link href="/my-creators" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1">
                我的达人
              </Link>
              <Link href="/crm" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1">
                CRM
              </Link>
              <Link href="/email/tasks" className="rounded-full bg-black px-3 py-1.5 text-white shadow-sm transition-all hover:bg-zinc-800">
                发信任务
              </Link>
            </nav>

            {/* 右侧搜索/功能区 */}
            <div className="flex items-center gap-4">
              <MobileNav />
              <HeaderUserStatus />
            </div>

          </div>
        </header>

        {/* --- 页面主体 --- */}
        <main className="pt-11 min-h-screen">
          {children}
        </main>

        {/* --- 全局 Footer --- */}
        <footer className="bg-[#f5f5f7] py-16 text-[12px] text-gray-500" id="contact">
          <div className="max-w-[1024px] mx-auto px-6 border-t border-gray-200 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              
              {/* 左侧 */}
              <div>
                <div className="font-semibold text-black mb-2">Potential Data Solutions</div>
                <p>Copyright © 2024 PotentialDS Inc. All rights reserved.</p>
                <div className="flex gap-4 mt-2 underline">
                  <Link href="/privacy">隐私政策</Link>
                  <Link href="/terms">使用条款</Link>
                  <Link href="/sales">销售政策</Link>
                </div>
              </div>

              <div className="flex w-full justify-start md:w-auto md:justify-end">
                <div className="group relative">
                  <button
                    type="button"
                    aria-label="WeChat QR"
                    className="flex items-center gap-3 rounded-2xl border border-white/45 bg-white/35 px-4 py-3 text-left shadow-[0_16px_36px_-30px_rgba(15,23,42,0.55)] backdrop-blur-md transition hover:bg-white/45"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-200/80 bg-white/80 text-[11px] font-semibold text-zinc-700 shadow-sm">
                      微信
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[12px] font-semibold text-slate-900">微信扫码咨询</p>
                      <p className="text-[10px] text-zinc-500">Hover 查看二维码</p>
                    </div>
                  </button>

                  <div className="pointer-events-none absolute bottom-full right-0 mb-4 translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <div className="pointer-events-auto overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl">
                      <Image src="/images/Wechat.png" alt="WeChat QR" width={240} height={240} className="h-auto w-[240px]" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
