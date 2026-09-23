-- Run once on the existing D1 database before deploying this release.
CREATE TABLE IF NOT EXISTS intake_assessments (
 patient_id TEXT PRIMARY KEY REFERENCES patients(id), tenant_id TEXT NOT NULL, clinic_id TEXT NOT NULL,
 data_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS intake_documents (
 id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), tenant_id TEXT NOT NULL, clinic_id TEXT NOT NULL,
 kind TEXT NOT NULL, view_type TEXT NOT NULL, filename TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
 created_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS intake_documents_patient ON intake_documents(tenant_id,clinic_id,patient_id);
CREATE TABLE IF NOT EXISTS intake_document_chunks (
 document_id TEXT NOT NULL REFERENCES intake_documents(id) ON DELETE CASCADE,
 ordinal INTEGER NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(document_id,ordinal)
);
