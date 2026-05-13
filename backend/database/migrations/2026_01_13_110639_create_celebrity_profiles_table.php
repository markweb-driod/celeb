<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('celebrity_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->onDelete('cascade');
            $table->string('stage_name');
            $table->string('slug')->unique();
            $table->text('bio')->nullable();
            $table->string('category')->nullable();
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('profile_image_url')->nullable();
            $table->text('cover_image_url')->nullable();
            $table->json('social_links')->nullable();
            $table->integer('total_followers')->default(0);
            $table->decimal('rating_average', 3, 2)->default(0.00);
            $table->integer('rating_count')->default(0);
            $table->decimal('commission_rate', 5, 2)->default(15.00);
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
            if (\DB::getDriverName() !== 'sqlite') {
                $table->fullText(['stage_name', 'bio']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('celebrity_profiles');
    }
};
