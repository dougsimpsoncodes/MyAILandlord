import { restGet, restInsert, restPatch } from '../lib/rest'
import { formatAddressFromJson } from '../lib/address'
type Profile={id:string;clerk_user_id:string;email?:string;name?:string;avatar_url?:string}
export async function getProfileByClerkId(clerkId:string):Promise<Profile|null>{
  const rows=await restGet('profiles_api',{select:'*',clerk_user_id:`eq.${clerkId}`})
  return Array.isArray(rows)&&rows.length?rows[0]:null
}
export async function upsertProfile(p:Profile):Promise<Profile>{
  const existing=await getProfileByClerkId(p.clerk_user_id)
  if(!existing){const rows=await restInsert('profiles_api',p);return rows[0]}
  const rows=await restPatch('profiles_api',{id:`eq.${existing.id}`},p);return rows[0]
}
type PropertyInsert={name:string;address_jsonb:any;property_type:string;unit?:string;bedrooms?:number;bathrooms?:number}
export async function insertProperty(payload:PropertyInsert){
  const address=formatAddressFromJson(payload.address_jsonb,payload.unit)
  const rows=await restInsert('properties',{...payload,address})
  return rows[0]
}
export async function getUserProperties(){
  const rows=await restGet('properties',{select:'*',order:'created_at.desc'})
  return rows||[]
}
export async function insertPropertyAreas(areas:any[]){
  const rows=await restInsert('property_areas',areas)
  return rows
}
