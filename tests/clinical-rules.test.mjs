import assert from "node:assert/strict";
import test from "node:test";
import { calculateProgress, evaluateCheckIn, MockSkinAnalysisProvider } from "../lib/clinical-rules.mjs";
test("a red flag creates a high alert independently of analysis", () => {
  const result = evaluateCheckIn([{ key: "increased_redness", value: true, isRedFlag: true }]);
  assert.equal(result.risk, "high");
  assert.equal(result.alert.ruleKey, "DG-RF-02");
  assert.equal(result.alert.dueAt, "2026-09-02T06:30:00.000Z");
});
test("progress is calculated from completed tasks", () => {
  assert.equal(calculateProgress([{ tasks: [{ completed: true }, { completed: false }] }]), 50);
});
test("mock provider identifies itself and exposes limitations", () => {
  const result = new MockSkinAnalysisProvider().qualityCheck({ brightness: 70, sharpness: 60 });
  assert.equal(result.accepted, true);
  assert.match(result.modelVersion, /^mock-/);
  assert.ok(result.limitations);
});
