CREATE TABLE `conversations` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64),
	`title` text NOT NULL,
	`isGuest` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(64) NOT NULL,
	`conversationId` varchar(64) NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`citations` json,
	`searchResults` json,
	`model` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patientMemory` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityName` text NOT NULL,
	`relationships` json,
	`metadata` json,
	`conversationId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `patientMemory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`preferredModel` varchar(64) DEFAULT 'sonar-pro',
	`theme` enum('light','dark','system') DEFAULT 'light',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `userId_idx` ON `conversations` (`userId`);--> statement-breakpoint
CREATE INDEX `conversationId_idx` ON `messages` (`conversationId`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `patientMemory` (`userId`);