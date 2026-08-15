import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import HeaderUserStatus from '../components/HeaderUserStatus';
import MobileNav from '../components/MobileNav';
import NavLink from '../components/NavLink';
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
      <body
        className="min-h-screen text-black antialiased selection:bg-blue-100 selection:text-blue-900"
        style={{
          backgroundImage: `url(/images/site-bg.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* 全局叠加细点十字底纹（让涂鸦背景之上再加一层细腻纹理） */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
          }}
        />
        <TrafficTracker />

        {/* --- 🍎 Apple 风格全局导航栏 --- */}
        <header className="fixed top-0 w-full z-[100] bg-[#fbfbfd]/75 backdrop-blur-xl border-b border-white/40 transition-all duration-300">
          <div className="max-w-[1024px] mx-auto px-4 h-11 flex items-center justify-between text-[12px] font-normal text-gray-700">

            {/* 1. Logo / Home */}
            <Link href="/" className="hover:opacity-60 transition-opacity p-2">
              <span className="font-semibold text-black text-sm tracking-tight">PotentialDS</span>
            </Link>

            {/* 中间菜单区 (Desktop) */}
            <nav className="hidden md:flex items-center justify-center gap-8 w-full max-w-md mx-auto h-full">
              <NavLink href="/my-creators">我的达人</NavLink>
              <NavLink href="/crm">CRM</NavLink>
              <NavLink href="/email/tasks" activeVariant="pill">发信任务</NavLink>
            </nav>

            {/* 右侧搜索/功能区 */}
            <div className="flex items-center gap-4">
              <MobileNav />
              <HeaderUserStatus />
            </div>

          </div>
        </header>

        {/* --- 页面主体 --- */}
        <main className="pt-11 min-h-screen relative z-10">
          {children}
        </main>

        {/* --- 全局 Footer --- */}
        <footer className="relative z-10 bg-white/70 backdrop-blur-xl py-16 text-[12px] text-gray-600" id="contact">
          <div className="max-w-[1024px] mx-auto px-6 border-t border-white/40 pt-8">
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
