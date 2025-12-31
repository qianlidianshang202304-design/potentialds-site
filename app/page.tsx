import React from 'react';
import type { Metadata } from 'next';
import { Download, Zap, Database, Layout, Terminal, ArrowRight } from 'lucide-react';

// 这里配置网站的 SEO 信息（标题、描述）
export const metadata: Metadata = {
  title: 'PotentialDS - Unleash Data Potential',
  description: 'PotentialDS - The ultimate data extraction tool for independent developers.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      
      {/* --- 顶部导航 --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-black rounded-md"></div>
            <span className="font-bold tracking-tight text-lg">PotentialDS</span>
          </div>
          <div className="flex gap-8 text-xs font-medium text-gray-500">
            <a href="#features" className="hover:text-black transition-colors">功能</a>
            <a href="#install" className="hover:text-black transition-colors">安装指南</a>
          </div>
        </div>
      </nav>

      {/* --- Hero 区域 --- */}
      <section className="pt-48 pb-32 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          v1.0 正式上线
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-black mb-8 leading-[1.05]">
          数据潜能，<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900">
            触手可及。
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-500 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
          PotentialDS 重新定义了数据采集体验。
          <br className="hidden md:block"/>
          无需复杂的脚本，让有价值的信息自动流向你的数据库。
        </p>
        
        <div className="flex flex-col items-center gap-5">
          {/* 下载按钮 */}
          <a 
            href="/potentialds-v1.0.zip" 
            download
            className="group relative flex items-center gap-3 bg-black text-white px-12 py-5 rounded-full text-lg font-medium hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-gray-200"
          >
            <Download size={20} />
            <span>下载插件 (.zip)</span>
            <ArrowRight size={16} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
          </a>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">
            Designed for Chrome & Edge
          </p>
        </div>
      </section>

      {/* --- 界面演示 (UI Mockup) --- */}
      <section className="px-4 mb-32">
        <div className="max-w-6xl mx-auto bg-gray-50 rounded-3xl border border-gray-100 p-2 md:p-4 shadow-xl">
            <div className="bg-white rounded-2xl aspect-[16/9] flex items-center justify-center border border-gray-100 overflow-hidden relative">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center">
                        <Terminal className="text-gray-400" />
                    </div>
                    <p className="text-gray-300 font-medium">PotentialDS Interface</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- Bento Grid 功能区 --- */}
      <section className="py-24 bg-white" id="features">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16 tracking-tight">强大核心。</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="col-span-2 bg-gray-50 p-10 rounded-3xl hover:bg-gray-100 transition-colors duration-500">
              <Database className="text-black mb-6" size={36} />
              <h3 className="text-2xl font-bold mb-3">直连数据库</h3>
              <p className="text-gray-500 leading-relaxed">
                告别 CSV 导出的繁琐。PotentialDS 原生支持 Supabase 等云数据库，采集即同步，让你的数据流转效率提升 10 倍。
              </p>
            </div>
            
            <div className="bg-black text-white p-10 rounded-3xl flex flex-col justify-between">
              <Zap className="text-yellow-400 mb-6" size={36} />
              <div>
                <h3 className="text-2xl font-bold mb-3">极速内核</h3>
                <p className="text-gray-400 text-sm">
                  基于 Rust 理念优化的采集逻辑，轻量、稳定。
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-10 rounded-3xl hover:bg-gray-100 transition-colors duration-500">
              <Layout className="text-blue-600 mb-6" size={36} />
              <h3 className="text-xl font-bold mb-3">可视化清洗</h3>
              <p className="text-gray-500 text-sm">
                自动剔除无效数据，格式化手机号与邮箱，所见即所得。
              </p>
            </div>
            
             <div className="col-span-2 bg-gray-50 p-10 rounded-3xl hover:bg-gray-100 transition-colors duration-500 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">隐私优先设计</h3>
                  <p className="text-gray-500 text-sm max-w-md">你的数据只属于你。我们不追踪、不上传、不通过第三方服务器中转。</p>
                </div>
                <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center text-white shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- 安装指引 --- */}
      <section className="py-24 border-t border-gray-100" id="install">
        <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-12 text-center">如何开始使用？</h2>
            <div className="space-y-4">
                {[
                    {step: "01", title: "下载插件包", desc: "点击上方的按钮，下载 potentialds-v1.0.zip 到本地。"},
                    {step: "02", title: "解压文件", desc: "将压缩包解压，你会得到一个文件夹。"},
                    {step: "03", title: "导入浏览器", desc: "打开 chrome://extensions，开启右上角「开发者模式」，将文件夹拖入即可。"}
                ].map((item, i) => (
                    <div key={i} className="flex items-start p-6 rounded-2xl hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-bold text-gray-300 mr-6 mt-1">{item.step}</span>
                        <div>
                            <h4 className="text-lg font-bold mb-1">{item.title}</h4>
                            <p className="text-gray-500 text-sm">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="py-12 text-center border-t border-gray-100 bg-gray-50">
        <div className="mb-4 font-bold text-lg tracking-tight">PotentialDS</div>
        <p className="text-xs text-gray-400 mb-8">
            &copy; 2024 Potential Data Solutions. All rights reserved.
        </p>
      </footer>
    </div>
  );
}