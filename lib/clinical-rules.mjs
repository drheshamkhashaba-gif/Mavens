export function evaluateCheckIn(answers, now = new Date("2026-09-02T06:00:00Z")) {
  const redFlags = answers.filter((answer) => answer.isRedFlag && answer.value === true);
  if (redFlags.length === 0) return { risk: "low", alert: null };
  return { risk: "high", alert: { severity: "high", ruleKey: "DG-RF-02", status: "open", dueAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), reasonKeys: redFlags.map((answer) => answer.key) } };
}
export function calculateProgress(stages) {
  const tasks = stages.flatMap((stage) => stage.tasks);
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}
export class MockSkinAnalysisProvider {
  qualityCheck(metadata) {
    const score = Math.max(0, Math.min(100, Math.round((metadata.brightness + metadata.sharpness) / 2)));
    return { accepted: score >= 55, confidence: 0.78, modelVersion: "mock-0.3", limitations: "Non-medical deterministic demo check" };
  }
  compareProgress() {
    return { result: "expected-redness-monitor", confidence: 0.78, modelVersion: "mock-0.3", limitations: "Demo output; requires human review" };
  }
}
