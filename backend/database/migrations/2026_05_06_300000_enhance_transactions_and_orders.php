<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend transactions.status enum with pending_confirmation
        DB::statement("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending','pending_confirmation','completed','failed') NOT NULL DEFAULT 'pending'");

        // 2. Add new columns to transactions
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('proof_url', 1000)->nullable()->after('status');
            $table->string('gift_card_code', 500)->nullable()->after('proof_url');
            $table->json('payment_meta')->nullable()->after('gift_card_code');
            $table->text('admin_note')->nullable()->after('payment_meta');
            $table->unsignedBigInteger('confirmed_by')->nullable()->after('admin_note');
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
        });

        // 3. Add awaiting_confirmation to orders.status
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending','awaiting_confirmation','confirmed','in_progress','completed','cancelled','refunded') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['proof_url', 'gift_card_code', 'payment_meta', 'admin_note', 'confirmed_by', 'confirmed_at']);
        });

        DB::statement("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending'");

        DB::statement("UPDATE orders SET status = 'pending' WHERE status = 'awaiting_confirmation'");
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending','confirmed','in_progress','completed','cancelled','refunded') NOT NULL DEFAULT 'pending'");
    }
};
