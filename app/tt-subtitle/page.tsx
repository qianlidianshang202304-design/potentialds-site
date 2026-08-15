import type { Metadata } from 'next';
import { Download, CheckCircle2, RefreshCw, Shield, Languages, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'TikTok 达人精灵·字幕 - PotentialDS',
  description: '在 TikTok 视频页自动生成中文字幕，本地 Whisper 离线转写，保护隐私。',
};

export default function TTSubtitlePage() {
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-900">
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-32 text-center">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">TikTok Creator Tool</p>
        <h1 className="mb-6 text-5xl font-bold tracking-tighter md:text-6xl">
          TikTok 视频字幕，<span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">一键本地生成。</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-zinc-500">
          在 TikTok 视频页实时显示中文字幕，基于本地 Whisper 模型离线转写，不上传任何音频数据，更安全、更流畅。
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/TikTok达人精灵字幕-macOS.zip"
            download
            className="group relative inline-flex items-center gap-3 rounded-full bg-indigo-600 px-10 py-4 text-lg font-medium text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            <Download size={20} />
            <span>macOS 下载 (.zip)</span>
          </a>
        </div>
        <p className="mt-4 text-xs text-zinc-400">适用于 Chrome / Edge 扩展 + 本地音轨服务（首次安装需联网）</p>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Languages, title: '实时中文字幕', desc: '在 TikTok 视频播放页面直接显示自动转写的中文字幕，提升内容理解效率。' },
              { icon: Shield, title: '本地离线转写', desc: 'Whisper 模型运行在本机，音频数据不经过任何第三方服务器，保护隐私。' },
              { icon: Zap, title: '静默后台启动', desc: '首次双击安装一次后，日常只需点插件里的刷新，音轨服务自动静默唤起。' },
            ].map((item, i) => (
              <div key={i} className="rounded-3xl border border-zinc-200 bg-white/85 p-8 shadow-sm backdrop-blur-sm">
                <item.icon className="mb-4 text-indigo-600" size={32} />
                <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                <p className="text-sm leading-6 text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 安装说明 */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl border border-zinc-200 bg-white/85 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">安装与使用指南</h2>

          {/* 其他人首次安装 */}
          <div className="mb-10">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-indigo-600">
              <Download size={18} />
              首次安装（其他人电脑）
            </h3>
            <ol className="space-y-4">
              {[
                '解压 ZIP，解压后的文件夹不要移动或删除（后续扩展和服务都从这里加载）。',
                '双击文件夹中的「安装插件与音轨服务.app」，等待安装窗口提示完成。首次安装需联网，会自动安装本地 Whisper 依赖。',
                '打开 Chrome，访问 chrome://extensions，开启右上角「开发者模式」。',
                '点击「加载已解压的扩展程序」，选择解压后的「卖家精灵」文件夹。',
                '打开任意 TikTok 视频页面，插件开始工作。',
              ].map((step, i) => (
                <li key={i} className="flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="pt-0.5 text-sm leading-6 text-slate-700">{step}</div>
                </li>
              ))}
            </ol>
          </div>

          {/* 本机更新步骤 */}
          <div className="mb-10">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-sky-600">
              <RefreshCw size={18} />
              本机更新（已经装过旧版的机器）
            </h3>
            <ol className="space-y-4">
              {[
                '在 chrome://extensions 找到「TikTok 达人精灵·字幕」，点击「重新加载」。',
                '刷新 TikTok 视频页面。',
                '点击字幕面板右上角的 ↻ 按钮即可恢复工作。',
                '本机组件已预注册完成，无需再打开旧的 .command 文件。',
              ].map((step, i) => (
                <li key={i} className="flex gap-4 rounded-2xl border border-zinc-100 bg-sky-50/60 p-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div className="pt-0.5 text-sm leading-6 text-slate-700">{step}</div>
                </li>
              ))}
            </ol>
          </div>

          {/* 日常使用 */}
          <div className="mb-10">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-emerald-600">
              <CheckCircle2 size={18} />
              日常使用（首次安装之后）
            </h3>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 text-sm leading-7 text-slate-700">
              首次双击安装完成后，以后只需要在 TikTok 视频页面打开字幕插件，点击右上角的 ↻。
              <br />
              本地音轨服务会被插件自动静默唤起，不需要再手动打开任何 .app 或 .command 文件。
            </div>
          </div>

          {/* 注意事项 */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
            <p className="text-sm font-semibold text-amber-800">⚠️ 注意事项</p>
            <p className="mt-2 text-sm leading-7 text-amber-900/80">
              Chrome 的安全机制不允许扩展第一次加载时直接注册电脑程序，因此 <strong>第一次使用时仍需双击一次「安装插件与音轨服务.app」</strong>。
              这个步骤完成之后，日常使用就完全不需要在插件以外操作。
            </p>
          </div>

          {/* 测试通过清单 */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              '音轨服务停止后，后台桥接器可自动启动',
              '自动启动后健康检查恢复正常',
              'JavaScript 检查通过',
              '8 项字幕解析测试通过',
              '6 项 Python 服务及本机桥接测试通过',
              '分发 ZIP 已移除本机缓存与虚拟环境',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-white px-4 py-2.5 text-xs text-zinc-700 sm:text-sm">
                <CheckCircle2 size={14} className="text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
