import {NextResponse} from 'next/server';
import {requireOperationalContext,operationalRole,clinicalRole} from '@/lib/server-access';
import {skinSchema,skinInstructions,validSkinDraft} from '@/lib/skin-assessment';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
const fail=(error:string,status=400)=>json({error},status);
async function settings(){const {env}=await import('cloudflare:workers');return env as unknown as {OPENAI_API_KEY?:string;OPENAI_SKIN_MODEL?:string};}
async function context(request:Request){
 const c=await requireOperationalContext();if('error' in c)return fail(c.error,c.status);
 const patientId=new URL(request.url).searchParams.get('patientId')||'';
 // Re-scope roles: another clinic's role must not grant access here.
 const assignments=await c.db.prepare("SELECT role FROM role_assignments WHERE user_id=? AND tenant_id=? AND clinic_id=? AND status='active'").bind(c.user.id,c.tenantId,c.clinicId).all<{role:string}>();
 const roles=assignments.results.map(r=>r.role);
 if(!operationalRole(roles)&&!clinicalRole(roles))return fail('FORBIDDEN',403);
 const p=await c.db.prepare('SELECT id FROM patients WHERE id=? AND tenant_id=? AND clinic_id=? AND archived_at IS NULL').bind(patientId,c.tenantId,c.clinicId).first();
 if(!p)return fail('PATIENT_NOT_FOUND',404);
 return {...c,roles,patientId};
}
async function initialize(db:D1Database){await db.batch([
 db.prepare("CREATE TABLE IF NOT EXISTS skin_ai_reports (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), tenant_id TEXT NOT NULL, clinic_id TEXT NOT NULL, document_id TEXT NOT NULL, status TEXT NOT NULL, report_json TEXT, model TEXT NOT NULL, language TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL, error_code TEXT, consent_version TEXT NOT NULL)"),
 db.prepare('CREATE INDEX IF NOT EXISTS skin_ai_patient ON skin_ai_reports(tenant_id,clinic_id,patient_id,created_at)'),
 db.prepare('CREATE TABLE IF NOT EXISTS skin_ai_comments (id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES skin_ai_reports(id), comment TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL)')
]);}
export async function GET(request:Request){try{
 const c=await context(request);if(c instanceof Response)return c;
 const configured=!!(await settings()).OPENAI_API_KEY;
 const exists=await c.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skin_ai_reports'").first();
 if(!exists)return json({configured,canComment:clinicalRole(c.roles),reports:[]});
 const result=await c.db.prepare('SELECT id,document_id,status,report_json,model,language,created_at,error_code FROM skin_ai_reports WHERE patient_id=? AND tenant_id=? AND clinic_id=? ORDER BY created_at DESC LIMIT 10').bind(c.patientId,c.tenantId,c.clinicId).all<any>();
 const reports=[];
 for(const row of result.results){const comments=await c.db.prepare('SELECT comment,created_by,created_at FROM skin_ai_comments WHERE report_id=? ORDER BY created_at').bind(row.id).all();reports.push({...row,report:row.report_json?JSON.parse(row.report_json):null,report_json:undefined,comments:comments.results});}
 return json({configured,canComment:clinicalRole(c.roles),reports});
 }catch{return fail('AI_STORAGE_UNAVAILABLE',503);}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return fail('FORBIDDEN_ORIGIN',403);
 let c;try{c=await context(request);}catch{return fail('AI_STORAGE_UNAVAILABLE',503);}if(c instanceof Response)return c;
 const {db,patientId,tenantId,clinicId,user}=c;
 let body;try{const raw=await request.text();if(raw.length>12000)return fail('REQUEST_TOO_LARGE',413);body=JSON.parse(raw);}catch{return fail('INVALID_REQUEST');}
 const now=new Date().toISOString();
 const audit=(id:string,action:string)=>db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,occurred_at,created_at,updated_at) VALUES (?,?,?,'skin_ai_report',?,?,?,?,?)").bind(crypto.randomUUID(),tenantId,user.id,id,action,now,now,now);
 let runId='';
 try{
 if(body.action==='comment'){
 if(!clinicalRole(c.roles))return fail('PHYSICIAN_REQUIRED',403);
 if(typeof body.comment!=='string'||!body.comment.trim()||body.comment.length>5000||typeof body.reportId!=='string')return fail('INVALID_COMMENT');
 await initialize(db);
 const r=await db.prepare("SELECT id FROM skin_ai_reports WHERE id=? AND patient_id=? AND tenant_id=? AND clinic_id=? AND status='completed'").bind(body.reportId,patientId,tenantId,clinicId).first();if(!r)return fail('REPORT_NOT_FOUND',404);
 await db.batch([db.prepare('INSERT INTO skin_ai_comments (id,report_id,comment,created_by,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),body.reportId,body.comment.trim(),user.id,now),audit(body.reportId,'comment_added')]);return json({ok:true});
 }
 if(body.action!=='generate'||body.consent!==true||typeof body.documentId!=='string'||!['en','ar'].includes(body.language))return fail('EXPLICIT_AI_CONSENT_REQUIRED');
 const env=await settings();if(!env.OPENAI_API_KEY)return fail('OPENAI_KEY_NOT_CONFIGURED',503);
 const document=await db.prepare("SELECT id,mime,size,view_type FROM intake_documents WHERE id=? AND patient_id=? AND tenant_id=? AND clinic_id=? AND kind='image'").bind(body.documentId,patientId,tenantId,clinicId).first<any>();if(!document)return fail('IMAGE_NOT_FOUND',404);
 if(!['image/jpeg','image/png'].includes(document.mime)||document.size>10*1024*1024)return fail('INVALID_IMAGE');
 const intake=await db.prepare('SELECT data_json FROM intake_assessments WHERE patient_id=? AND tenant_id=? AND clinic_id=?').bind(patientId,tenantId,clinicId).first<any>();if(!intake||JSON.parse(intake.data_json).consent!=='yes')return fail('SAVE_IMAGING_CONSENT_FIRST',409);
 await initialize(db);
 const id=crypto.randomUUID(),model=env.OPENAI_SKIN_MODEL||'gpt-4.1-mini';
 // Atomic admission: one request per patient per 3 minutes, five/day and 50/tenant/day.
 const admitted=await db.prepare("INSERT INTO skin_ai_reports (id,patient_id,tenant_id,clinic_id,document_id,status,model,language,created_at,created_by,consent_version) SELECT ?,?,?,?,?,'pending',?,?,?,?, 'openai-image-v1' WHERE NOT EXISTS (SELECT 1 FROM skin_ai_reports WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND created_at>?) AND (SELECT COUNT(*) FROM skin_ai_reports WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND created_at>=?)<5 AND (SELECT COUNT(*) FROM skin_ai_reports WHERE tenant_id=? AND created_at>=?)<50").bind(id,patientId,tenantId,clinicId,document.id,model,body.language,now,user.id,patientId,tenantId,clinicId,new Date(Date.now()-180000).toISOString(),patientId,tenantId,clinicId,now.slice(0,10),tenantId,now.slice(0,10)).run();
 if(!admitted.meta.changes)return fail('AI_RATE_LIMIT',429);runId=id;
 await audit(id,'ai_consent_and_request').run();
 const chunks=await db.prepare('SELECT bytes FROM intake_document_chunks WHERE document_id=? ORDER BY ordinal').bind(document.id).all<{bytes:number[]}>();
 const bytes=new Uint8Array(document.size);let offset=0;for(const row of chunks.results){const a=new Uint8Array(row.bytes);bytes.set(a,offset);offset+=a.length;}if(offset!==bytes.length)throw Error('INCOMPLETE_IMAGE');
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(90000),headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,max_output_tokens:6000,instructions:skinInstructions(body.language),input:[{role:'user',content:[{type:'input_text',text:`Assess this one uploaded image. Recorded view label (not verified): ${document.view_type}. No patient history or device scores supplied.`},{type:'input_image',image_url:`data:${document.mime};base64,${btoa(binary)}`,detail:'high'}]}],text:{format:{type:'json_schema',name:'skin_visual_draft',strict:true,schema:skinSchema}}})});
 if(!response.ok)throw Error(response.status===401||response.status===403?'OPENAI_AUTH_ERROR':response.status===429?'OPENAI_QUOTA_OR_RATE_LIMIT':'OPENAI_REQUEST_FAILED');
 const result=await response.json() as any;
 if(result.status!=='completed')throw Error('AI_INCOMPLETE_OUTPUT');
 const parts=(result.output||[]).flatMap((o:any)=>o.content||[]);if(parts.some((p:any)=>p.type==='refusal'))throw Error('AI_UNABLE_TO_ASSESS');
 let report;try{report=JSON.parse(parts.filter((p:any)=>p.type==='output_text').map((p:any)=>p.text).join(''));}catch{throw Error('AI_INVALID_OUTPUT');}
 if(!validSkinDraft(report))throw Error('AI_INVALID_OUTPUT');
 await db.batch([db.prepare("UPDATE skin_ai_reports SET status='completed',report_json=? WHERE id=?").bind(JSON.stringify(report),id),audit(id,'draft_generated')]);
 return json({ok:true,id});
 }catch(e){const allowed=['INCOMPLETE_IMAGE','OPENAI_AUTH_ERROR','OPENAI_QUOTA_OR_RATE_LIMIT','OPENAI_REQUEST_FAILED','AI_INCOMPLETE_OUTPUT','AI_UNABLE_TO_ASSESS','AI_INVALID_OUTPUT'];const message=e instanceof Error?e.message:'';const code=e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError')?'AI_TIMEOUT':allowed.includes(message)?message:'AI_REQUEST_FAILED';
 if(runId)try{await db.prepare("UPDATE skin_ai_reports SET status='failed',error_code=? WHERE id=?").bind(code,runId).run();}catch{}
 return fail(code,502);
 }
}
