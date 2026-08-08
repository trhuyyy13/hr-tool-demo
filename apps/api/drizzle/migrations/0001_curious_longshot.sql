CREATE TABLE "attendance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attendance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"check_in_at" timestamp with time zone,
	"check_out_at" timestamp with time zone,
	"source" text DEFAULT 'web' NOT NULL,
	CONSTRAINT "attendance_source_check" CHECK ("attendance"."source" in ('web','manual_by_hr'))
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attendance_employee_date" ON "attendance" USING btree ("employee_id","date");