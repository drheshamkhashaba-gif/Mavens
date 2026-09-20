import { NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
export const dynamic="force-dynamic";

export async function POST(){
 const user=await getChatGPTUser(); if(!user) return NextResponse.json({error:"AUTHENTICATION_REQUIRED"},{status:401});
 const db=await getD1(); const existing=await db.prepare("SELECT id FROM organizations LIMIT 1").first();
 if(existing) return NextResponse.json({error:"SETUP_ALREADY_COMPLETED"},{status:409});
 const now=new Date().toISOString(),tenantId=crypto.randomUUID(),clinicId=crypto.randomUUID();
 await db.batch([
  db.prepare("INSERT INTO organizations (id,name,created_at,updated_at) VALUES (?, 'Derma Glow', ?, ?)").bind(tenantId,now,now),
  db.prepare("INSERT INTO clinics (id,tenant_id,name,timezone,created_at,updated_at) VALUES (?, ?, 'Amman Clinic', 'Asia/Amman', ?, ?)").bind(clinicId,tenantId,now,now),
  db.prepare("INSERT INTO user_profiles (id,email,display_name,created_at,updated_at) VALUES (?, ?, ?, ?, ?)").bind(user.id,user.email,user.displayName,now,now),
  db.prepare("INSERT INTO role_assignments (id,tenant_id,clinic_id,user_id,role,status,granted_by,granted_at,created_at,updated_at) VALUES (?, ?, ?, ?, 'super_admin', 'active', ?, ?, ?, ?)").bind(crypto.randomUUID(),tenantId,clinicId,user.id,user.id,now,now,now),
  db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,reason,occurred_at,created_at,updated_at) VALUES (?, ?, ?, 'organization', ?, 'workspace_initialized', 'First authenticated owner initialized empty workspace', ?, ?, ?)").bind(crypto.randomUUID(),tenantId,user.id,tenantId,now,now,now)
 ]);
 return NextResponse.json({ok:true});
}
