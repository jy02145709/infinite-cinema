CREATE TABLE `veo_renders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`usage_date` text NOT NULL,
	`operation_name` text NOT NULL,
	`status` text NOT NULL,
	`prompt` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `veo_renders_usage_date_unique` ON `veo_renders` (`usage_date`);
