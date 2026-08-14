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
      note: '先体验，先验证',
      features: [
        '基础功能访问',
        '每月浏览额度：2,000',
        '每日导出额度：1次',
        '每月导出额度：1次',
        '数据导出：CSV格式',
      ],
      isPopular: false,
    },
    {
      title: '付费版',
      price: '¥100',
      period: '每月',
      note: '适合日常使用',
      features: [
        '全部功能访问',
        '每月浏览额度：20,000',
        '每日导出额度：10次',
        '每月导出额度：300次',
        '数据导出：CSV格式',
      ],
      isPopular: true,
    },
    {
      title: '按年付费',
      price: '¥1000',
      period: '每年',
      note: '适合长期团队',
      originalPrice: '¥1200',
      features: [
        '全部功能访问',
        '每月浏览额度：20,000',
        '每日导出额度：无限制',
        '每月导出额度：无限制',
        '数据导出：CSV格式',
        '额外 2 个月免费',
      ],
      isPopular: false,
    },
  ];

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">定价方案</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">
            我们的目标是打破信息差，做大家都用得起的 SaaS 服务软件。先免费体验，确认适合后再升级额度。
          </p>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            免费版保留真实可用额度；付费版控制在中小团队能接受的成本内；年付版适合长期做达人建联、选品和数据跟进的团队。
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`flex flex-col rounded-2xl border p-6 ${selectedPlan === index || (selectedPlan === null && plan.isPopular) ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{plan.note}</p>
                  </div>
                  {plan.isPopular ? <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white">推荐</span> : null}
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-zinc-500">{plan.period}</span>
                </div>
                {plan.originalPrice && (
                  <p className="mt-1 text-xs text-zinc-500 line-through">原价: {plan.originalPrice}</p>
                )}
                <ul className="mt-6 flex-grow space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] text-green-600">
                        ✓
                      </span>
                      <span className="text-sm text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-8 w-full rounded-lg px-4 py-2 text-sm font-medium transition ${selectedPlan === index ? 'bg-blue-600 text-white hover:bg-blue-700' : plan.isPopular ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-zinc-300 bg-white text-zinc-700 hover:border-slate-900 hover:text-slate-900'}`}
                  onClick={() => setSelectedPlan(index)}
                >
                  {selectedPlan === index ? '已选择' : '选择方案'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              免费注册体验
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              微信咨询开通
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              返回首页
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
