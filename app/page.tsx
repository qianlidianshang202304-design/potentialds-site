import React from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Eye, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* --- 产品一：Leadtracking (全屏入口) --- */}
      <section className="sticky top-0 h-screen flex items-center justify-center bg-black text-white overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="mb-6">
                <Database size={48} className="mx-auto text-blue-400 mb-4" />
                <h2 className="text-sm font-bold tracking-[0.2em] text-blue-400 uppercase">Product 01</h2>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tighter">
            Leadtracking.
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            释放数据潜能。一键采集，无缝同步。<br/>让信息流动起来。
            </p>
            <Link href="/leadtracking">
                <button className="group bg-white text-black px-10 py-4 rounded-full text-lg font-medium hover:bg-blue-50 transition-all flex items-center gap-2 mx-auto">
                    进一步了解
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </Link>
        </div>
        {/* 背景装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
      </section>

       {/* --- 产品二：TT透视眼 (全屏入口) --- */}
       <section className="sticky top-0 h-screen flex items-center justify-center bg-white text-black overflow-hidden border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="mb-6">
                <Eye size={48} className="mx-auto text-purple-600 mb-4" />
                <h2 className="text-sm font-bold tracking-[0.2em] text-purple-600 uppercase">Product 02</h2>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tighter">
            TT透视眼.
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            洞察 TikTok GMV 真相。<br/>精准数据，驱动爆款决策。
            </p>
            <Link href="/tt-insight">
                <button className="group bg-black text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-gray-900 transition-all flex items-center gap-2 mx-auto">
                    探索功能
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </Link>
        </div>
        {/* 背景装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
      </section>

      {/* --- 产品三：PDF排版助手 (全屏入口) --- */}
       <section className="sticky top-0 h-screen flex items-center justify-center bg-zinc-900 text-white overflow-hidden border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="mb-6">
                <FileText size={48} className="mx-auto text-orange-500 mb-4" />
                <h2 className="text-sm font-bold tracking-[0.2em] text-orange-500 uppercase">Product 03</h2>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tighter">
            PDF 排版助手.
            </h1>
            <p className="text-xl md:text-2xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            文档杂乱无章？<br/>AI 智能重构，阅读体验升级。
            </p>
            <Link href="/pdf-pro">
                <button className="group bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-orange-700 transition-all flex items-center gap-2 mx-auto">
                    免费下载
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </Link>
        </div>
        {/* 背景装饰 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      </section>

    </div>
  );
}
