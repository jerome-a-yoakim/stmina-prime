import { createBrowserSupabaseClient } from "@/infrastructure/supabase/browser-client";
export interface Activity { id:string; name:string; icon:string; color:string; }
interface ActivityRow { id:string; name:string; icon:string; color:string; }
const map=(r: ActivityRow): Activity=>({id:r.id,name:r.name,icon:r.icon,color:r.color});
export const listActivities=async ():Promise<Activity[]>=>{const c=createBrowserSupabaseClient();const {data,error}=await c.from("activities").select("*").order("name");if(error)throw error;return data.map(map);};
export interface CreateActivityInput { name:string; icon:string; color:string; }
export const createActivity=async (input:CreateActivityInput):Promise<Activity>=>{const c=createBrowserSupabaseClient();const {data,error}=await c.from("activities").insert({name:input.name,icon:input.icon,color:input.color}).select().single();if(error)throw error;return map(data);};
export interface UpdateActivityInput { name?:string; icon?:string; color?:string; }
export const updateActivity=async (id:string,patch:UpdateActivityInput):Promise<Activity>=>{const c=createBrowserSupabaseClient();const {data,error}=await c.from("activities").update(patch).eq("id",id).select().single();if(error)throw error;return map(data);};
export const deleteActivity=async (id:string):Promise<void>=>{const c=createBrowserSupabaseClient();
  // Deleting the activity is sufficient — the member_activities join table
  // has an ON DELETE CASCADE FK to activities.id, so every membership link
  // for this activity is removed automatically by Postgres.
  const {error}=await c.from("activities").delete().eq("id",id);if(error)throw error;};
