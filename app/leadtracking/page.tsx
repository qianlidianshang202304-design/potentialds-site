import React from 'react';
import type { Metadata } from 'next';
import { Download, Zap, Database, Layout } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Leadtracking - PotentialDS',
  description: '低成本达人线索采集工具。',
};

export default function LeadtrackingPage() {
  return (
    <div className="bg-white">
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-32 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Affordable Lead SaaS</p>
        <h1 className="mb-6 text-5xl font-bold tracking-tighter md:text-7xl">
          线索采集，<span className="text-blue-600">不该只属于大团队。</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl leading-8 text-gray-500">
          Leadtracking 帮助中小团队降低数据采集和线索整理门槛，用更低成本搭建自己的达人建联流程。
        </p>

        <a href="/leadtracking-v1.0.zip" download className="group relative inline-flex items-center gap-3 rounded-full bg-blue-600 px-10 py-4 text-lg font-medium text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700">
          <Download size={20} />
          <span>下载插件 (.zip)</span>
        </a>
        <p className="mt-3 text-xs text-gray-400">适用于 Chrome / Edge (需开发者模式)</p>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Zap, title: '低门槛上手', desc: '减少重复复制和手动整理，让个人和小团队也能开始做线索管理。' },
              { icon: Database, title: '沉淀数据资产', desc: '把零散线索整理成可跟进的数据，方便后续分配、复盘和协作。' },
              { icon: Layout, title: '服务真实流程', desc: '围绕达人 BD、选品、运营每天会用到的工作场景持续优化。' },
            ].map((item, i) => (
              <div key={i} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <item.icon className="mb-4 text-blue-600" size={32} />
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-6 text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
