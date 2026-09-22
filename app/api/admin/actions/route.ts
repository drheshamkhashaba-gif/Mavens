import { intakeOptions } from "@/lib/intake-options";
import { NextResponse } from "next/server";
import { operationalRole,requireOperationalContext } from "@/lib/server-access";
import { receptionStep } from "@/lib/operations-workflow.mjs";
import { transitionJourney } from "@/lib/journey-engine.mjs";
export const dynamic="force-dynamic";

type Body={action:string;[key:string]:unknown};
export async function POST(request:Request){
 const ctx=await requireOperationalContext(); if("error" in ctx) return NextResponse.json({error:ctx.error},{status:ctx.status});
 if(!operationalRole(ctx.roles)) return NextResponse.json({error:"FORBIDDEN"},{status:403});
 const body=await request.json().catch(()=>null) as Body|null; if(!body?.action) return NextResponse.json({error:"INVALID_REQUEST"},{status:400});
 const {db,tenantId,clinicId,user}=ctx,now=new Date().toISOString();
 if(body.action==="register_patient"){
  const fullName=String(body.fullName??"").trim(),mobile=String(body.mobile??"").trim(),concern=String(body.concern??"").trim(),goal=String(body.goal??"").trim();
  if(!fullName||!mobile) return NextResponse.json({error:"NAME_AND_MOBILE_REQUIRED"},{status:400});
  const duplicate=await db.prepare("SELECT p.id FROM patients p JOIN patient_profiles pp ON pp.patient_id=p.id WHERE p.tenant_id=? AND p.clinic_id=? AND pp.mobile=? AND p.archived_at IS NULL LIMIT 1").bind(tenantId,clinicId,mobile).first();
  if(duplicate)return NextResponse.json({error:"MOBILE_ALREADY_REGISTERED_OPEN_EXISTING_RECORD"},{status:409});
  const patientId=crypto.randomUUID(),journeyId=crypto.randomUUID(),intakeId=crypto.randomUUID(),reference=`DG-${Date.now().toString().slice(-6)}`;
  await db.batch([
   db.prepare("INSERT INTO patients (id,tenant_id,clinic_id,reference_code,status,created_at,updated_at) VALUES (?,?,?,?,'active',?,?)").bind(patientId,tenantId,clinicId,reference,now,now),
   db.prepare("INSERT INTO patient_profiles (id,tenant_id,patient_id,full_name_ar,full_name_en,mobile,preferred_language,created_at,updated_at) VALUES (?,?,?,?,?,?,'ar',?,?)").bind(crypto.randomUUID(),tenantId,patientId,fullName,fullName,mobile,now,now),
   db.prepare("INSERT INTO journey_instances (id,tenant_id,clinic_id,patient_id,current_state,session_target,completed_sessions,version,created_at,updated_at) VALUES (?,?,?,?,'REGISTERED',9,0,1,?,?)").bind(journeyId,tenantId,clinicId,patientId,now,now),
   db.prepare("INSERT INTO reception_intakes (id,tenant_id,clinic_id,patient_id,journey_id,primary_concern,personal_goal,medical_consent_status,profile_completeness,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'pending',60,'awaiting_arrival',?,?)").bind(intakeId,tenantId,clinicId,patientId,journeyId,concern,goal,now,now),
   db.prepare("INSERT INTO intake_assessments (patient_id,tenant_id,clinic_id,data_json,updated_at,updated_by) VALUES (?,?,?,?,?,?)").bind(patientId,tenantId,clinicId,JSON.stringify({goal:goal==="acne_only"?intakeOptions.goal[0]:goal==="acne_and_effects"?intakeOptions.goal[1]:goal==="needs_assessment"?intakeOptions.goal[2]:""}),now,user.id),
   db.prepare("INSERT INTO commercial_events (id,tenant_id,clinic_id,patient_id,event_type,source,currency,dedupe_key,occurred_at,recorded_by,created_at,updated_at) VALUES (?,?,?,?, 'inquiry','direct','JOD',?,?,?,?,?)").bind(crypto.randomUUID(),tenantId,clinicId,patientId,`registration:${patientId}`,now,user.id,now,now),
   db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,after_json,occurred_at,created_at,updated_at) VALUES (?,?,?,'patient',?,'registered',?,?,?,?)").bind(crypto.randomUUID(),tenantId,user.id,patientId,JSON.stringify({reference}),now,now,now)
  ]); return NextResponse.json({ok:true,patientId,reference});
 }
 const intakeId=String(body.intakeId??""),intake=intakeId?await db.prepare("SELECT * FROM reception_intakes WHERE id=? AND tenant_id=? AND clinic_id=?").bind(intakeId,tenantId,clinicId).first<Record<string,unknown>>():null;
 if(["check_in","record_consent","send_to_imaging","complete_imaging","notify_doctor"].includes(body.action)&&!intake) return NextResponse.json({error:"INTAKE_NOT_FOUND"},{status:404});
 if(intake&&["check_in","record_consent","send_to_imaging","complete_imaging","notify_doctor"].includes(body.action)){try{receptionStep({status:String(intake.status),consentStatus:String(intake.medical_consent_status),action:body.action})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"INVALID_RECEPTION_STEP"},{status:409})}}
 if(body.action==="check_in"){
  const journey=await db.prepare("SELECT * FROM journey_instances WHERE id=?").bind(intake!.journey_id).first<Record<string,unknown>>(); if(!journey)return NextResponse.json({error:"JOURNEY_NOT_FOUND"},{status:404});
  const moved=transitionJourney({currentState:String(journey.current_state),event:"assessment_started",actorRoles:ctx.roles,completedSessions:Number(journey.completed_sessions),sessionTarget:Number(journey.session_target)});
  await db.batch([db.prepare("UPDATE reception_intakes SET status='checked_in',checked_in_at=?,updated_at=? WHERE id=?").bind(now,now,intakeId),db.prepare("UPDATE journey_instances SET current_state=?,version=version+1,updated_at=? WHERE id=? AND version=?").bind(moved.toState,now,journey.id,journey.version),db.prepare("INSERT INTO journey_events (id,tenant_id,journey_id,event_type,from_state,to_state,actor_id,actor_role,occurred_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),tenantId,journey.id,moved.event,moved.fromState,moved.toState,user.id,ctx.roles[0],now,now,now)]);
 }
 else if(body.action==="record_consent") await db.batch([db.prepare("INSERT INTO consents (id,tenant_id,patient_id,type,version,granted,recorded_at,created_at,updated_at) VALUES (?,?,?,'medical','v1',1,?,?,?)").bind(crypto.randomUUID(),tenantId,intake!.patient_id,now,now,now),db.prepare("UPDATE reception_intakes SET medical_consent_status='signed',profile_completeness=80,updated_at=? WHERE id=?").bind(now,intakeId)]);
 else if(body.action==="send_to_imaging") await db.batch([db.prepare("INSERT INTO imaging_checklists (id,tenant_id,clinic_id,patient_id,journey_id,intake_id,purpose,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'baseline','queued',?,?)").bind(crypto.randomUUID(),tenantId,clinicId,intake!.patient_id,intake!.journey_id,intakeId,now,now),db.prepare("UPDATE reception_intakes SET status='imaging',updated_at=? WHERE id=?").bind(now,intakeId)]);
 else if(body.action==="complete_imaging"){
  const assessment=await db.prepare("SELECT data_json FROM intake_assessments WHERE patient_id=? AND tenant_id=? AND clinic_id=?").bind(intake!.patient_id,tenantId,clinicId).first<{data_json:string}>();
  const details=assessment?JSON.parse(assessment.data_json):{};
  if(details.consent!=="yes"||!["birthDate","residence","travel","goal","medications","otherTreatments"].every(k=>details[k]))return NextResponse.json({error:"COMPLETE_INTAKE_AND_IMAGING_CONSENT_FIRST"},{status:409});
  const storedImages=await db.prepare("SELECT COUNT(*) AS n FROM intake_documents WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND kind='image'").bind(intake!.patient_id,tenantId,clinicId).first<{n:number}>();
  if(!storedImages?.n)return NextResponse.json({error:"UPLOAD_BASELINE_IMAGES_FIRST"},{status:409});
  const image=await db.prepare("SELECT * FROM imaging_checklists WHERE intake_id=? AND tenant_id=?").bind(intakeId,tenantId).first<Record<string,unknown>>(); if(!image) return NextResponse.json({error:"IMAGING_NOT_FOUND"},{status:404});
  const journey=await db.prepare("SELECT * FROM journey_instances WHERE id=?").bind(intake!.journey_id).first<Record<string,unknown>>(); if(!journey)return NextResponse.json({error:"JOURNEY_NOT_FOUND"},{status:404});
  const moved=transitionJourney({currentState:String(journey.current_state),event:"baseline_completed",actorRoles:ctx.roles,completedSessions:Number(journey.completed_sessions),sessionTarget:Number(journey.session_target)});
  await db.batch([db.prepare("UPDATE imaging_checklists SET angle_confirmed=1,lighting_confirmed=1,distance_confirmed=1,result_reference=?,status='completed',completed_by=?,completed_at=?,updated_at=? WHERE id=?").bind(String(body.resultReference??"OBSERV uploaded images"),user.id,now,now,image.id),db.prepare("UPDATE reception_intakes SET status='ready_for_doctor',profile_completeness=100,ready_for_doctor_at=?,updated_at=? WHERE id=?").bind(now,now,intakeId),db.prepare("UPDATE journey_instances SET current_state=?,version=version+1,updated_at=? WHERE id=? AND version=?").bind(moved.toState,now,journey.id,journey.version),db.prepare("INSERT INTO journey_events (id,tenant_id,journey_id,event_type,from_state,to_state,actor_id,actor_role,occurred_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),tenantId,journey.id,moved.event,moved.fromState,moved.toState,user.id,ctx.roles[0],now,now,now)]);
 }
 else if(body.action==="notify_doctor") await db.prepare("UPDATE reception_intakes SET status='doctor_notified',updated_at=? WHERE id=?").bind(now,intakeId).run();
 else if(body.action==="resolve_reschedule"){
  const requestId=String(body.requestId??""),decision=String(body.decision)==="approved"?"approved":"declined";
  const rr=await db.prepare("SELECT * FROM reschedule_requests WHERE id=? AND tenant_id=? AND clinic_id=? AND status='pending'").bind(requestId,tenantId,clinicId).first<Record<string,unknown>>(); if(!rr) return NextResponse.json({error:"REQUEST_NOT_FOUND"},{status:404});
  if(decision==="approved"){const appointment=await db.prepare("SELECT * FROM appointments WHERE id=?").bind(rr.appointment_id).first<Record<string,unknown>>();const conflict=await db.prepare("SELECT id FROM appointments WHERE id!=? AND starts_at=? AND status IN ('scheduled','confirmed') AND ((provider_id IS NOT NULL AND provider_id=?) OR (device_id IS NOT NULL AND device_id=?) OR (room_id IS NOT NULL AND room_id=?)) LIMIT 1").bind(rr.appointment_id,rr.preferred_starts_at,appointment?.provider_id,appointment?.device_id,appointment?.room_id).first();if(conflict)return NextResponse.json({error:"SCHEDULE_CONFLICT"},{status:409});}
  const statements=[db.prepare("UPDATE reschedule_requests SET status=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?").bind(decision,user.id,now,now,requestId)]; if(decision==="approved") statements.push(db.prepare("UPDATE appointments SET starts_at=?,status='scheduled',updated_at=? WHERE id=?").bind(rr.preferred_starts_at,now,rr.appointment_id)); await db.batch(statements);
 } else return NextResponse.json({error:"UNKNOWN_ACTION"},{status:400});
 await db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,after_json,occurred_at,created_at,updated_at) VALUES (?,?,?,'operations',?,?,?, ?,?,?)").bind(crypto.randomUUID(),tenantId,user.id,intakeId||String(body.requestId??""),body.action,JSON.stringify(body),now,now,now).run();
 return NextResponse.json({ok:true});
}
