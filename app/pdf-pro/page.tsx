import React from 'react';
import type { Metadata } from 'next';
import { Download, FileText, Layers, Wand2, ExternalLink, KeyRound } from 'lucide-react';

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
        <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
          告别繁琐的手动调整。智能识别段落、自动优化布局，让你的 PDF 文档焕然一新。
        </p>
        
        {/* --- 百度网盘下载卡片 (新增部分) --- */}
        <div className="bg-orange-50 border border-orange-100 p-6 md:p-8 rounded-3xl max-w-md mx-auto shadow-xl shadow-orange-100/50 text-left">
            <div className="flex items-center gap-2 mb-4 justify-center">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-xs text-orange-800 font-bold uppercase tracking-wider">官方高速下载通道</p>
            </div>
            
            <div className="flex flex-col gap-4">
                {/* 提取码展示区 */}
                <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-orange-200 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                        <KeyRound size={18} />
                        <span className="text-sm font-medium">提取码</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* select-all 属性让用户点击就能全选复制 */}
                        <code className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg font-mono font-bold text-xl select-all cursor-text border border-orange-200">
                            vv24
                        </code>
                    </div>
                </div>

                {/* 跳转按钮 */}
                <a 
                    href="https://pan.baidu.com/s/1m8THrswbWMjhv_0lK-VFng?pwd=vv24" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center gap-2 bg-orange-600 text-white w-full py-4 rounded-xl text-lg font-bold hover:bg-orange-700 transition-all shadow-md active:scale-[0.98]"
                >
                    <Download size={20} />
                    <span>前往百度网盘</span>
                    <ExternalLink size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                </a>
            </div>
            <p className="text-[10px] text-orange-400 mt-4 text-center">
                *文件较大，已托管至云端 | 仅支持 Windows 10/11
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