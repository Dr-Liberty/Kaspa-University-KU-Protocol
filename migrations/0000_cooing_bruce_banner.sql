CREATE TABLE "anti_sybil_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"total_quizzes" integer DEFAULT 0 NOT NULL,
	"total_rewards_today" real DEFAULT 0 NOT NULL,
	"today_date" text NOT NULL,
	"trust_score" real DEFAULT 0.5 NOT NULL,
	"flags" text[] DEFAULT '{}',
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "anti_sybil_data_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"user_id" text NOT NULL,
	"recipient_address" text NOT NULL,
	"course_name" text NOT NULL,
	"kas_reward" real NOT NULL,
	"score" real,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"verification_code" text NOT NULL,
	"ipfs_hash" text,
	"nft_tx_hash" text,
	"image_url" text,
	"nft_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_rewards" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"user_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"kas_amount" real NOT NULL,
	"average_score" real NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"tx_confirmed" boolean,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ip_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"first_seen" timestamp DEFAULT now() NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"wallets" text[] DEFAULT '{}',
	"request_count" integer DEFAULT 0 NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"flags" text[] DEFAULT '{}',
	"is_vpn" boolean DEFAULT false NOT NULL,
	"vpn_score" real,
	"vpn_checked_at" timestamp,
	CONSTRAINT "ip_activity_ip_address_unique" UNIQUE("ip_address")
);
--> statement-breakpoint
CREATE TABLE "pending_mint_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" text NOT NULL,
	"recipient_address" text NOT NULL,
	"token_id" integer NOT NULL,
	"p2sh_address" text NOT NULL,
	"script_data" text NOT NULL,
	"mint_data" text NOT NULL,
	"commit_tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"finalized_at" timestamp,
	CONSTRAINT "pending_mint_reservations_p2sh_address_unique" UNIQUE("p2sh_address")
);
--> statement-breakpoint
CREATE TABLE "qa_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"author_address" text NOT NULL,
	"author_display_name" text,
	"content" text NOT NULL,
	"is_question" boolean NOT NULL,
	"parent_id" text,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"lesson_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text
);
--> statement-breakpoint
CREATE TABLE "quiz_results" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text NOT NULL,
	"user_id" text NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"ip_address" text NOT NULL,
	"action" text NOT NULL,
	"flags" text[] DEFAULT '{}',
	"vpn_score" real,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "used_payment_txs" (
	"tx_hash" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"purpose" text NOT NULL,
	"amount" real,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"completed_lessons" text[] DEFAULT '{}',
	"current_lesson_id" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"display_name" text,
	"total_kas_earned" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
CREATE TABLE "wallet_ip_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"ips" text[] DEFAULT '{}',
	"primary_ip" text,
	"flagged" boolean DEFAULT false NOT NULL,
	CONSTRAINT "wallet_ip_bindings_wallet_address_unique" UNIQUE("wallet_address")
);
