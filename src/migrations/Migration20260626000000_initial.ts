/**
 * Initial migration — identity context schema (users + refresh_tokens).
 *
 * Column names are snake_case, matching the UnderscoreNamingStrategy configured
 * in AppModule. The `users` table backs the User aggregate; `refresh_tokens`
 * backs the refresh-token family chain (design Decision #4). A partial index
 * could speed reuse-detection but is unnecessary for MVP.
 *
 * NOTE: `refresh_tokens.hash` is UNIQUE so two rows can never share a storage
 * hash. `parent_token_hash` is nullable (null for a family root). `status` is a
 * text column constrained by a CHECK to EXACTLY `issued | rotated | revoked`
 * (design W1 — reuse is a TRIGGER, not a status, so there is no `reused` value).
 */
import { Migration } from '@mikro-orm/migrations';

export class Migration20260626000000_initial extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "users" (
        "id" uuid not null primary key,
        "email" text not null unique,
        "password_hash" text not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    );

    this.addSql(
      `create table "refresh_tokens" (
        "id" uuid not null primary key,
        "user_id" uuid not null,
        "family_id" uuid not null,
        "parent_token_hash" text null,
        "hash" text not null unique,
        "status" text not null,
        "expires_at" timestamptz not null,
        "created_at" timestamptz not null,
        constraint "refresh_tokens_status_check"
          check ("status" in ('issued', 'rotated', 'revoked'))
      );`,
    );

    this.addSql(
      `create index "refresh_tokens_user_id_idx" on "refresh_tokens" ("user_id");`,
    );
    this.addSql(
      `create index "refresh_tokens_family_id_idx" on "refresh_tokens" ("family_id");`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "refresh_tokens";`);
    this.addSql(`drop table if exists "users";`);
  }
}
