CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`trigger_type` text NOT NULL,
	`channel` text DEFAULT 'in_app' NOT NULL,
	`template_key` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`requires_clinical_approval` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_automation_rule_key` ON `automation_rules` (`tenant_id`,`key`);--> statement-breakpoint
CREATE TABLE `care_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text,
	`patient_id` text NOT NULL,
	`task_type` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`owner_role` text DEFAULT 'journey_coordinator' NOT NULL,
	`due_at` text NOT NULL,
	`source_entity_type` text,
	`source_entity_id` text,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_care_task_queue` ON `care_tasks` (`tenant_id`,`status`,`priority`,`due_at`);--> statement-breakpoint
CREATE TABLE `communication_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`body_ar` text NOT NULL,
	`body_en` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_communication_template_version` ON `communication_templates` (`tenant_id`,`key`,`version`);--> statement-breakpoint
CREATE TABLE `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`rule_key` text,
	`channel` text NOT NULL,
	`recipient` text,
	`subject` text,
	`body` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`scheduled_for` text NOT NULL,
	`sent_at` text,
	`failed_at` text,
	`failure_reason` text,
	`dedupe_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_notification_dedupe` ON `notification_outbox` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_notification_queue` ON `notification_outbox` (`tenant_id`,`status`,`scheduled_for`);