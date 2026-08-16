import type { Metadata } from 'next';
import { Download, Eye, TrendingUp, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TT透视眼 - PotentialDS',
  description: '低门槛 TikTok 达人和商品趋势分析工具。',
};

export default function TTInsightPage() {
  return (
    <div className="bg-white">
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-32 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-purple-600">Affordable TikTok Insight</p>
        <h1 className="mb-6 text-5xl font-bold tracking-tighter md:text-7xl">
          看懂趋势，<span className="text-purple-600">先打破信息差。</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-xl leading-8 text-gray-500">
          TT透视眼希望把 TikTok 内容和商品判断工具做得更轻、更便宜，让更多小团队也能参与数据化选品和达人合作。
        </p>

        <a href="/tt-insight-v1.0.zip" download className="group relative inline-flex items-center gap-3 rounded-full bg-purple-600 px-10 py-4 text-lg font-medium text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-700">
          <Download size={20} />
          <span>下载 TT透视眼 (.zip)</span>
        </a>
        <p className="mt-3 text-xs text-gray-400">适用于 Chrome / Edge (需开发者模式)</p>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Eye, title: '降低判断门槛', desc: '让更多团队用数据辅助判断达人、内容和商品机会。' },
              { icon: TrendingUp, title: '发现趋势线索', desc: '围绕热门内容和商品表现，快速形成候选方向。' },
              { icon: Lock, title: '轻量本地使用', desc: '用简单工具解决实际问题，不把基础能力做成高价门槛。' },
            ].map((item, i) => (
              <div key={i} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <item.icon className="mb-4 text-purple-600" size={32} />
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
