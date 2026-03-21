import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-14 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <FileText size={22} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">使用条例</h1>
        </div>

        <div className="space-y-6 text-sm leading-7 text-gray-700 sm:text-base">
          <p>
            使用本平台即表示你同意遵守本条例。若你不同意本条例内容，请停止访问或使用相关服务。
          </p>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">1. 合法使用</h2>
            <p>
              用户仅可将本平台用于合法、合规的业务分析与运营决策，不得用于违法用途或侵犯他人权利的行为。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">2. 禁止行为</h2>
            <p>
              严禁通过爬虫、批量脚本、逆向工程、抓包复刻等方式获取、复制或重建平台 API 与核心能力；
              严禁绕过访问限制、干扰系统稳定性或滥用平台数据。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">3. 数据参考与免责声明</h2>
            <p>
              平台提供的数据、评分、趋势与推荐仅用于辅助判断，不构成任何收益承诺。
              对于达人营销投放的实际转化率、商业结果及由此引发的损失，本平台不承担保证责任。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">4. PDF 工具使用责任</h2>
            <p>
              用户应对其通过 PDF 工具处理的文件内容负责。本平台不主动存储、不人工查看用户上传的私有文件，
              处理完成后按系统策略及时删除临时文件。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">5. 账户与访问</h2>
            <p>
              你需妥善保管账户凭证并对账户行为负责。若发现未授权访问，请立即联系我们处理。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
