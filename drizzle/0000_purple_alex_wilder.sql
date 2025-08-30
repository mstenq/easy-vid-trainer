CREATE TABLE `datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dataset_id` integer NOT NULL,
	`filename` text NOT NULL,
	`filepath` text NOT NULL,
	`duration` real NOT NULL,
	`original_width` integer NOT NULL,
	`original_height` integer NOT NULL,
	`start_time` real DEFAULT 0 NOT NULL,
	`resolution` text DEFAULT '1280x720' NOT NULL,
	`crop_x` integer DEFAULT 0 NOT NULL,
	`crop_y` integer DEFAULT 0 NOT NULL,
	`crop_width` integer NOT NULL,
	`crop_height` integer NOT NULL,
	`fps` integer,
	`frame_count` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE no action
);
