import test from "node:test";
import assert from "node:assert/strict";
import {validatePatientAction} from "../lib/patient-workflow.mjs";
test("accepts durable patient actions",()=>assert.equal(validatePatientAction({action:"send_message",message:"Need help"}),true));
test("requires a skip reason",()=>assert.throws(()=>validatePatientAction({action:"task_skip"}),/SKIP_REASON_REQUIRED/));
test("limits patient ratings",()=>assert.throws(()=>validatePatientAction({action:"submit_checkin",rating:6}),/RATING_OUT_OF_RANGE/));
test("requires complete reschedule details",()=>assert.throws(()=>validatePatientAction({action:"request_reschedule",appointmentId:"a"}),/RESCHEDULE_DETAILS_REQUIRED/));
