<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('service_type')->nullable()->comment('membership|shoutout|live_session|etc — null = all');
            $table->string('celebrity_tier')->nullable()->comment('rising|established|superstar — null = all');
            $table->string('region')->nullable()->comment('ISO 3166-1 alpha-2 country code or null for global');
            $table->decimal('min_price', 10, 2)->nullable();
            $table->decimal('max_price', 10, 2)->nullable();
            $table->decimal('commission_override', 5, 2)->nullable()->comment('Platform commission % override');
            $table->integer('priority')->default(0)->comment('Higher = applied first');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rules');
    }
};
