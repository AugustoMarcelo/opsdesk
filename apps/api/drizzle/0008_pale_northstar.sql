CREATE TABLE "processed_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"processor_name" text NOT NULL,
	CONSTRAINT "processed_events_event_id_unique" UNIQUE("event_id")
);
