import {NextResponse} from 'next/server';
import {requireOperationalContext,clinicalRole} from '@/lib/server-access';
import {POST as generateReport} from '@/lib/skin-ai-service';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
const fail=(error:string,status=400)=>json({error},status);
async function context(request:Request,write=false){
 const c=await requireOperationalContext();if('error' in c)return fail(c.error||'AUTHENTICATION_REQUIRED',c.status||401);
 const requested=new URL(request.url).searchParams.get('patientId');
 const own=await c.db.prepare('SELECT id,clinic_id FROM patients WHERE profile_id=? AND tenant_id=? AND archived_at IS NULL ORDER BY id').bind(c.user.id,c.tenantId).all<{id:string;clinic_id:string}>();
 const patient=own.results.find((p:{id:string;clinic_id:string})=>!requested||p.id===requested);
 if(patient)return {...c,patientId:patient.id,clinicId:patient.clinic_id,roles:['patient'],preview:false};
 if(write||!requested)return fail('PATIENT_NOT_LINKED',403);
 const p=await c.db.prepare('SELECT id,clinic_id FROM patients WHERE id=? AND tenant_id=? AND archived_at IS NULL').bind(requested,c.tenantId).first<{id:string;clinic_id:string}>();if(!p)return fail('PATIENT_NOT_FOUND',404);
 const a=await c.db.prepare("SELECT role FROM role_assignments WHERE user_id=? AND tenant_id=? AND clinic_id=? AND status='active'").bind(c.user.id,c.tenantId,p.clinic_id).all<{role:string}>();
 const roles=a.results.map((x:{role:string})=>x.role);if(!clinicalRole(roles)&&!roles.includes('clinic_admin'))return fail('FORBIDDEN',403);
 return {...c,patientId:p.id,clinicId:p.clinic_id,roles,preview:true};
}
async function initialize(db:D1Database){await db.prepare('CREATE TABLE IF NOT EXISTS home_skin_sessions (id TEXT PRIMARY KEY,patient_id TEXT NOT NULL,tenant_id TEXT NOT NULL,clinic_id TEXT NOT NULL,images_json TEXT NOT NULL,created_at TEXT NOT NULL,created_by TEXT NOT NULL,consent_version TEXT NOT NULL)').run();}
const report=(r:any)=>r?{id:r.id,document_id:r.document_id,status:r.status,created_at:r.created_at,error_code:r.error_code,report:r.report_json?JSON.parse(r.report_json):null}:null;
export async function GET(request:Request){try{
 const c=await context(request);if(c instanceof Response)return c;
 const {db,patientId,tenantId,clinicId}=c;const args=[patientId,tenantId,clinicId];
 const documentId=new URL(request.url).searchParams.get('documentId');
 if(documentId){const d=await db.prepare("SELECT mime,size FROM intake_documents WHERE id=? AND patient_id=? AND tenant_id=? AND clinic_id=? AND kind IN ('image','report','home_image')").bind(documentId,...args).first<any>();if(!d)return fail('NOT_FOUND',404);
 if(!['image/jpeg','image/png','application/pdf'].includes(d.mime)||d.size>10*1024*1024)return fail('INVALID_DOCUMENT');
 const rows=await db.prepare('SELECT bytes FROM intake_document_chunks WHERE document_id=? ORDER BY ordinal').bind(documentId).all<{bytes:number[]}>();const bytes=new Uint8Array(d.size);let offset=0;for(const row of rows.results){const chunk=new Uint8Array(row.bytes);bytes.set(chunk,offset);offset+=chunk.length;}if(offset!==bytes.length)return fail('INCOMPLETE_FILE',500);
 return new Response(bytes,{headers:{'Content-Type':d.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox','Content-Disposition':'inline'}});}
 const intake=await db.prepare('SELECT data_json,updated_at FROM intake_assessments WHERE patient_id=? AND tenant_id=? AND clinic_id=?').bind(...args).first<any>();
 const documents=await db.prepare("SELECT id,kind,view_type,created_at FROM intake_documents WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND kind IN ('image','report') ORDER BY created_at,id").bind(...args).all();
 const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skin_ai_reports'").first();let baseline=null,homeReports:any[]=[];
 if(exists){baseline=report(await db.prepare("SELECT * FROM skin_ai_reports WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND status='completed' AND consent_version!='openai-home-v1' ORDER BY created_at,id LIMIT 1").bind(...args).first());const rows=await db.prepare("SELECT * FROM skin_ai_reports WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND consent_version='openai-home-v1' ORDER BY created_at DESC LIMIT 10").bind(...args).all();homeReports=rows.results.map(report);}
 const sessionTable=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='home_skin_sessions'").first();const sessions=sessionTable?(await db.prepare('SELECT id,images_json,created_at FROM home_skin_sessions WHERE patient_id=? AND tenant_id=? AND clinic_id=? ORDER BY created_at DESC LIMIT 10').bind(...args).all<any>()).results.map((s:{id:string;images_json:string;created_at:string})=>({id:s.id,images:JSON.parse(s.images_json),created_at:s.created_at})):[];
 const {env}=await import('cloudflare:workers');
 return json({baseline,registration:baseline?.report?.intakeSnapshot||(intake?JSON.parse(intake.data_json):{}),registrationSnapshot:!!baseline?.report?.intakeSnapshot,registrationUpdatedAt:intake?.updated_at,registrationDocuments:documents.results,homeReports,sessions,preview:c.preview,configured:!!(env as any).OPENAI_API_KEY});
 }catch{return fail('SKIN_LOAD_FAILED',503);}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return fail('FORBIDDEN_ORIGIN',403);
 try{const c=await context(request,true);if(c instanceof Response)return c;const {db,patientId,tenantId,clinicId,user}=c;await initialize(db);
 if(request.headers.get('content-type')?.includes('multipart/form-data')){
 // Read at most 7 MiB even when Content-Length is absent.
 const reader=request.body?.getReader();if(!reader)return fail('INVALID_UPLOAD');const parts:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>7*1024*1024){await reader.cancel();return fail('UPLOAD_TOO_LARGE',413);}parts.push(value);}
 const data=new Uint8Array(total);let offset=0;for(const p of parts){data.set(p,offset);offset+=p.length;}
 const form=await new Response(data,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();if(form.get('consent')!=='yes')return fail('PHOTO_CONSENT_REQUIRED');
 const files=form.getAll('images');if(files.length!==3)return fail('THREE_VIEWS_REQUIRED');
 const images=[];const now=new Date().toISOString();const sessionId=crypto.randomUUID();const statements=[];
 const count=await db.prepare('SELECT COUNT(*) AS n FROM home_skin_sessions WHERE patient_id=? AND tenant_id=? AND clinic_id=?').bind(patientId,tenantId,clinicId).first<{n:number}>();if((count?.n||0)>=30)return fail('HOME_STORAGE_LIMIT',409);
 for(let i=0;i<3;i++){const f=files[i];if(!(f instanceof File)||!['image/jpeg','image/png'].includes(f.type)||!f.size||f.size>2*1024*1024)return fail('JPEG_PNG_MAX_2_MB');const buffer=await f.arrayBuffer(),bytes=new Uint8Array(buffer);const valid=f.type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!valid)return fail('INVALID_IMAGE_CONTENT');
 const id=crypto.randomUUID(),angle=['Front','Left oblique','Right oblique'][i];images.push({id,angle,mode:'Daylight'});
 statements.push(db.prepare('INSERT INTO intake_documents (id,patient_id,tenant_id,clinic_id,kind,view_type,filename,mime,size,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,patientId,tenantId,clinicId,'home_image',angle,`home-${i+1}.${f.type==='image/png'?'png':'jpg'}`,f.type,f.size,now,user.id));
 for(let j=0;j<bytes.length;j+=256*1024)statements.push(db.prepare('INSERT INTO intake_document_chunks (document_id,ordinal,bytes) VALUES (?,?,?)').bind(id,j/(256*1024),buffer.slice(j,j+256*1024)));
 }
 // Reserve a bounded upload slot; dependent document writes are atomic.
 const admission=db.prepare("INSERT INTO home_skin_sessions (id,patient_id,tenant_id,clinic_id,images_json,created_at,created_by,consent_version) SELECT ?,?,?,?,?,?,?,'home-storage-v1' WHERE (SELECT COUNT(*) FROM home_skin_sessions WHERE patient_id=? AND tenant_id=? AND clinic_id=? AND created_at>=?)<3 AND (SELECT COUNT(*) FROM home_skin_sessions WHERE patient_id=? AND tenant_id=? AND clinic_id=?)<30").bind(sessionId,patientId,tenantId,clinicId,JSON.stringify(images),now,user.id,patientId,tenantId,clinicId,now.slice(0,10),patientId,tenantId,clinicId);
 // Reserve before writing bytes. A failed write removes the reservation for a clean retry.
 const reserved=await admission.run();if(!reserved.meta.changes)return fail('HOME_UPLOAD_RATE_LIMIT',429);
 statements.push(db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,occurred_at,created_at,updated_at) VALUES (?,?,?,'home_skin_session',?,'photos_consented_and_uploaded',?,?,?)").bind(crypto.randomUUID(),tenantId,user.id,sessionId,now,now,now));
 try{await db.batch(statements);}catch(e){await db.prepare('DELETE FROM home_skin_sessions WHERE id=?').bind(sessionId).run();throw e;}
 return json({ok:true,sessionId});
 }
 const raw=await request.text();if(raw.length>1000)return fail('INVALID_REQUEST');const body=JSON.parse(raw);
 if(body.action!=='generate'||body.consent!==true||!['ar','en'].includes(body.language)||typeof body.sessionId!=='string')return fail('EXPLICIT_AI_CONSENT_REQUIRED');
 const session=await db.prepare('SELECT images_json FROM home_skin_sessions WHERE id=? AND patient_id=? AND tenant_id=? AND clinic_id=?').bind(body.sessionId,patientId,tenantId,clinicId).first<{images_json:string}>();if(!session)return fail('SESSION_NOT_FOUND',404);
 const inner=new Request(request.url,{method:'POST',body:JSON.stringify({action:'generate',consent:true,language:body.language,images:JSON.parse(session.images_json)})});
 return generateReport(inner,async()=>c,true);
 }catch{return fail('HOME_ASSESSMENT_FAILED',500);}
}
