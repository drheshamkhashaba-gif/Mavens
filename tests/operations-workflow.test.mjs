import test from "node:test";
import assert from "node:assert/strict";
import {hasScheduleConflict,receptionStep} from "../lib/operations-workflow.mjs";

test("reception follows arrival consent imaging handoff order",()=>{
 assert.equal(receptionStep({status:"awaiting_arrival",consentStatus:"pending",action:"check_in"}),"checked_in");
 assert.equal(receptionStep({status:"checked_in",consentStatus:"signed",action:"send_to_imaging"}),"imaging");
 assert.equal(receptionStep({status:"imaging",consentStatus:"signed",action:"complete_imaging"}),"ready_for_doctor");
});
test("reception cannot bypass medical consent",()=>assert.throws(()=>receptionStep({status:"checked_in",consentStatus:"pending",action:"send_to_imaging"}),/INVALID_RECEPTION_STEP/));
test("resource collision blocks an approved reschedule",()=>assert.equal(hasScheduleConflict([{id:"a1",startsAt:"2026-09-16T14:00:00Z",status:"confirmed",providerId:"d1",deviceId:"accure",roomId:"r1"}],{appointmentId:"a2",startsAt:"2026-09-16T14:00:00Z",providerId:"d1",deviceId:"pico",roomId:"r2"}),true));
