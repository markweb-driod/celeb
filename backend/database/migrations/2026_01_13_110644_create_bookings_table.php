<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->onDelete('cascade');
            $table->date('booking_date');
            $table->time('booking_time')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->enum('location_type', ['virtual', 'in_person']);
            $table->json('location_details')->nullable();
            $table->text('video_call_url')->nullable();
            $table->enum('booking_status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
