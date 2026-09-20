import test from "node:test";
import assert from "node:assert/strict";
import {transitionJourney} from "../lib/journey-engine.mjs";

test("journey follows documented event transitions",()=>assert.equal(transitionJourney({currentState:"REGISTERED",event:"assessment_started",actorRoles:["reception"]}).toState,"ASSESSMENT"));
test("journey blocks undocumented state jumps",()=>assert.throws(()=>transitionJourney({currentState:"REGISTERED",event:"consultation_closed",actorRoles:["doctor"]}),/INVALID_TRANSITION/));
test("clinical transitions require a physician role",()=>assert.throws(()=>transitionJourney({currentState:"CONSULTATION",event:"consultation_closed",reason:"plan_approved",actorRoles:["reception"]}),/CLINICAL_ROLE_REQUIRED/));
test("hold and cancellation require an auditable reason",()=>assert.throws(()=>transitionJourney({currentState:"ACTIVE_TREATMENT",event:"put_on_hold",actorRoles:["clinic_admin"]}),/REASON_REQUIRED/));
test("final review needs configured session target or documented override",()=>assert.throws(()=>transitionJourney({currentState:"ACTIVE_TREATMENT",event:"final_review_started",actorRoles:["doctor"],completedSessions:8,sessionTarget:9}),/PRECONDITION_REQUIRED/));
