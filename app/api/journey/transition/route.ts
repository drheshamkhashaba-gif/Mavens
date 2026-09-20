import { NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
import { PERMISSIONS, requirePermission } from "@/lib/access-control.mjs";
import { transitionJourney } from "@/lib/journey-engine.mjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({error:"AUTHENTICATION_REQUIRED"},{status:401});
  const body = await request.json().catch(()=>null) as {journeyId?:string,event?:string,reason?:string}|null;
  if (!body?.journeyId || !body.event) return NextResponse.json({error:"INVALID_REQUEST"},{status:400});
  const db=await getD1();
  const journey=await db.prepare("SELECT * FROM journey_instances WHERE id = ?").bind(body.journeyId).first<Record<string,unknown>>();
  if (!journey) return NextResponse.json({error:"JOURNEY_NOT_FOUND"},{status:404});
  const roleRows=await db.prepare("SELECT role FROM role_assignments WHERE user_id = ? AND tenant_id = ? AND status = 'active'").bind(user.id,journey.tenant_id).all<{role:string}>();
  const roles=roleRows.results.map(r=>r.role);
  try { requirePermission(roles,PERMISSIONS.JOURNEY_TRANSITION); } catch { return NextResponse.json({error:"FORBIDDEN"},{status:403}); }
  let result;
  try { result=transitionJourney({currentState:String(journey.current_state),event:body.event,actorRoles:roles,reason:body.reason,previousState:journey.on_hold_reason?JSON.parse(String(journey.on_hold_reason)).previousState:undefined,completedSessions:Number(journey.completed_sessions),sessionTarget:Number(journey.session_target)}); }
  catch(error){ return NextResponse.json({error:error instanceof Error?error.message:"TRANSITION_REJECTED"},{status:409}); }
  const now=new Date().toISOString(), eventId=crypto.randomUUID(), auditId=crypto.randomUUID(), nextVersion=Number(journey.version)+1;
  const update=db.prepare("UPDATE journey_instances SET current_state = ?, completed_sessions = ?, version = ?, on_hold_reason = ?, updated_at = ? WHERE id = ? AND version = ?").bind(result.toState,result.completedSessions,nextVersion,result.toState==="ON_HOLD"?JSON.stringify({reason:result.reason,previousState:result.fromState}):null,now,body.journeyId,journey.version);
  const eventWrite=db.prepare("INSERT INTO journey_events (id, tenant_id, journey_id, event_type, from_state, to_state, actor_id, actor_role, reason, payload_json, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(eventId,journey.tenant_id,body.journeyId,result.event,result.fromState,result.toState,user.id,roles[0],result.reason,JSON.stringify({version:nextVersion}),now,now,now);
  const auditWrite=db.prepare("INSERT INTO audit_logs (id, tenant_id, actor_id, entity_type, entity_id, action, reason, before_json, after_json, occurred_at, created_at, updated_at) VALUES (?, ?, ?, 'journey', ?, 'state_transition', ?, ?, ?, ?, ?, ?)").bind(auditId,journey.tenant_id,user.id,body.journeyId,result.reason,JSON.stringify({state:result.fromState,version:journey.version}),JSON.stringify({state:result.toState,version:nextVersion}),now,now,now);
  const batch=await db.batch([update,eventWrite,auditWrite]);
  if (!batch[0].success || batch[0].meta.changes!==1) return NextResponse.json({error:"CONCURRENT_UPDATE"},{status:409});
  return NextResponse.json({journeyId:body.journeyId,state:result.toState,version:nextVersion});
}
