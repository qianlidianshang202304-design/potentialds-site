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
            本政策参考主流 SaaS 合规实践，并兼顾 GDPR 与 CCPA 的核心原则。最后更新日期：2026 年 6 月 7 日。
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
            <h2 className="mb-2 text-lg font-semibold text-gray-900">4. 访问分析与安全监控</h2>
            <p>
              为了解不同流量入口的效果并识别异常抓取，我们会记录访问页面、来源域名、UTM 参数、设备类型和匿名会话标识。
              IP 地址与浏览器特征仅以加盐哈希形式用于频率控制和风险判断，不保存原始值。访问分析数据默认保留 90 天，
              安全事件默认保留 30 天。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">5. 邮件互动统计</h2>
            <p>
              当用户通过 PotentialDS 发送商务邮件时，邮件可包含透明的 1×1 像素和经过跳转的链接，用于估算打开与点击情况。
              图片代理、安全扫描和收件人设置可能造成统计偏差，因此产品中会将其标注为估算数据。每封邮件均提供退订入口，
              退订后系统会阻止后续发送。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">6. 数据安全与保留</h2>
            <p>
              我们采用行业常见的访问控制、传输加密与最小权限策略保护数据。个人信息仅在实现服务目的所需期间内保存，
              到期后按政策进行删除或匿名化处理。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">7. 用户权利</h2>
            <p>
              你可依法申请访问、更正、删除个人信息，限制特定处理行为，或撤回邮件互动统计许可。
              如需行使相关权利，请通过平台支持渠道联系我们。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
