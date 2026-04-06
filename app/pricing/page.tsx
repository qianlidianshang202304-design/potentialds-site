'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  
  const plans = [
    {
      title: '免费版',
      price: '¥0',
      period: '永久',
      features: [
        '基础功能访问',
        '每月浏览额度：2,000',
        '每日导出额度：1次',
        '每月导出额度：1次',
        '数据导出：CSV格式'
      ],
      isPopular: false
    },
    {
      title: '付费版',
      price: '¥100',
      period: '每月',
      features: [
        '全部功能访问',
        '每月浏览额度：20,000',
        '每日导出额度：10次',
        '每月导出额度：300次',
        '数据导出：CSV格式'
      ],
      isPopular: true
    },
    {
      title: '按年付费',
      price: '¥1000',
      period: '每年',
      originalPrice: '¥1200',
      features: [
        '全部功能访问',
        '每月浏览额度：20,000',
        '每日导出额度：无限制',
        '每月导出额度：无限制',
        '数据导出：CSV格式',
        '额外 2 个月免费'
      ],
      isPopular: false
    }
  ];

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">定价方案</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">
            选择最适合您的方案，享受更多功能和服务。
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl border p-6 flex flex-col ${selectedPlan === index || (selectedPlan === null && plan.isPopular) ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 bg-white'}`}
              >
                <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <p className="mt-1 text-xs text-zinc-500 line-through">原价: {plan.originalPrice}</p>
                )}
                <ul className="mt-6 space-y-3 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <span className="text-sm text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  className={`mt-8 w-full rounded-lg px-4 py-2 text-sm font-medium transition ${selectedPlan === index ? 'bg-blue-600 text-white hover:bg-blue-700' : plan.isPopular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-zinc-300 bg-white text-zinc-700 hover:border-slate-900 hover:text-slate-900'}`} 
                  onClick={() => setSelectedPlan(index)}
                  onMouseEnter={(e) => e.currentTarget.classList.add('scale-105')} 
                  onMouseLeave={(e) => e.currentTarget.classList.remove('scale-105')}
                >
                  {selectedPlan === index ? '已选择' : '选择方案'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              返回首页
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
