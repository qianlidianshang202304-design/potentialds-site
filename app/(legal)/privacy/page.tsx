import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-14 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Shield size={22} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">隐私政策</h1>
        </div>

        <div className="space-y-6 text-sm leading-7 text-gray-700 sm:text-base">
          <p>
            本政策用于说明 PotentialDS 在提供 SaaS 服务过程中对个人信息与平台公开数据的处理方式。
            本政策参考 2026 年主流 SaaS 合规实践，并兼顾 GDPR 与 CCPA 的核心原则。
          </p>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">1. 我们收集的信息</h2>
            <p>
              我们仅收集提供服务所必需的信息，包括：账户邮箱、基础账号信息、支付相关信息（由合规支付服务商处理）。
              我们不会以与服务无关的目的收集额外敏感信息。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">2. 达人数据来源与合规说明</h2>
            <p>
              本平台作为数据聚合与索引工具，仅展示 Instagram / YouTube / TikTok 等平台的公开可见信息。
              我们不存储任何达人的私人、非公开数据，也不规避平台权限机制获取受限数据。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">3. 信息使用目的</h2>
            <p>
              收集的信息仅用于账号管理、订阅计费、服务交付、风控与客户支持，不用于与服务目标无关的第三方营销。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">4. 数据安全与保留</h2>
            <p>
              我们采用行业常见的访问控制、传输加密与最小权限策略保护数据。个人信息仅在实现服务目的所需期间内保存，
              到期后按政策进行删除或匿名化处理。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">5. 用户权利</h2>
            <p>
              你可依法申请访问、更正、删除个人信息，或限制特定处理行为。如需行使相关权利，请通过平台支持渠道联系我们。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
