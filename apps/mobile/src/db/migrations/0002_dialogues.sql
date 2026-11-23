CREATE TABLE `dialogues` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`title` text NOT NULL,
	`level` text NOT NULL,
	`situation_vi` text NOT NULL,
	`speakers` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `dialogues_topic_idx` ON `dialogues` (`topic_id`);--> statement-breakpoint
ALTER TABLE `phrases` ADD `dialogue_id` text;--> statement-breakpoint
ALTER TABLE `phrases` ADD `line_no` integer;--> statement-breakpoint
ALTER TABLE `phrases` ADD `speaker` text;--> statement-breakpoint
ALTER TABLE `phrases` ADD `blank` text;--> statement-breakpoint
ALTER TABLE `phrases` ADD `note_vi` text;--> statement-breakpoint
CREATE INDEX `phrases_dialogue_idx` ON `phrases` (`dialogue_id`,`line_no`);