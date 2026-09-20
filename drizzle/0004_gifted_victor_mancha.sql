CREATE TABLE `clinical_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`decision_type` text NOT NULL,
	`decision` text NOT NULL,
	`rationale` text NOT NULL,
	`physician_id` text NOT NULL,
	`effective_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_clinical_decision_timeline` ON `clinical_decisions` (`patient_id`,`effective_at`);--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`physician_id` text NOT NULL,
	`severity` text,
	`clinical_conclusion` text,
	`target_outcome` text,
	`routine_json` text,
	`medication_json` text,
	`instructions_json` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_at` text,
	`closed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_consultation_patient` ON `consultations` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_consultation_queue` ON `consultations` (`tenant_id`,`clinic_id`,`status`);--> statement-breakpoint
CREATE TABLE `doctor_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`physician_id` text NOT NULL,
	`note_type` text NOT NULL,
	`body` text NOT NULL,
	`visibility` text DEFAULT 'clinical_team' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_doctor_note_patient` ON `doctor_notes` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `treatment_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`session_number` integer NOT NULL,
	`device_type` text NOT NULL,
	`rationale` text NOT NULL,
	`parameters_json` text,
	`response_notes` text,
	`post_care_version_id` text,
	`physician_id` text NOT NULL,
	`completed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_treatment_session_number` ON `treatment_sessions` (`journey_id`,`session_number`);--> statement-breakpoint
CREATE INDEX `idx_treatment_session_patient` ON `treatment_sessions` (`patient_id`,`completed_at`);