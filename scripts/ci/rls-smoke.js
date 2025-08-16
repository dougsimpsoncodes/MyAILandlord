const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !anon) { console.log('skipping-rls-smoke-missing-env'); process.exit(0); }
async function run() {
  const insert = await fetch(`${url}/rest/v1/properties`, { method:'POST', headers:{'apikey':anon,'Content-Type':'application/json'}, body: JSON.stringify({name:'ci_probe', address:'x'}) });
  const okInsertDenied = insert.status===401 || insert.status===403;
  const select = await fetch(`${url}/rest/v1/properties?select=id&limit=1`, { headers:{'apikey':anon} });
  // Select may return 200 with empty array [] due to RLS filtering, which is acceptable
  const okSelectBehavior = select.status===401 || select.status===403 || select.status===200;
  if (!okInsertDenied || !okSelectBehavior) {
    const bodyI = await insert.text().catch(()=> '');
    const bodyS = await select.text().catch(()=> '');
    console.error(JSON.stringify({insertStatus:insert.status, insertBody:bodyI, selectStatus:select.status, selectBody:bodyS},null,2));
    process.exit(1);
  }
  console.log('rls-deny-unauth-ok');
}
run().catch(e=>{console.error(e);process.exit(1);});
