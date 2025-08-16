const fs = require('fs');
const path = require('path');
const maxBytes = 2 * 1024 * 1024;
const ignoreDirs = new Set(['.git','node_modules','build','dist','android','ios','.expo','.next','.vercel','.turbo','.yarn','.pnpm-store']);
const ignoreFiles = [/\.env(\..*)?$/i,/\.map$/i];
const patterns = [
  {name:'stripe_secret',re:/\bsk_(live|test)_[0-9A-Za-z]{10,}\b/},
  {name:'ghp_token',re:/\bghp_[0-9A-Za-z]{36}\b/},
  {name:'aws_access_key',re:/\bAKIA[0-9A-Z]{16}\b/},
  {name:'google_api_key',re:/\bAIza[0-9A-Za-z_\-]{35}\b/},
  {name:'private_key_block',re:/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/},
  {name:'supabase_service_role',re:/\beyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_\-]+\.([A-Za-z0-9_\-]{20,})\b/},
  {name:'clerk_keys',re:/\bclerk_(pub|sec)_[0-9a-zA-Z]{20,}\b/},
  {name:'generic_token',re:/\b(token|secret|password|passwd|api[_-]?key|auth[_-]?key)\s*[:=]\s*['"][^'"]{16,}['"]/i}
];
let hits = [];
function shouldIgnore(file) {
  if (ignoreFiles.some(rx=>rx.test(file))) return true;
  return false;
}
function walk(dir) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    if (ignoreDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else {
      if (shouldIgnore(p)) continue;
      try {
        const stat = fs.statSync(p);
        if (stat.size > maxBytes) continue;
        const text = fs.readFileSync(p, 'utf8');
        for (const {name,re} of patterns) {
          const m = text.match(re);
          if (m) hits.push({file:p, pattern:name, sample:m[0].slice(0,120)});
        }
      } catch {}
    }
  }
}
walk(process.cwd());
if (hits.length) { console.error(JSON.stringify(hits,null,2)); process.exit(1); }
console.log('no-secrets-found');
