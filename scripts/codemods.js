const fs=require('fs');const path=require('path');
const exts=new Set(['.ts','.tsx','.js','.jsx']);
const root=path.resolve(process.cwd(),'src');
let files=[];
(function walk(d){if(!fs.existsSync(d))return;for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk(p);else if(exts.has(path.extname(p)))files.push(p)}})(root);
let changed=0,platformImports=0,removedShadows=0,tokenRepls=0,profilesApi=0,pointerFix=0,driverFix=0;
for(const file of files){
  let src=fs.readFileSync(file,'utf8');let orig=src;
  src=src.replace(/getToken\s*\(\s*\{\s*template\s*:\s*['"][^'"]+['"]\s*\}\s*\)/g,()=>{tokenRepls++;return'getToken()'});
  src=src.replace(/\/rest\/v1\/profiles(?!_api)/g,()=>{profilesApi++;return'/rest/v1/profiles_api'});
  src=src.replace(/props\.pointerEvents/g,()=>{pointerFix++;return'style.pointerEvents'});
  if(/useNativeDriver\s*:\s*true/.test(src)){src=src.replace(/useNativeDriver\s*:\s*true/g,()=>{driverFix++;return'useNativeDriver: Platform.OS!=="web"'});if(!/from\s+['"]react-native['"]/.test(src)||!/Platform/.test(src)){src=`import { Platform } from "react-native";\n`+src;platformImports++;}}
  if(/shadow(Color|Opacity|Radius|Offset)/.test(src)){
    src=src.replace(/\bshadowColor\s*:\s*[^,}\n]+,?/g,'');
    src=src.replace(/\bshadowOpacity\s*:\s*[^,}\n]+,?/g,'');
    src=src.replace(/\bshadowRadius\s*:\s*[^,}\n]+,?/g,'');
    src=src.replace(/\bshadowOffset\s*:\s*\{[^}]*\}\s*,?/g,'');
    removedShadows++;
  }
  if(src!==orig){fs.writeFileSync(file,src,'utf8');changed++;}
}
const grepCreate=(dir)=>{let hits=[];(function walk2(d){if(!fs.existsSync(d))return;for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())walk2(p);else if(exts.has(path.extname(p))){const t=fs.readFileSync(p,'utf8');if(/createClient\s*\(/.test(t)&&!p.endsWith(path.join('lib','supabaseClient.ts')))hits.push(p)}}})(dir);return hits}
const dups=grepCreate(root);
if(dups.length){process.stderr.write('DUPLICATE_CREATECLIENT:'+JSON.stringify(dups)+'\n');process.exitCode=3;}
process.stdout.write(JSON.stringify({changed,platformImports,removedShadows,tokenRepls,profilesApi,pointerFix,driverFix})+'\n');
