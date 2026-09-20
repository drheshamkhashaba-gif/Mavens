const allowedActions=new Set(["task_complete","task_skip","request_reschedule","send_message","save_preferences","submit_checkin","appointment_confirm","appointment_cancel","marketing_consent","submit_outcome"]);
export function validatePatientAction(body){
 if(!body||!allowedActions.has(body.action))throw new Error("UNKNOWN_ACTION");
 if(body.action==="task_skip"&&!String(body.reason||"").trim())throw new Error("SKIP_REASON_REQUIRED");
 if(body.action==="send_message"&&!String(body.message||"").trim())throw new Error("MESSAGE_REQUIRED");
 if(body.action==="request_reschedule"&&(!body.appointmentId||!body.preferredStartsAt||!String(body.reason||"").trim()))throw new Error("RESCHEDULE_DETAILS_REQUIRED");
 if(body.action==="submit_checkin"&&(!Number.isInteger(Number(body.rating))||Number(body.rating)<1||Number(body.rating)>5))throw new Error("RATING_OUT_OF_RANGE");
 if(body.action==="submit_outcome"&&(!Number.isInteger(Number(body.rating))||Number(body.rating)<1||Number(body.rating)>5))throw new Error("RATING_OUT_OF_RANGE");
 return true;
}
