export const AUTOMATION_KEYS=["appointment_24h","post_session_t1","missed_routine","weekly_checkin"];
const localized=(row,ar,en)=>row.preferred_language==="en"?en:ar;
export function automationCandidates({now,appointments=[],sessions=[],tasks=[]}){
 const at=new Date(now),day=86400000,out=[];
 for(const a of appointments){const diff=new Date(a.starts_at)-at;if(diff>0&&diff<=day)out.push({ruleKey:"appointment_24h",patientId:a.patient_id,sourceId:a.id,scheduledFor:now,body:localized(a,`تذكير: موعدك القادم ${a.service_name}.`,`Reminder: your upcoming ${a.service_name} appointment.`)})}
 for(const s of sessions){const diff=at-new Date(s.completed_at);if(diff>=day&&diff<day*2)out.push({ruleKey:"post_session_t1",patientId:s.patient_id,sourceId:s.id,scheduledFor:now,body:localized(s,"كيف تشعر بشرتك اليوم بعد الجلسة؟ أكمل فحص المتابعة القصير.","How is your skin today after the session? Complete the short follow-up check-in.")})}
 for(const task of tasks){if(task.status==="pending"&&new Date(`${task.scheduled_for}T23:59:59Z`)<at)out.push({ruleKey:"missed_routine",patientId:task.patient_id,sourceId:task.id,scheduledFor:now,body:localized(task,"لاحظنا أن خطوة من روتينك لم تُسجل. أخبرنا إن كنت تحتاج مساعدة.","A routine step was not recorded. Tell us if you need help.")})}
 return out.map(x=>({...x,dedupeKey:`${x.ruleKey}:${x.sourceId}`}));
}
