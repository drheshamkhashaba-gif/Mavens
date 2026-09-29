import {GET as getReports,POST as generateReport} from '@/lib/skin-ai-service';
export const dynamic='force-dynamic';
export async function GET(request:Request){return getReports(request)}
export async function POST(request:Request){return generateReport(request)}
