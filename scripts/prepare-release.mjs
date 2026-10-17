import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,12);
const assets=['style.css','audio.js','engine.js','art.js','game.js','pwa.js'];
let html=readFileSync(path.join(dist,'index.html'),'utf8');
for(const asset of assets){
  const escaped=asset.replaceAll('.','\\.');
  html=html.replace(new RegExp(`(["'])${escaped}(?:\\?v=[^"']*)?(["'])`,'g'),`$1${asset}?v=${hash(readFileSync(path.join(dist,asset)))}$2`);
}
writeFileSync(path.join(dist,'index.html'),html);
const files=readdirSync(dist,{recursive:true}).filter(name=>!name.includes('..')&&/\.(svg|webmanifest)$/.test(name)).sort();
const shell=['./','./index.html',...assets.map(asset=>`./${asset}?v=${hash(readFileSync(path.join(dist,asset)))}`),...files.map(file=>'./'+file.replaceAll(path.sep,'/'))];
const version=hash(shell.map(url=>url+readFileSync(path.join(dist,url.split('?')[0]==='./'?'index.html':url.split('?')[0]),'utf8')).join('\n'));
const template=readFileSync(path.join(root,'scripts/service-worker.template.js'),'utf8');
writeFileSync(path.join(dist,'sw.js'),template.replace('__VERSION__',version).replace("'__SHELL__'",JSON.stringify(shell,null,2)));
console.log(`Prepared release ${version}; ${shell.length} offline resources.`);
