import React from 'react';
import type { Metadata } from 'next';
import { Download, Zap, Database, Layout } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leadtracking - PotentialDS',
  description: 'The ultimate data extraction tool.',
};

export default function LeadtrackingPage() {
  return (
    <div className="bg-white">
      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
          数据采集，<span className="text-blue-600">从未如此优雅。</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          专为独立开发者与营销人打造。一键提取、自动清洗，直接导出至你的数据库。
        </p>
        
        <a href="/leadtracking-v1.0.zip" download className="group relative inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-blue-700 transition-all shadow-xl shadow-blue-200">
            <Download size={20} />
            <span>下载插件 (.zip)</span>
        </a>
        <p className="text-xs text-gray-400 mt-3">适用于 Chrome / Edge (需开发者模式)</p>
      </section>

      {/* 功能特点 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
                {icon: Zap, title:"极速采集", desc:"毫秒级响应，不卡顿浏览体验。"},
                {icon: Database, title:"直连数据库", desc:"原生支持 Supabase，数据直接入库。"},
                {icon: Layout, title:"可视化清洗", desc:"自动格式化字段，所见即所得。"}
            ].map((item,i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <item.icon className="text-blue-600 mb-4" size={32} />
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