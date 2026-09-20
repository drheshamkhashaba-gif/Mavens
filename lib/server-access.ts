import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";

export async function requireOperationalContext() {
  const user=await getChatGPTUser();
  if(!user) return {error:"AUTHENTICATION_REQUIRED" as const,status:401 as const};
  const db=await getD1();
  const assignments=await db.prepare("SELECT tenant_id, clinic_id, role FROM role_assignments WHERE user_id = ? AND status = 'active'").bind(user.id).all<{tenant_id:string;clinic_id:string|null;role:string}>();
  if(!assignments.results.length) return {error:"SETUP_REQUIRED" as const,status:403 as const,user,db};
  const first=assignments.results[0];
  return {user,db,tenantId:first.tenant_id,clinicId:first.clinic_id,roles:assignments.results.map(r=>r.role)};
}

export function operationalRole(roles:string[]) {
  return roles.some(r=>["reception","specialist","journey_coordinator","clinic_admin","super_admin"].includes(r));
}

export function clinicalRole(roles:string[]) {
  return roles.some(r=>["doctor","medical_director","super_admin"].includes(r));
}

export function medicalDirectorRole(roles:string[]) {
  return roles.some(r=>["medical_director","super_admin"].includes(r));
}
