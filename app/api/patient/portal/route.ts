import {NextResponse} from "next/server";
import {requireOperationalContext} from "@/lib/server-access";
export const dynamic="force-dynamic";

export async function GET(request:Request){
 const ctx=await requireOperationalContext();if("error" in ctx)return NextResponse.json({error:ctx.error},{status:ctx.status});
 const {db,tenantId,user,roles}=ctx,url=new URL(request.url),isPrivileged=roles.some(r=>["super_admin","clinic_admin","doctor","medical_director"].includes(r));
 const requested=url.searchParams.get("patientId");
 const patient=isPrivileged?await db.prepare("SELECT p.*,pp.full_name_ar,pp.full_name_en,pp.date_of_birth,pp.mobile,pp.preferred_language,pp.photo_asset_id,c.name clinic_name FROM patients p LEFT JOIN patient_profiles pp ON pp.patient_id=p.id LEFT JOIN clinics c ON c.id=p.clinic_id WHERE p.tenant_id=? AND p.id=COALESCE(?,(SELECT id FROM patients WHERE tenant_id=? AND archived_at IS NULL ORDER BY created_at LIMIT 1))").bind(tenantId,requested,tenantId).first<Record<string,unknown>>():await db.prepare("SELECT p.*,pp.full_name_ar,pp.full_name_en,pp.date_of_birth,pp.mobile,pp.preferred_language,pp.photo_asset_id,c.name clinic_name FROM patients p LEFT JOIN patient_profiles pp ON pp.patient_id=p.id LEFT JOIN clinics c ON c.id=p.clinic_id WHERE p.tenant_id=? AND p.profile_id=? AND p.archived_at IS NULL").bind(tenantId,user.id).first<Record<string,unknown>>();
 if(!patient)return NextResponse.json({error:"PATIENT_NOT_FOUND"},{status:404});const patientId=String(patient.id);
 const [journey,program,consultation,appointments,tasks,sessions,events,metrics,threads,messages,prefs,contact,outcome,marketing,notifications]=await Promise.all([
  db.prepare("SELECT * FROM journey_instances WHERE patient_id=? AND tenant_id=? ORDER BY created_at DESC LIMIT 1").bind(patientId,tenantId).first(),
  db.prepare("SELECT pp.*,pt.name_ar,pt.name_en FROM patient_programs pp LEFT JOIN program_template_versions pv ON pv.id=pp.template_version_id LEFT JOIN program_templates pt ON pt.id=pv.template_id WHERE pp.patient_id=? AND pp.tenant_id=? AND pp.status='active' ORDER BY pp.created_at DESC LIMIT 1").bind(patientId,tenantId).first(),
  db.prepare("SELECT c.*,u.display_name physician_name FROM consultations c LEFT JOIN user_profiles u ON u.id=c.physician_id WHERE c.patient_id=? AND c.tenant_id=? AND c.status='approved' ORDER BY c.approved_at DESC LIMIT 1").bind(patientId,tenantId).first(),
  db.prepare("SELECT * FROM appointments WHERE patient_id=? AND tenant_id=? ORDER BY starts_at").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM routine_tasks WHERE patient_id=? AND tenant_id=? ORDER BY scheduled_for,period").bind(patientId,tenantId).all(),
  db.prepare("SELECT session_number,device_type,completed_at FROM treatment_sessions WHERE patient_id=? AND tenant_id=? ORDER BY session_number").bind(patientId,tenantId).all(),
  db.prepare("SELECT event_type,to_state,occurred_at FROM journey_events WHERE journey_id=(SELECT id FROM journey_instances WHERE patient_id=? ORDER BY created_at DESC LIMIT 1) AND tenant_id=? ORDER BY occurred_at").bind(patientId,tenantId).all(),
  db.prepare("SELECT am.metric,am.value,am.measured_at,am.review_state FROM assessment_metrics am JOIN assessments a ON a.id=am.assessment_id WHERE a.patient_id=? AND am.tenant_id=? AND am.review_state='approved' ORDER BY am.measured_at").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM message_threads WHERE patient_id=? AND tenant_id=? ORDER BY last_message_at DESC").bind(patientId,tenantId).all(),
  db.prepare("SELECT pm.* FROM patient_messages pm WHERE pm.patient_id=? AND pm.tenant_id=? ORDER BY pm.sent_at").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM notification_preferences WHERE patient_id=? AND tenant_id=?").bind(patientId,tenantId).first(),
  db.prepare("SELECT * FROM emergency_contacts WHERE patient_id=? AND tenant_id=? AND is_primary=1 LIMIT 1").bind(patientId,tenantId).first(),
  db.prepare("SELECT * FROM outcome_documents WHERE patient_id=? AND tenant_id=? ORDER BY created_at DESC LIMIT 1").bind(patientId,tenantId).first(),
  db.prepare("SELECT * FROM marketing_consents WHERE patient_id=? AND tenant_id=? ORDER BY recorded_at DESC LIMIT 1").bind(patientId,tenantId).first(),
  db.prepare("SELECT id,rule_key,body,status,scheduled_for,sent_at FROM notification_outbox WHERE patient_id=? AND tenant_id=? AND status='delivered' ORDER BY scheduled_for DESC LIMIT 20").bind(patientId,tenantId).all()
 ]);
 return NextResponse.json({patient,journey,program,consultation,appointments:appointments.results,tasks:tasks.results,sessions:sessions.results,events:events.results,metrics:metrics.results,threads:threads.results,messages:messages.results,preferences:prefs,emergencyContact:contact,outcome,marketingConsent:marketing,notifications:notifications.results,preview:isPrivileged});
}
