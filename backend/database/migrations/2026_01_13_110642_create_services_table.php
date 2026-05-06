<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('celebrity_id')->constrained('celebrity_profiles')->onDelete('cascade');
            $table->foreignId('category_id')->nullable()->constrained('service_categories');
            $table->enum('service_type', ['fan_card', 'video_message', 'private_event', 'birthday_performance', 'meet_greet', 'merchandise', 'exclusive_content', 'membership', 'shoutout']);
            $table->string('title');
            $table->string('slug');
            $table->text('description');
            $table->json('images')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->enum('pricing_type', ['fixed', 'hourly', 'tiered'])->default('fixed');
            $table->boolean('is_digital')->default(false);
            $table->boolean('requires_booking')->default(false);
            $table->integer('max_delivery_days')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->enum('status', ['draft', 'active', 'paused'])->default('draft');
            $table->integer('total_sold')->default(0);
            $table->integer('view_count')->default(0);
            $table->timestamps();
            $table->fullText(['title', 'description']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
