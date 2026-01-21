import React from 'react';
import type { Metadata } from 'next';
import { Download, FileText, Layers, Wand2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PDF智能排版助手 Pro - PotentialDS',
  description: 'Intelligent PDF layout assistant.',
};

export default function PDFProPage() {
  return (
    <div className="bg-white">
      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
          文档排版，<span className="text-orange-600">一键重生。</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          告别繁琐的手动调整。智能识别段落、自动优化布局，让你的 PDF 文档焕然一新。
        </p>
        
        <a href="/pdf-pro-v1.0.zip" download className="group relative inline-flex items-center gap-3 bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-orange-700 transition-all shadow-xl shadow-orange-200">
            <Download size={20} />
            <span>下载专业版 (.zip)</span>
        </a>
        <p className="text-xs text-gray-400 mt-3">支持 Windows 10/11</p>
      </section>

       {/* 功能特点 */}
       <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
                {icon: Wand2, title:"智能重排", desc:"自动识别标题与正文，一键美化排版。"},
                {icon: Layers, title:"批量处理", desc:"同时导入上百个文档，后台静默完成。"},
                {icon: FileText, title:"格式保留", desc:"完美保留原文档的表格与图片位置。"}
            ].map((item,i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <item.icon className="text-orange-600 mb-4" size={32} />
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