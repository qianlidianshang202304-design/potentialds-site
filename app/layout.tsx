import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react'; // 👈 记得引入这个图标
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-white text-black antialiased selection:bg-blue-100 selection:text-blue-900`}>
        
        {/* --- 🍎 Apple 风格全局导航栏 --- */}
        <header className="fixed top-0 w-full z-[100] bg-[#fbfbfd]/80 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
          <div className="max-w-[1024px] mx-auto px-4 h-11 flex items-center justify-between text-[12px] font-normal text-gray-700">
            
            {/* 1. Logo / Home */}
            <Link href="/" className="hover:opacity-60 transition-opacity p-2">
              <span className="font-semibold text-black text-sm tracking-tight">PotentialDS</span>
            </Link>

            {/* 中间菜单区 (Desktop) */}
            <nav className="hidden md:flex items-center justify-center gap-6 w-full max-w-lg mx-auto h-full">
              
              {/* --- ✨ 下拉菜单开始：产品系列 ✨ --- */}
              <div className="relative group h-full flex items-center">
                <button className="flex items-center gap-1 hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1 outline-none">
                  产品系列
                  <ChevronDown size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* 下拉面板 (悬停显示) */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-out transform group-hover:translate-y-0 translate-y-2">
                    <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-xl shadow-xl p-1.5 w-40 flex flex-col gap-0.5 ring-1 ring-black/5">
                         {/* 软件 1 */}
                         <Link href="/leadtracking" className="block px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-black text-[12px] transition-colors">
                            Leadtracking
                         </Link>
                         {/* 软件 2 */}
                         <Link href="/tt-insight" className="block px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-black text-[12px] transition-colors">
                            TT透视眼
                         </Link>
                         {/* 软件 3 */}
                         <Link href="/pdf-pro" className="block px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-black text-[12px] transition-colors">
                            PDF排版助手
                         </Link>
                         {/* 软件 4 */}
                         <Link href="/pdf-merge" className="block px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-700 hover:text-black text-[12px] transition-colors">
                            PDF合并工具
                         </Link>
                    </div>
                </div>
              </div>
              {/* --- 下拉菜单结束 --- */}
              
              {/* 其他固定链接 */}
              <a href="/#contact" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1">
                联系客服
              </a>
              <a href="/#download" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-2 py-1">
                下载中心
              </a>
            </nav>

            {/* 右侧搜索/功能区 */}
            <div className="flex items-center gap-4">
               <Link href="/#contact" className="hover:opacity-60 transition-opacity">
                 <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">Support</span>
               </Link>
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
                  <a href="#">隐私政策</a>
                  <a href="#">使用条款</a>
                  <a href="#">销售政策</a>
                </div>
              </div>

              {/* 右侧：二维码卡片 */}
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 <div className="w-16 h-16 bg-gray-100 relative">
                    {/* 确保你的 public 文件夹里有 wechat-qr.png */}
                    <Image 
                      src="/wechat-qr.png" 
                      alt="WeChat" 
                      width={64} 
                      height={64} 
                      className="object-cover"
                    />
                 </div>
                 <div>
                   <p className="text-black font-medium">Huiyangtt1999</p>
                   <p className="text-[10px]">微信扫码咨询</p>
                 </div>
              </div>

            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}