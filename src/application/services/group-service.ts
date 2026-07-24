import { createServerSupabaseClient } from "@/infrastructure/supabase/server-client";
import type { Group } from "@/domain/types/group";
const map = (row: { id:string; name:string; grade:string; active:boolean; sort_order:number }): Group => ({ id:row.id,name:row.name,grade:row.grade,active:row.active,sortOrder:row.sort_order });
export const listGroups = async (): Promise<Group[]> => { const client=await createServerSupabaseClient(); const {data,error}=await client.from("groups").select("id,name,grade,active,sort_order").eq("active",true).order("sort_order"); if(error) throw error; return data.map(map); };
