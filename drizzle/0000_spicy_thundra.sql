CREATE TABLE `opiniones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`propuesta` text NOT NULL,
	`categoria` text NOT NULL,
	`ciudad` text NOT NULL,
	`codigo_postal` text NOT NULL,
	`colonia` text NOT NULL,
	`seccion` text NOT NULL,
	`created_at` text NOT NULL
);
