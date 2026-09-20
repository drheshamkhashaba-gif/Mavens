CREATE TABLE `commercial_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text,
	`patient_id` text,
	`event_type` text NOT NULL,
	`source` text,
	`campaign` text,
	`amount_minor` integer,
	`currency` text DEFAULT 'JOD' NOT NULL,
	`dedupe_key` text,
	`occurred_at` text NOT NULL,
	`recorded_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_commercial_event_dedupe` ON `commercial_events` (`tenant_id`,`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_commercial_event_time` ON `commercial_events` (`tenant_id`,`clinic_id`,`event_type`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `report_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`clinic_id` text,
	`report_type` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`definition_version` text NOT NULL,
	`data_json` text NOT NULL,
	`generated_by` text NOT NULL,
	`generated_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_report_snapshot_period` ON `report_snapshots` (`tenant_id`,`report_type`,`period_end`);