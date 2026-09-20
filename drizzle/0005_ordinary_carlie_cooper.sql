CREATE TABLE `home_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text,
	`rating` integer NOT NULL,
	`symptoms_json` text NOT NULL,
	`notes` text,
	`patient_red_flag` integer DEFAULT false NOT NULL,
	`submitted_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_home_assessment_patient` ON `home_assessments` (`patient_id`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `marketing_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`granted` integer NOT NULL,
	`version` text NOT NULL,
	`recorded_at` text NOT NULL,
	`withdrawn_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_marketing_consent_patient` ON `marketing_consents` (`patient_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `message_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`category` text DEFAULT 'care_question' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`last_message_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_message_thread_patient` ON `message_threads` (`patient_id`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`morning_time` text DEFAULT '08:00' NOT NULL,
	`evening_time` text DEFAULT '20:00' NOT NULL,
	`timezone` text DEFAULT 'Asia/Amman' NOT NULL,
	`medication_opt_in` integer DEFAULT true NOT NULL,
	`appointment_opt_in` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_notification_patient` ON `notification_preferences` (`patient_id`);--> statement-breakpoint
CREATE TABLE `patient_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`body` text NOT NULL,
	`attachment_json` text,
	`delivery_status` text DEFAULT 'sent' NOT NULL,
	`read_at` text,
	`sent_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `message_threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_patient_message_thread` ON `patient_messages` (`thread_id`,`sent_at`);--> statement-breakpoint
CREATE TABLE `patient_reported_outcomes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text,
	`outcome_type` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`submitted_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_patient_outcome_patient` ON `patient_reported_outcomes` (`patient_id`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `routine_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`program_id` text,
	`title_ar` text NOT NULL,
	`title_en` text NOT NULL,
	`period` text NOT NULL,
	`instructions_ar` text,
	`instructions_en` text,
	`scheduled_for` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` text,
	`skip_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_routine_task_patient_day` ON `routine_tasks` (`patient_id`,`scheduled_for`,`status`);