const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'source'), modules=new Map();
const pages={index:'pages/index/index',insights:'price-intelligence/pages/insights/insights'};
function collect(file){const id=path.relative(root,file).replaceAll('\\','/');if(modules.has(id))return id;modules.set(id,'');let code=fs.readFileSync(file,'utf8').replace(/require\(['"]([^'"]+)['"]\)/g,(_,r)=>{const target=path.resolve(path.dirname(file),r);if(!target.startsWith(root+path.sep))throw Error('Outside web source');return `require(${JSON.stringify(collect(target))})`;});modules.set(id,code);return id;}
const entries=Object.fromEntries(Object.entries(pages).map(([n,p])=>[n,collect(path.join(root,p+'.js'))]));
fs.writeFileSync(path.join(__dirname,'dist/mini-bundle.js'),'window.MINI_MODULES={'+[...modules].map(([id,code])=>`${JSON.stringify(id)}:function(module,exports,require){\n${code}\n}`).join(',')+'};\nwindow.MINI_PAGES='+JSON.stringify(Object.fromEntries(Object.entries(pages).map(([n,p])=>[n,{entry:entries[n],template:fs.readFileSync(path.join(root,p+'.wxml'),'utf8')}])) )+';');
for(const [name,p]of Object.entries(pages))fs.writeFileSync(path.join(__dirname,'dist/'+name+'.css'),fs.readFileSync(path.join(root,p+'.wxss'),'utf8').replace(/(-?\d*\.?\d+)rpx/g,'calc($1 * var(--rpx))'));
console.log(`Built original mobile layouts with ${modules.size} independent modules.`);
