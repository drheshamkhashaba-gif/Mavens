CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text NOT NULL,
	`requested_by` text NOT NULL,
	`decided_by` text,
	`decision_reason` text,
	`decided_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_approval_entity` ON `approvals` (`tenant_id`,`entity_type`,`entity_id`,`status`);--> statement-breakpoint
CREATE TABLE `clinical_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`config_key` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`value_json` text NOT NULL,
	`owner_id` text NOT NULL,
	`reviewer_id` text,
	`effective_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_clinical_config_version` ON `clinical_configurations` (`tenant_id`,`config_key`,`version`);--> statement-breakpoint
CREATE INDEX `idx_clinical_config_status` ON `clinical_configurations` (`tenant_id`,`status`);--> statement-breakpoint
CREATE TABLE `consent_signatures` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`consent_id` text NOT NULL,
	`signer_user_id` text,
	`signer_name` text NOT NULL,
	`signature_method` text NOT NULL,
	`signed_at` text NOT NULL,
	`ip_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`consent_id`) REFERENCES `consents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_consent_signature_consent` ON `consent_signatures` (`consent_id`);--> statement-breakpoint
CREATE TABLE `emergency_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`name` text NOT NULL,
	`relationship` text,
	`mobile` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_emergency_contact_patient` ON `emergency_contacts` (`patient_id`);--> statement-breakpoint
CREATE TABLE `journey_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`event_type` text NOT NULL,
	`from_state` text NOT NULL,
	`to_state` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_role` text NOT NULL,
	`reason` text,
	`payload_json` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_journey_event_timeline` ON `journey_events` (`journey_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `journey_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`patient_program_id` text,
	`current_state` text DEFAULT 'REGISTERED' NOT NULL,
	`session_target` integer DEFAULT 9 NOT NULL,
	`completed_sessions` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`on_hold_reason` text,
	`closed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_active_journey_program` ON `journey_instances` (`patient_program_id`);--> statement-breakpoint
CREATE INDEX `idx_journey_queue` ON `journey_instances` (`tenant_id`,`clinic_id`,`current_state`);--> statement-breakpoint
CREATE TABLE `patient_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`full_name_ar` text,
	`full_name_en` text,
	`date_of_birth` text,
	`mobile` text,
	`preferred_language` text DEFAULT 'ar' NOT NULL,
	`photo_asset_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_patient_profile_patient` ON `patient_profiles` (`patient_id`);--> statement-breakpoint
CREATE TABLE `role_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`granted_by` text NOT NULL,
	`granted_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_role_assignment_scope` ON `role_assignments` (`tenant_id`,`clinic_id`,`user_id`,`role`);--> statement-breakpoint
CREATE INDEX `idx_role_assignment_user` ON `role_assignments` (`user_id`,`tenant_id`,`status`);