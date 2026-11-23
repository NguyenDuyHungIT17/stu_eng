CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`explanation_vi` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chat_messages_session_idx` ON `chat_messages` (`session_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`level` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`feedback_json` text
);
--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`day` text PRIMARY KEY NOT NULL,
	`new_cards` integer DEFAULT 0 NOT NULL,
	`reviews` integer DEFAULT 0 NOT NULL,
	`chat_sessions` integer DEFAULT 0 NOT NULL,
	`study_seconds` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_ref` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_updated_idx` ON `notes` (`updated_at`);--> statement-breakpoint
CREATE TABLE `phrases` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`text` text NOT NULL,
	`ipa` text,
	`meaning_vi` text NOT NULL,
	`example` text,
	`register` text,
	`level` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `phrases_topic_idx` ON `phrases` (`topic_id`);--> statement-breakpoint
CREATE TABLE `review_cards` (
	`phrase_id` text PRIMARY KEY NOT NULL,
	`due` integer NOT NULL,
	`fsrs_state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_cards_due_idx` ON `review_cards` (`due`);--> statement-breakpoint
CREATE INDEX `review_cards_created_idx` ON `review_cards` (`created_at`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`phrase_id` text NOT NULL,
	`rating` integer NOT NULL,
	`exercise_type` text NOT NULL,
	`reviewed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `review_logs_phrase_idx` ON `review_logs` (`phrase_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`level` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer
);
