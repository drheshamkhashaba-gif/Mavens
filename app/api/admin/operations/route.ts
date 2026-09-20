import { NextResponse } from "next/server";
import { operationalRole,requireOperationalContext } from "@/lib/server-access";
export const dynamic="force-dynamic";

export async function GET(){
 const ctx=await requireOperationalContext(); if("error" in ctx) return NextResponse.json({error:ctx.error},{status:ctx.status});
 if(!operationalRole(ctx.roles)) return NextResponse.json({error:"FORBIDDEN"},{status:403});
 const {db,tenantId,clinicId}=ctx;
 const [patients,intakes,imaging,appointments,reschedules]=await Promise.all([
  db.prepare("SELECT p.id,p.reference_code,p.status,pp.full_name_ar,pp.full_name_en,pp.mobile,pp.preferred_language,j.current_state,j.completed_sessions,j.session_target,ri.profile_completeness FROM patients p LEFT JOIN patient_profiles pp ON pp.patient_id=p.id LEFT JOIN journey_instances j ON j.patient_id=p.id LEFT JOIN reception_intakes ri ON ri.patient_id=p.id WHERE p.tenant_id=? AND p.clinic_id=? AND p.archived_at IS NULL ORDER BY p.created_at DESC LIMIT 100").bind(tenantId,clinicId).all(),
  db.prepare("SELECT ri.*,p.reference_code,pp.full_name_ar,pp.full_name_en FROM reception_intakes ri JOIN patients p ON p.id=ri.patient_id LEFT JOIN patient_profiles pp ON pp.patient_id=p.id WHERE ri.tenant_id=? AND ri.clinic_id=? AND ri.status NOT IN ('doctor_notified','closed') ORDER BY ri.created_at").bind(tenantId,clinicId).all(),
  db.prepare("SELECT ic.*,p.reference_code,pp.full_name_ar,pp.full_name_en FROM imaging_checklists ic JOIN patients p ON p.id=ic.patient_id LEFT JOIN patient_profiles pp ON pp.patient_id=p.id WHERE ic.tenant_id=? AND ic.clinic_id=? AND ic.status!='completed' ORDER BY ic.created_at").bind(tenantId,clinicId).all(),
  db.prepare("SELECT a.*,p.reference_code,pp.full_name_ar,pp.full_name_en FROM appointments a JOIN patients p ON p.id=a.patient_id LEFT JOIN patient_profiles pp ON pp.patient_id=p.id WHERE a.tenant_id=? AND p.clinic_id=? AND a.status IN ('scheduled','confirmed') ORDER BY a.starts_at LIMIT 100").bind(tenantId,clinicId).all(),
  db.prepare("SELECT rr.*,p.reference_code,pp.full_name_ar,pp.full_name_en FROM reschedule_requests rr JOIN patients p ON p.id=rr.patient_id LEFT JOIN patient_profiles pp ON pp.patient_id=p.id WHERE rr.tenant_id=? AND rr.clinic_id=? AND rr.status='pending' ORDER BY rr.created_at").bind(tenantId,clinicId).all()
 ]);
 return NextResponse.json({patients:patients.results,intakes:intakes.results,imaging:imaging.results,appointments:appointments.results,reschedules:reschedules.results,roles:ctx.roles});
}
