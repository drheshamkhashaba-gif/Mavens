import test from "node:test";
import assert from "node:assert/strict";
import {canAccessPatient,hasPermission,PERMISSIONS} from "../lib/access-control.mjs";

test("reception cannot make clinical decisions",()=>assert.equal(hasPermission(["reception"],PERMISSIONS.CLINICAL_DECIDE),false));
test("medical director can approve clinical configuration",()=>assert.equal(hasPermission(["medical_director"],PERMISSIONS.CLINICAL_APPROVE),true));
test("patient can only access their own record",()=>{assert.equal(canAccessPatient({roles:["patient"],actorUserId:"u1",patientProfileId:"u1"}),true);assert.equal(canAccessPatient({roles:["patient"],actorUserId:"u1",patientProfileId:"u2"}),false);});
test("marketing access requires active separate consent",()=>{assert.equal(canAccessPatient({roles:["marketing"],actorUserId:"m1",patientProfileId:"p1"}),false);assert.equal(canAccessPatient({roles:["marketing"],actorUserId:"m1",patientProfileId:"p1",marketingConsentActive:true}),true);});
