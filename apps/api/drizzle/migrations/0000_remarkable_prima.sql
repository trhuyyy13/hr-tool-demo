CREATE TABLE "employee" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "employee_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"department" text NOT NULL,
	"manager_id" integer,
	"annual_leave_balance" integer DEFAULT 12 NOT NULL,
	"start_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_request" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "leave_request_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employee_id" integer NOT NULL,
	"type" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approver_id" integer,
	"approved_at" timestamp with time zone,
	"reject_reason" text,
	CONSTRAINT "leave_request_type_check" CHECK ("leave_request"."type" in ('annual','sick','unpaid')),
	CONSTRAINT "leave_request_status_check" CHECK ("leave_request"."status" in ('pending','approved','rejected','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_manager_id_employee_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_approver_id_employee_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."employee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_employee_email" ON "employee" USING btree ("email");