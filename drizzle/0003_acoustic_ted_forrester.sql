ALTER TABLE `appointments` ADD `clinic_id` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `provider_id` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `device_id` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `room_id` text;--> statement-breakpoint
CREATE INDEX `idx_appointment_resource_time` ON `appointments` (`clinic_id`,`device_id`,`provider_id`,`starts_at`);