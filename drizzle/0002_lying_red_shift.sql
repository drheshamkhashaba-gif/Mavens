CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`name` text NOT NULL,
	`device_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_device_schedule` ON `devices` (`clinic_id`,`device_type`,`status`);--> statement-breakpoint
CREATE TABLE `imaging_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`intake_id` text,
	`purpose` text DEFAULT 'baseline' NOT NULL,
	`angle_confirmed` integer DEFAULT false NOT NULL,
	`lighting_confirmed` integer DEFAULT false NOT NULL,
	`distance_confirmed` integer DEFAULT false NOT NULL,
	`result_reference` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`completed_by` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`intake_id`) REFERENCES `reception_intakes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_imaging_queue` ON `imaging_checklists` (`tenant_id`,`clinic_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `reception_intakes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`primary_concern` text,
	`personal_goal` text,
	`medical_consent_status` text DEFAULT 'pending' NOT NULL,
	`profile_completeness` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'awaiting_arrival' NOT NULL,
	`assigned_specialist_id` text,
	`checked_in_at` text,
	`ready_for_doctor_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`journey_id`) REFERENCES `journey_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reception_queue` ON `reception_intakes` (`tenant_id`,`clinic_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `reschedule_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text NOT NULL,
	`appointment_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`preferred_starts_at` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reschedule_queue` ON `reschedule_requests` (`tenant_id`,`clinic_id`,`status`,`created_at`);