import { build } from 'esbuild';
import { cp, mkdir, copyFile, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(root, '../static/tools-assets');
await mkdir(destination, { recursive: true });
await build({
  entryPoints: { tools: path.join(root, 'src/tools.mjs'), 'pdf-worker': path.join(root, 'src/pdf-worker.mjs'), 'pdf-math':path.join(root,'src/pdf-math.mjs'), 'pdf-viewer': path.join(root, 'src/pdf-viewer.mjs') },
  absWorkingDir: root, outdir: destination, bundle: true, format: 'esm', target: 'es2020', minify: true,
  legalComments: 'linked', sourcemap: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
await cp(path.join(root, 'node_modules/katex/dist/fonts'), path.join(destination, 'fonts'), { recursive: true });
await copyFile(path.join(root, 'node_modules/katex/dist/katex.min.css'), path.join(destination, 'katex.min.css'));
await copyFile(path.join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), path.join(destination, 'pdfjs-worker.mjs'));
const packages = ['marked','dompurify','highlight.js','katex','mathjax-full','pdfkit','svg-to-pdfkit','buffer','pdfjs-dist'];
const notices = [];
for (const name of packages) {
  const packageDir = path.join(root, 'node_modules', name);
  const json = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
  const licenses = (await readdir(packageDir)).filter(file => /^licen[cs]e(?:\.|$)/i.test(file));
  notices.push(`\n${name} ${json.version}\n${json.license || ''}\n`);
  for (const license of licenses) notices.push(await readFile(path.join(packageDir, license), 'utf8'));
}
await writeFile(path.join(destination, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n'));
