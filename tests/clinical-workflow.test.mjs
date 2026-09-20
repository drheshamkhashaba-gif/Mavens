import test from "node:test";
import assert from "node:assert/strict";
import {validateConsultation,validateDailyDecision,validateSession} from "../lib/clinical-workflow.mjs";

test("consultation accepts only the two approved severity labels",()=>{assert.equal(validateConsultation({severity:"severe",clinicalConclusion:"Physician finding",targetOutcome:"Control active lesions",routine:"Approved draft routine"}),true);assert.throws(()=>validateConsultation({severity:"mild",clinicalConclusion:"x",targetOutcome:"x",routine:"x"}),/INVALID_SEVERITY/)});
test("session requires physician rationale and a supported device",()=>{assert.equal(validateSession({deviceType:"Accure",rationale:"Inflammation remains active",sessionNumber:1}),true);assert.throws(()=>validateSession({deviceType:"Pico",rationale:"",sessionNumber:1}),/RATIONALE_REQUIRED/)});
test("daily review decision requires rationale",()=>assert.throws(()=>validateDailyDecision({decision:"recall_early",rationale:""}),/RATIONALE_REQUIRED/));
