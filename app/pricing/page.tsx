import Link from 'next/link';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto max-w-4xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_50px_-36px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">定价说明</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">
            当前基础版统一定价为 <span className="font-semibold text-slate-900">100 人民币 / 月</span>。
            后续将根据功能模块、团队席位和使用量提供更细化方案。
          </p>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">当前套餐</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-tight text-slate-900">¥100</span>
              <span className="pb-1 text-sm text-zinc-500">/ 月</span>
            </div>
            <p className="mt-3 text-sm text-zinc-600">适用于个人或小团队，包含核心工具访问能力。</p>
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
