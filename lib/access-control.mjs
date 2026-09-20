export const ROLES = Object.freeze({
  PATIENT: "patient", DOCTOR: "doctor", RECEPTION: "reception", SPECIALIST: "specialist",
  JOURNEY_COORDINATOR: "journey_coordinator", CLINIC_ADMIN: "clinic_admin",
  MEDICAL_DIRECTOR: "medical_director", MARKETING: "marketing", SUPER_ADMIN: "super_admin",
});

export const PERMISSIONS = Object.freeze({
  PATIENT_SELF_READ: "patient.self.read", PATIENT_REGISTER: "patient.register",
  CONSENT_RECORD: "consent.record", IMAGING_CAPTURE: "imaging.capture",
  JOURNEY_READ: "journey.read", JOURNEY_TRANSITION: "journey.transition",
  CLINICAL_DECIDE: "clinical.decide", CLINICAL_APPROVE: "clinical.approve",
  SCHEDULE_MANAGE: "schedule.manage", MESSAGE_OPERATE: "message.operate",
  MARKETING_ELIGIBLE_READ: "marketing.eligible.read", USERS_MANAGE: "users.manage", AUDIT_READ: "audit.read",
});

const grants = {
  patient: [PERMISSIONS.PATIENT_SELF_READ, PERMISSIONS.JOURNEY_READ],
  doctor: [PERMISSIONS.PATIENT_SELF_READ, PERMISSIONS.JOURNEY_READ, PERMISSIONS.JOURNEY_TRANSITION, PERMISSIONS.CLINICAL_DECIDE],
  reception: [PERMISSIONS.PATIENT_REGISTER, PERMISSIONS.CONSENT_RECORD, PERMISSIONS.JOURNEY_READ, PERMISSIONS.JOURNEY_TRANSITION, PERMISSIONS.SCHEDULE_MANAGE],
  specialist: [PERMISSIONS.JOURNEY_READ, PERMISSIONS.JOURNEY_TRANSITION, PERMISSIONS.IMAGING_CAPTURE],
  journey_coordinator: [PERMISSIONS.JOURNEY_READ, PERMISSIONS.JOURNEY_TRANSITION, PERMISSIONS.MESSAGE_OPERATE, PERMISSIONS.SCHEDULE_MANAGE],
  clinic_admin: [PERMISSIONS.PATIENT_REGISTER, PERMISSIONS.CONSENT_RECORD, PERMISSIONS.JOURNEY_READ, PERMISSIONS.JOURNEY_TRANSITION, PERMISSIONS.SCHEDULE_MANAGE, PERMISSIONS.MESSAGE_OPERATE, PERMISSIONS.USERS_MANAGE, PERMISSIONS.AUDIT_READ],
  medical_director: [PERMISSIONS.JOURNEY_READ, PERMISSIONS.JOURNEY_TRANSITION, PERMISSIONS.CLINICAL_DECIDE, PERMISSIONS.CLINICAL_APPROVE, PERMISSIONS.AUDIT_READ],
  marketing: [PERMISSIONS.MARKETING_ELIGIBLE_READ],
  super_admin: Object.values(PERMISSIONS),
};

export function hasPermission(roles, permission) {
  return roles.some((role) => grants[role]?.includes(permission));
}

export function requirePermission(roles, permission) {
  if (!hasPermission(roles, permission)) throw new Error(`FORBIDDEN:${permission}`);
}

export function canAccessPatient({ roles, actorUserId, patientProfileId, marketingConsentActive=false }) {
  if (roles.includes(ROLES.PATIENT)) return actorUserId === patientProfileId;
  if (roles.includes(ROLES.MARKETING)) return marketingConsentActive;
  return roles.some((role)=>[ROLES.DOCTOR,ROLES.RECEPTION,ROLES.SPECIALIST,ROLES.JOURNEY_COORDINATOR,ROLES.CLINIC_ADMIN,ROLES.MEDICAL_DIRECTOR,ROLES.SUPER_ADMIN].includes(role));
}
