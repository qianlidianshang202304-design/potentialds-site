import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const outputRoot = path.resolve(projectRoot, '..', 'potentialds-preview');
const cssDirectory = path.join(projectRoot, '.next/static/css');
const pages = [
  ['index', '.next/server/app/index.html'],
  ['pricing', '.next/server/app/pricing.html'],
  ['privacy', '.next/server/app/privacy.html'],
];

function dataUrl(bytes, mimeType) {
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

const cssFiles = (await fs.readdir(cssDirectory)).filter((file) => file.endsWith('.css'));
if (cssFiles.length === 0) throw new Error('No built CSS found. Run the production build first.');

const [cssSources, background, wechat] = await Promise.all([
  Promise.all(cssFiles.map((file) => fs.readFile(path.join(cssDirectory, file), 'utf8'))),
  fs.readFile(path.join(projectRoot, 'public/images/site-bg.webp')),
  fs.readFile(path.join(projectRoot, 'public/images/Wechat.png')),
]);

const css = cssSources.join('\n').replace(
  /url\(\/images\/site-bg\.webp\)/g,
  `url(${dataUrl(background, 'image/webp')})`,
);
const wechatUrl = dataUrl(wechat, 'image/png');

await fs.mkdir(outputRoot, { recursive: true });

for (const [name, source] of pages) {
  let html = await fs.readFile(path.join(projectRoot, source), 'utf8');
  html = html
    .replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`)
    .replace(/<link rel="preload" as="script"[^>]*>/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<link rel="icon"[^>]*>/g, '')
    .replace(
      /<img alt="WeChat QR"[^>]*>/g,
      `<img alt="WeChat QR" width="240" height="240" class="h-auto w-[240px]" src="${wechatUrl}">`,
    );
  await fs.writeFile(path.join(outputRoot, `${name}.html`), html);
}

console.log(`Offline preview written to ${outputRoot}`);
