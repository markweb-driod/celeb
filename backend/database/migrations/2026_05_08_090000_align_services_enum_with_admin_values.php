<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return; // SQLite uses string columns; enum changes are no-ops
        }

        DB::statement("ALTER TABLE services MODIFY COLUMN service_type ENUM(
            'fan_card',
            'video_message',
            'private_event',
            'birthday_performance',
            'meet_greet',
            'merchandise',
            'exclusive_content',
            'membership',
            'shoutout',
            'video_shoutout',
            'live_session',
            'meet_and_greet',
            'birthday_surprise',
            'custom'
        ) NOT NULL");

        DB::statement("ALTER TABLE services MODIFY COLUMN status ENUM(
            'draft',
            'active',
            'paused',
            'inactive'
        ) NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("UPDATE services SET service_type = 'shoutout' WHERE service_type = 'video_shoutout'");
        DB::statement("UPDATE services SET service_type = 'private_event' WHERE service_type = 'live_session'");
        DB::statement("UPDATE services SET service_type = 'meet_greet' WHERE service_type = 'meet_and_greet'");
        DB::statement("UPDATE services SET service_type = 'birthday_performance' WHERE service_type = 'birthday_surprise'");
        DB::statement("UPDATE services SET service_type = 'fan_card' WHERE service_type = 'custom'");
        DB::statement("UPDATE services SET status = 'paused' WHERE status = 'inactive'");

        DB::statement("ALTER TABLE services MODIFY COLUMN service_type ENUM(
            'fan_card',
            'video_message',
            'private_event',
            'birthday_performance',
            'meet_greet',
            'merchandise',
            'exclusive_content',
            'membership',
            'shoutout'
        ) NOT NULL");

        DB::statement("ALTER TABLE services MODIFY COLUMN status ENUM(
            'draft',
            'active',
            'paused'
        ) NOT NULL DEFAULT 'draft'");
    }
};
