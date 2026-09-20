export const SEVERITIES=["mid_to_moderate","severe"];
export const SESSION_DEVICES=["Accure","Pico","Fractional"];

export function validateConsultation(input){
 if(!SEVERITIES.includes(input.severity))throw new Error("INVALID_SEVERITY");
 if(!input.clinicalConclusion?.trim())throw new Error("CLINICAL_CONCLUSION_REQUIRED");
 if(!input.targetOutcome?.trim())throw new Error("TARGET_OUTCOME_REQUIRED");
 if(!input.routine?.trim())throw new Error("ROUTINE_REQUIRED");
 return true;
}
export function validateSession(input){
 if(!SESSION_DEVICES.includes(input.deviceType))throw new Error("INVALID_DEVICE");
 if(!input.rationale?.trim())throw new Error("RATIONALE_REQUIRED");
 if(!Number.isInteger(input.sessionNumber)||input.sessionNumber<1)throw new Error("INVALID_SESSION_NUMBER");
 return true;
}
export function validateDailyDecision(input){
 if(!["no_change","personal_message","modify_instructions","recall_early"].includes(input.decision))throw new Error("INVALID_DECISION");
 if(!input.rationale?.trim())throw new Error("RATIONALE_REQUIRED");
 return true;
}
