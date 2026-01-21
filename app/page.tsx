import React from 'react';
import type { Metadata } from 'next';
import { Download, FileText, Layers, Wand2, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PDF智能排版助手 Pro - PotentialDS',
  description: 'Intelligent PDF layout assistant.',
};

export default function PDFProPage() {
  return (
    <div className="bg-white">
      {/* 独立导航栏 (保持风格统一) */}
       <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
           <a href="/" className="font-bold tracking-tight text-lg">PotentialDS</a>
           <span className="text-sm font-bold text-orange-600">PDF排版助手 Pro</span>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="pt-40 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
          文档排版，<span className="text-orange-600">一键重生。</span>
        </h1>
        <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
          由于软件体积较大，为了提供更稳定的下载体验，我们已托管至百度高速网盘。
        </p>
        
        {/* --- 百度网盘下载卡片 --- */}
        <div className="bg-orange-50 border border-orange-100 p-8 rounded-3xl max-w-lg mx-auto shadow-lg mb-10">
            <p className="text-sm text-orange-800 font-bold mb-4 uppercase tracking-wider">官方下载通道</p>
            
            <div className="flex flex-col gap-4">
                {/* 提取码提示 */}
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-orange-200">
                    <span className="text-gray-500 text-sm">提取码 / Password</span>
                    <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded font-mono font-bold text-lg select-all">vv24</code>
                        <span className="text-[10px] text-gray-400">(记住这4位)</span>
                    </div>
                </div>

                {/* 跳转按钮 */}
                <a 
                    href="https://pan.baidu.com/s/1m8THrswbWMjhv_0lK-VFng?pwd=vv24" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center gap-2 bg-orange-600 text-white w-full py-4 rounded-xl text-lg font-bold hover:bg-orange-700 transition-all shadow-md active:scale-95"
                >
                    <Download size={20} />
                    <span>前往百度网盘下载</span>
                    <ExternalLink size={16} className="opacity-70" />
                </a>
            </div>
            <p className="text-[10px] text-orange-400 mt-4">
                如果是 Mac 用户请勿下载，当前版本仅支持 Windows
            </p>
        </div>
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