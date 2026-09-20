CREATE TABLE `integration_connections` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'not_configured' NOT NULL,
	`capabilities_json` text NOT NULL,
	`last_checked_at` text,
	`last_success_at` text,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_integration_provider` ON `integration_connections` (`tenant_id`,`provider`);--> statement-breakpoint
CREATE TABLE `integration_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`provider` text NOT NULL,
	`job_type` text NOT NULL,
	`patient_id` text,
	`source_entity_id` text,
	`external_job_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`request_json` text,
	`response_json` text,
	`last_error` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_integration_job_queue` ON `integration_jobs` (`tenant_id`,`provider`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text,
	`provider` text NOT NULL,
	`external_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`signature_valid` integer NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`processed_at` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_webhook_external_event` ON `webhook_events` (`provider`,`external_event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_status` ON `webhook_events` (`provider`,`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `notification_outbox` ADD `external_message_id` text;