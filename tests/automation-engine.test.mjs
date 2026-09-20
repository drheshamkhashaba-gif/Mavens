import test from "node:test";
import assert from "node:assert/strict";
import {automationCandidates} from "../lib/automation-engine.mjs";
const now="2026-09-19T12:00:00.000Z";
test("creates a 24-hour appointment reminder",()=>{const rows=automationCandidates({now,appointments:[{id:"a",patient_id:"p",service_name:"Review",starts_at:"2026-09-20T10:00:00.000Z"}]});assert.equal(rows[0].ruleKey,"appointment_24h")});
test("creates next-day session follow-up without clinical advice",()=>{const rows=automationCandidates({now,sessions:[{id:"s",patient_id:"p",preferred_language:"en",completed_at:"2026-09-18T11:00:00.000Z"}]});assert.equal(rows[0].ruleKey,"post_session_t1");assert.equal(rows[0].body.includes("treatment"),false)});
test("deduplicates by rule and source",()=>{const rows=automationCandidates({now,tasks:[{id:"t",patient_id:"p",scheduled_for:"2026-09-17",status:"pending"}]});assert.equal(rows[0].dedupeKey,"missed_routine:t")});
