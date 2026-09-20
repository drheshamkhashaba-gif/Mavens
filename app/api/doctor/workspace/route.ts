import {NextResponse} from "next/server";
import {clinicalRole,requireOperationalContext} from "@/lib/server-access";
export const dynamic="force-dynamic";

export async function GET(request:Request){
 const ctx=await requireOperationalContext();if("error" in ctx)return NextResponse.json({error:ctx.error},{status:ctx.status});if(!clinicalRole(ctx.roles))return NextResponse.json({error:"FORBIDDEN"},{status:403});
 const {db,tenantId,clinicId}=ctx,url=new URL(request.url),requested=url.searchParams.get("patientId");
 const patients=await db.prepare("SELECT p.id,p.reference_code,p.status,pp.full_name_ar,pp.full_name_en,pp.mobile,j.id journey_id,j.current_state,j.completed_sessions,j.session_target,ri.personal_goal,ri.primary_concern,(SELECT MAX(CASE severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END) FROM alerts a WHERE a.patient_id=p.id AND a.status!='resolved') risk_rank,(SELECT COUNT(*) FROM alerts a WHERE a.patient_id=p.id AND a.status!='resolved') alert_count FROM patients p LEFT JOIN patient_profiles pp ON pp.patient_id=p.id LEFT JOIN journey_instances j ON j.patient_id=p.id LEFT JOIN reception_intakes ri ON ri.patient_id=p.id WHERE p.tenant_id=? AND p.clinic_id=? AND p.archived_at IS NULL ORDER BY COALESCE(risk_rank,0) DESC,p.updated_at DESC").bind(tenantId,clinicId).all<Record<string,unknown>>();
 const patientId=requested||String(patients.results[0]?.id||"");if(!patientId)return NextResponse.json({patients:[],detail:null,alerts:[],templates:[]});
 const patient=patients.results.find(p=>p.id===patientId);if(!patient)return NextResponse.json({error:"PATIENT_NOT_FOUND"},{status:404});
 const [consultations,sessions,decisions,notes,metrics,alerts,appointments,templates,events]=await Promise.all([
  db.prepare("SELECT * FROM consultations WHERE patient_id=? AND tenant_id=? ORDER BY created_at DESC").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM treatment_sessions WHERE patient_id=? AND tenant_id=? ORDER BY session_number DESC").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM clinical_decisions WHERE patient_id=? AND tenant_id=? ORDER BY effective_at DESC").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM doctor_notes WHERE patient_id=? AND tenant_id=? ORDER BY created_at DESC").bind(patientId,tenantId).all(),
  db.prepare("SELECT am.* FROM assessment_metrics am JOIN assessments a ON a.id=am.assessment_id WHERE a.patient_id=? AND am.tenant_id=? ORDER BY am.measured_at").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM alerts WHERE patient_id=? AND tenant_id=? ORDER BY CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,due_at").bind(patientId,tenantId).all(),
  db.prepare("SELECT * FROM appointments WHERE patient_id=? AND tenant_id=? ORDER BY starts_at DESC").bind(patientId,tenantId).all(),
  db.prepare("SELECT cc.*,(SELECT COUNT(*) FROM approvals ap WHERE ap.entity_id=cc.id AND ap.status='approved') approval_count FROM clinical_configurations cc WHERE cc.tenant_id=? ORDER BY cc.config_key,cc.version DESC").bind(tenantId).all(),
  db.prepare("SELECT * FROM journey_events WHERE journey_id=? AND tenant_id=? ORDER BY occurred_at DESC LIMIT 50").bind(patient.journey_id,tenantId).all()
 ]);
 return NextResponse.json({patients:patients.results,detail:{patient,consultations:consultations.results,sessions:sessions.results,decisions:decisions.results,notes:notes.results,metrics:metrics.results,appointments:appointments.results,events:events.results},alerts:alerts.results,templates:templates.results,roles:ctx.roles});
}
