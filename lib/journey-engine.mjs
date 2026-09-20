export const JOURNEY_STATES = ["LEAD","REGISTERED","ASSESSMENT","CONSULTATION","ACTIVATED","PREPARATION","ACTIVE_TREATMENT","FINAL_REVIEW","MAINTENANCE","GRADUATED","ON_HOLD","EXTENDED","TRANSFERRED","CANCELLED"];

export const JOURNEY_EVENTS = Object.freeze({
  REGISTER: "patient_registered", START_ASSESSMENT: "assessment_started", CONSENT_SIGNED: "consent_signed",
  BASELINE_COMPLETED: "baseline_completed", CONSULTATION_STARTED: "consultation_started",
  DOCTOR_PLAN_APPROVED: "doctor_plan_approved", CONSULTATION_CLOSED: "consultation_closed",
  ACTIVATION_SENT: "activation_sent", PREPARATION_COMPLETED: "preparation_completed",
  SESSION_COMPLETED: "session_completed", FINAL_REVIEW_STARTED: "final_review_started",
  FINAL_REVIEW_CLOSED: "final_review_closed", MAINTENANCE_CLOSED: "maintenance_closed",
  PUT_ON_HOLD: "put_on_hold", RESUME: "resume", EXTEND: "extend", TRANSFER: "transfer", CANCEL: "cancel",
});

const transitions = {
  LEAD: {patient_registered:"REGISTERED"},
  REGISTERED: {assessment_started:"ASSESSMENT",put_on_hold:"ON_HOLD",cancel:"CANCELLED"},
  ASSESSMENT: {consent_signed:"ASSESSMENT",baseline_completed:"CONSULTATION",put_on_hold:"ON_HOLD",cancel:"CANCELLED"},
  CONSULTATION: {doctor_plan_approved:"CONSULTATION",consultation_closed:"ACTIVATED",put_on_hold:"ON_HOLD",cancel:"CANCELLED"},
  ACTIVATED: {activation_sent:"PREPARATION",put_on_hold:"ON_HOLD",cancel:"CANCELLED"},
  PREPARATION: {preparation_completed:"ACTIVE_TREATMENT",put_on_hold:"ON_HOLD",cancel:"CANCELLED"},
  ACTIVE_TREATMENT: {session_completed:"ACTIVE_TREATMENT",final_review_started:"FINAL_REVIEW",put_on_hold:"ON_HOLD",extend:"EXTENDED",cancel:"CANCELLED"},
  FINAL_REVIEW: {final_review_closed:"MAINTENANCE",extend:"EXTENDED",put_on_hold:"ON_HOLD"},
  EXTENDED: {session_completed:"EXTENDED",final_review_started:"FINAL_REVIEW",put_on_hold:"ON_HOLD"},
  MAINTENANCE: {maintenance_closed:"GRADUATED",put_on_hold:"ON_HOLD",extend:"EXTENDED"},
  ON_HOLD: {resume:"$PREVIOUS",transfer:"TRANSFERRED",cancel:"CANCELLED"},
};

const clinicalEvents = new Set(["doctor_plan_approved","consultation_closed","final_review_started","final_review_closed","extend"]);
const mandatoryReasonEvents = new Set(["put_on_hold","extend","transfer","cancel"]);

export function transitionJourney({currentState,event,actorRoles,reason,previousState,completedSessions=0,sessionTarget=9}) {
  const next = transitions[currentState]?.[event];
  if (!next) throw new Error(`INVALID_TRANSITION:${currentState}:${event}`);
  if (mandatoryReasonEvents.has(event) && !reason?.trim()) throw new Error(`REASON_REQUIRED:${event}`);
  if (clinicalEvents.has(event) && !actorRoles.some(r=>["doctor","medical_director","super_admin"].includes(r))) throw new Error(`CLINICAL_ROLE_REQUIRED:${event}`);
  if (event === "consultation_closed" && !reason?.includes("plan_approved")) throw new Error("PRECONDITION_REQUIRED:doctor_plan_approved");
  if (event === "final_review_started" && completedSessions < sessionTarget && !reason?.includes("administrative_override")) throw new Error("PRECONDITION_REQUIRED:session_target");
  const toState = next === "$PREVIOUS" ? previousState : next;
  if (!toState || toState === "ON_HOLD") throw new Error("PREVIOUS_STATE_REQUIRED");
  return {fromState:currentState,toState,event,reason:reason?.trim()||null,completedSessions:event==="session_completed"?completedSessions+1:completedSessions};
}
