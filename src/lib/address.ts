export type AddressJson={line1?:string;line2?:string;city?:string;state?:string;zipCode?:string;country?:string}
export function formatAddressFromJson(j:AddressJson={},unit?:string){
  const l1=(j.line1||'').trim()
  const u=(unit||'').trim()
  const l2=(j.line2||'').trim()
  const city=(j.city||'').trim()
  const st=(j.state||'').trim()
  const zip=(j.zipCode||'').trim()
  const p1=[ [l1, u && !l2 ? `Unit ${u}`:'' ].filter(Boolean).join(' ').trim(), l2 ].filter(Boolean)
  const p2=[city,st,zip].filter(Boolean).join(', ')
  return [p1.filter(Boolean).join(', '),p2].filter(Boolean).join(', ').trim()
}
