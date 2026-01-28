import React from 'react';
import type { Metadata } from 'next';
import { Download, Merge, Layers, FileStack } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PDF合并工具 - PotentialDS',
  description: 'Merge multiple PDF files instantly.',
};

export default function PDFMergePage() {
  return (
    <div className="bg-white">
      {/* 独立导航栏 */}
       <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
           <a href="/" className="font-bold tracking-tight text-lg">PotentialDS</a>
           <span className="text-sm font-bold text-rose-600">PDF合并工具</span>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="pt-40 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
          多份文档，<span className="text-rose-600">合而为一。</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          极速合并多个 PDF 文件，支持拖拽排序、自定义页面范围。本地处理，保护您的隐私安全。
        </p>
        
        {/* --- 直接下载按钮 --- */}
        <a 
            href="/pdf-merge-v1.0.zip" 
            download 
            className="group relative inline-flex items-center gap-3 bg-rose-600 text-white px-12 py-5 rounded-full text-lg font-bold hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 active:scale-95"
        >
            <Download size={22} />
            <span>立即下载 (.zip)</span>
        </a>
        <p className="text-xs text-gray-400 mt-4">
            v1.0 | 大小: 11MB | 适用于 Windows
        </p>
      </section>

       {/* 功能特点 */}
       <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
                {icon: Merge, title:"极速合并", desc:"无论是 2 个还是 200 个文件，一秒完成拼接。"},
                {icon: Layers, title:"自由排序", desc:"可视化界面，鼠标拖拽即可调整文件顺序。"},
                {icon: FileStack, title:"无损画质", desc:"保持原文档清晰度，不压缩、不模糊。"}
            ].map((item,i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-rose-100">
                    <item.icon className="text-rose-600 mb-4" size={32} />
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}