CREATE TABLE `ai_analysis_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`check_in_id` text,
	`provider` text NOT NULL,
	`model_version` text NOT NULL,
	`result_json` text NOT NULL,
	`confidence` integer NOT NULL,
	`limitations` text NOT NULL,
	`review_state` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`check_in_id` text,
	`severity` text NOT NULL,
	`status` text NOT NULL,
	`owner_id` text,
	`rule_key` text NOT NULL,
	`due_at` text NOT NULL,
	`resolved_at` text,
	`resolution` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_alert_queue` ON `alerts` (`tenant_id`,`status`,`severity`,`due_at`);--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text,
	`starts_at` text NOT NULL,
	`status` text NOT NULL,
	`service_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_appointment_patient_time` ON `appointments` (`patient_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `assessment_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`metric` text NOT NULL,
	`value` integer NOT NULL,
	`source` text NOT NULL,
	`model_version` text,
	`review_state` text NOT NULL,
	`measured_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_metric_assessment_time` ON `assessment_metrics` (`assessment_id`,`measured_at`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text,
	`status` text NOT NULL,
	`physician_notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`before_json` text,
	`after_json` text,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_entity_time` ON `audit_logs` (`tenant_id`,`entity_type`,`entity_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `check_in_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`check_in_id` text NOT NULL,
	`question_key` text NOT NULL,
	`answer_json` text NOT NULL,
	`is_red_flag` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text NOT NULL,
	`status` text NOT NULL,
	`risk_level` text NOT NULL,
	`submitted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_checkin_patient_created` ON `check_ins` (`patient_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `clinical_photo_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`purpose` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clinics` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Amman' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_clinics_tenant` ON `clinics` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`type` text NOT NULL,
	`version` text NOT NULL,
	`granted` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`photo_set_id` text,
	`object_key` text NOT NULL,
	`view` text,
	`mime_type` text NOT NULL,
	`owner_patient_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_media_object` ON `media_assets` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_media_owner` ON `media_assets` (`owner_patient_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_membership_user_tenant` ON `memberships` (`user_id`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`sent_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outcome_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text NOT NULL,
	`baseline_json` text NOT NULL,
	`final_json` text NOT NULL,
	`physician_conclusion` text NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `patient_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`template_version_id` text NOT NULL,
	`status` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`target_outcome` text,
	`physician_id` text,
	`approved_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_program_patient_status` ON `patient_programs` (`patient_id`,`status`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`profile_id` text,
	`reference_code` text NOT NULL,
	`status` text NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_patient_tenant_ref` ON `patients` (`tenant_id`,`reference_code`);--> statement-breakpoint
CREATE INDEX `idx_patient_clinic_status` ON `patients` (`clinic_id`,`status`);--> statement-breakpoint
CREATE TABLE `program_template_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`template_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`definition_json` text NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_template_version` ON `program_template_versions` (`template_id`,`version`);--> statement-breakpoint
CREATE TABLE `program_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name_en` text NOT NULL,
	`name_ar` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_user_email` ON `user_profiles` (`email`);