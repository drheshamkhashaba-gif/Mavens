import test from "node:test";
import assert from "node:assert/strict";
import {hmacHex,normalizeAnalysisMetrics,timingSafeEqualText,verifyHmac} from "../lib/integration-security.mjs";
test("verifies valid webhook signatures and rejects tampering",async()=>{const signature=await hmacHex("secret","payload");assert.equal(await verifyHmac("secret","payload",`sha256=${signature}`),true);assert.equal(await verifyHmac("secret","changed",`sha256=${signature}`),false)});
test("uses constant-work text comparison for equal-length values",()=>{assert.equal(timingSafeEqualText("abc","abc"),true);assert.equal(timingSafeEqualText("abc","abd"),false)});
test("normalizes safe 0-100 analysis measures",()=>{assert.deepEqual(normalizeAnalysisMetrics([{metric:"Redness",value:64.2}])[0],{metric:"Redness",value:64,source:"external_analysis"});assert.throws(()=>normalizeAnalysisMetrics([{metric:"Redness",value:120}]),/INVALID_METRIC/)});
