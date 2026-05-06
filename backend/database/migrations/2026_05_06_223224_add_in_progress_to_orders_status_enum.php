<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending','confirmed','in_progress','completed','cancelled','refunded') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("UPDATE orders SET status = 'confirmed' WHERE status = 'in_progress'");
        DB::statement("ALTER TABLE orders MODIFY COLUMN status ENUM('pending','confirmed','completed','cancelled','refunded') NOT NULL DEFAULT 'pending'");
    }
};
