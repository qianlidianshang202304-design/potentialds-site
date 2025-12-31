import React from 'react';
import type { Metadata } from 'next';
import { Download, Eye, TrendingUp, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TT透视眼 - PotentialDS',
  description: 'TikTok GMV analytics tool.',
};

export default function TTInsightPage() {
  return (
    <div className="bg-white">
      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">
          洞察真相，<span className="text-purple-600">驱动爆款。</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          TikTok GMV 实时查询。掌握竞品动向，发现下一个增长点。
        </p>
        
        <a href="/tt-insight-v1.0.zip" download className="group relative inline-flex items-center gap-3 bg-purple-600 text-white px-10 py-4 rounded-full text-lg font-medium hover:bg-purple-700 transition-all shadow-xl shadow-purple-200">
            <Download size={20} />
            <span>下载 TT透视眼 (.zip)</span>
        </a>
        <p className="text-xs text-gray-400 mt-3">适用于 Chrome / Edge (需开发者模式)</p>
      </section>

       {/* 功能特点 */}
       <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
                {icon: Eye, title:"GMV 透视", desc:"一键查看视频/直播间的预估销售额。"},
                {icon: TrendingUp, title:"趋势分析", desc:"追踪热门商品与达人数据走势。"},
                {icon: Lock, title:"隐私安全", desc:"所有查询在本地完成，数据不泄露。"}
            ].map((item,i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <item.icon className="text-purple-600 mb-4" size={32} />
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