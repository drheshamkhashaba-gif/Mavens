import {NextResponse} from "next/server";
import {requireOperationalContext,operationalRole,clinicalRole} from "@/lib/server-access";
import {validateIntake,viewTypes} from "@/lib/intake-options";
export const dynamic="force-dynamic";
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
async function context(request:Request,write=false){
 const ctx=await requireOperationalContext();if("error" in ctx)return fail(ctx.error||"AUTHENTICATION_REQUIRED",ctx.status||401);
 if(!(operationalRole(ctx.roles)||(!write&&clinicalRole(ctx.roles))))return fail("FORBIDDEN",403);
 const patientId=new URL(request.url).searchParams.get("patientId")||"";
 const patient=await ctx.db.prepare("SELECT id FROM patients WHERE id=? AND tenant_id=? AND clinic_id=? AND archived_at IS NULL").bind(patientId,ctx.tenantId,ctx.clinicId).first();
 if(!patient)return fail("PATIENT_NOT_FOUND",404);return {...ctx,patientId};
}
export async function GET(request:Request){
 const c=await context(request);if(c instanceof Response)return c;
 const {db,patientId,tenantId,clinicId}=c;
 try{
 const id=new URL(request.url).searchParams.get("documentId");
 if(id){const d=await db.prepare("SELECT * FROM intake_documents WHERE id=? AND patient_id=? AND tenant_id=? AND clinic_id=?").bind(id,patientId,tenantId,clinicId).first<any>();if(!d)return fail("NOT_FOUND",404);
 const chunks=await db.prepare("SELECT bytes FROM intake_document_chunks WHERE document_id=? ORDER BY ordinal").bind(id).all<{bytes:number[]}>();
 const bytes=new Uint8Array(Number(d.size));let offset=0;for(const row of chunks.results){const a=new Uint8Array(row.bytes);bytes.set(a,offset);offset+=a.length;}
 if(offset!==bytes.length)return fail("INCOMPLETE_FILE",500);
 return new Response(bytes,{headers:{"Content-Type":d.mime,"Content-Disposition":`inline; filename="document.${d.mime==='application/pdf'?'pdf':d.mime==='image/png'?'png':'jpg'}"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});}
 const assessment=await db.prepare("SELECT data_json,version,updated_at FROM intake_assessments WHERE patient_id=? AND tenant_id=? AND clinic_id=?").bind(patientId,tenantId,clinicId).first<any>();
 const docs=await db.prepare("SELECT id,kind,view_type,filename,mime,size,created_at FROM intake_documents WHERE patient_id=? AND tenant_id=? AND clinic_id=? ORDER BY created_at DESC").bind(patientId,tenantId,clinicId).all();
 return NextResponse.json({data:assessment?JSON.parse(assessment.data_json):{},version:assessment?.version||0,documents:docs.results},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("INTAKE_STORAGE_UNAVAILABLE",503);}
}
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return fail("FORBIDDEN_ORIGIN",403);
 const c=await context(request,true);if(c instanceof Response)return c;
 const {db,patientId,tenantId,clinicId,user}=c;const now=new Date().toISOString();
 try{
 if(request.headers.get("content-type")?.includes("multipart/form-data")){
 if(Number(request.headers.get("content-length")||0)>11*1024*1024)return fail("FILE_TOO_LARGE",413);
 const form=await request.formData();const file=form.get("file"),kind=String(form.get("kind")),view=String(form.get("view")||"");
 if(!(file instanceof File)||!['image','report'].includes(kind)||!file.size||file.size>10*1024*1024)return fail("INVALID_FILE_MAX_10_MB");
 if(kind==='image'&&!viewTypes.includes(view))return fail("SELECT_IMAGE_VIEW");
 const allowed=kind==='image'?['image/jpeg','image/png']:['application/pdf','image/jpeg','image/png'];if(!allowed.includes(file.type))return fail("ONLY_JPEG_PNG_OR_PDF");
 const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);const signature=file.type==='application/pdf'?new TextDecoder().decode(bytes.slice(0,5))==='%PDF-':file.type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!signature)return fail("INVALID_FILE_CONTENT");
 const assessment=await db.prepare("SELECT data_json FROM intake_assessments WHERE patient_id=? AND tenant_id=? AND clinic_id=?").bind(patientId,tenantId,clinicId).first<any>();
 if(!assessment||JSON.parse(assessment.data_json).consent!=='yes')return fail("SAVE_IMAGING_CONSENT_FIRST",409);
 const count=await db.prepare("SELECT COUNT(*) AS n FROM intake_documents WHERE patient_id=?").bind(patientId).first<{n:number}>();if(Number(count?.n)>=20)return fail("MAX_20_DOCUMENTS",409);
 const id=crypto.randomUUID();const statements=[db.prepare("INSERT INTO intake_documents (id,patient_id,tenant_id,clinic_id,kind,view_type,filename,mime,size,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id,patientId,tenantId,clinicId,kind,view,file.name.slice(0,180),file.type,file.size,now,user.id)];
 for(let i=0;i<bytes.length;i+=256*1024)statements.push(db.prepare("INSERT INTO intake_document_chunks (document_id,ordinal,bytes) VALUES (?,?,?)").bind(id,i/(256*1024),buffer.slice(i,i+256*1024)));
 statements.push(db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,occurred_at,created_at,updated_at) VALUES (?,?,?,'intake_document',?,'uploaded',?,?,?)").bind(crypto.randomUUID(),tenantId,user.id,id,now,now,now));await db.batch(statements);return NextResponse.json({ok:true});
 }
 const body=await request.json();if(!validateIntake(body.data)||!Number.isInteger(body.version)||body.version<0)return fail("INVALID_INTAKE");
 const existing=await db.prepare("SELECT version FROM intake_assessments WHERE patient_id=?").bind(patientId).first<{version:number}>();
 if((existing?.version||0)!==body.version)return fail("RELOAD_CONCURRENT_UPDATE",409);
 const result=existing?await db.prepare("UPDATE intake_assessments SET data_json=?,version=version+1,updated_at=?,updated_by=? WHERE patient_id=? AND version=?").bind(JSON.stringify(body.data),now,user.id,patientId,body.version).run():await db.prepare("INSERT OR IGNORE INTO intake_assessments (patient_id,tenant_id,clinic_id,data_json,updated_at,updated_by) VALUES (?,?,?,?,?,?)").bind(patientId,tenantId,clinicId,JSON.stringify(body.data),now,user.id).run();
 if(!result.meta.changes)return fail("RELOAD_CONCURRENT_UPDATE",409);
 await db.prepare("INSERT INTO audit_logs (id,tenant_id,actor_id,entity_type,entity_id,action,occurred_at,created_at,updated_at) VALUES (?,?,?,'intake_assessment',?,'saved',?,?,?)").bind(crypto.randomUUID(),tenantId,user.id,patientId,now,now,now).run();
 return NextResponse.json({ok:true,version:body.version+1});
 }catch{return fail("INTAKE_SAVE_FAILED",500);}
}
