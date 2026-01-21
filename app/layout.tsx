import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
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
            
            {/* 1. Logo / Home (模拟 Apple 图标位) */}
            <Link href="/" className="hover:opacity-60 transition-opacity p-2">
              <span className="font-semibold text-black text-sm tracking-tight">PotentialDS</span>
            </Link>

            {/* 中间菜单区 (Desktop) */}
            <nav className="hidden md:flex items-center justify-between w-full max-w-lg mx-auto">
              {/* 软件 1 */}
              <Link href="/leadtracking" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-4 py-2">
                Leadtracking
              </Link>
              
              {/* 软件 2 */}
              <Link href="/tt-insight" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-4 py-2">
                TT透视眼
              </Link>
<<<<<<< HEAD

              {/* 软件 3 (新增) */}
              <Link href="/pdf-pro" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-4 py-2">
                PDF转doc排版助手
              </Link>
=======
>>>>>>> b6eb0d7f3ce41fcd88fce7340587a1339aac478f
              
              {/* 其他链接 */}
              <a href="/#contact" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-4 py-2">
                联系客服
              </a>
              <a href="/#download" className="hover:text-black hover:opacity-100 opacity-80 transition-all px-4 py-2">
                下载中心
              </a>
            </nav>

            {/* 右侧搜索/功能区 (模拟 Apple 右侧图标) */}
            <div className="flex items-center gap-4">
               {/* 这里可以放一个小搜索图标，或者只是占位 */}
               <Link href="/#contact" className="hover:opacity-60 transition-opacity">
                 <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full">Support</span>
               </Link>
            </div>

          </div>
        </header>

        {/* --- 页面主体 (加 padding-top 防止被导航栏挡住) --- */}
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
                 {/* 请确保 public 文件夹里有 wechat-qr.png */}
                 <div className="w-16 h-16 bg-gray-100 relative">
                    <Image 
                      src="/wechat-qr.png" 
                      alt="WeChat" 
                      width={64} 
                      height={64} 
                      className="object-cover"
                    />
                 </div>
                 <div>
<<<<<<< HEAD
                   <p className="text-black font-medium">Huiyangtt1999</p>
=======
                   <p className="text-black font-medium">  </p>
>>>>>>> b6eb0d7f3ce41fcd88fce7340587a1339aac478f
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