import { CreditCard } from 'lucide-react';

export default function SalesPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-14 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <CreditCard size={22} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">销售与订阅条例</h1>
        </div>

        <div className="space-y-6 text-sm leading-7 text-gray-700 sm:text-base">
          <p>
            本条例说明 PotentialDS 的计费、订阅与退款规则。购买或续订服务即代表你同意本条例。
          </p>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">1. 订阅模式</h2>
            <p>
              平台采用订阅制，支持月付与年付。默认按所选周期自动续费，续费日将通过原支付方式扣款。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">2. 自动续费与取消</h2>
            <p>
              你可随时在账户设置中取消订阅。取消后当前计费周期仍可继续使用，下一计费周期不再扣费。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">3. 退款政策</h2>
            <p>
              数字工具类产品在开通并可用后，原则上不予退款。若出现平台持续性服务中断、
              且经核实由平台责任导致无法使用，我们将按实际情况提供补偿或部分退款方案。
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">4. 价格与税费</h2>
            <p>
              所有价格以结算页面展示为准。若适用税费、汇率或支付通道费用，将按当地规则和支付渠道标准执行。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
