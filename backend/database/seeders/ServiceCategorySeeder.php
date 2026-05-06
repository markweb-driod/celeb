<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Shoutouts',
            'Q&A',
            'Business Advice',
            'Comedy via Video',
            'Music Performance',
            'Roast',
            'Relationship Advice',
            'Marketing',
        ];

        foreach ($categories as $category) {
            ServiceCategory::firstOrCreate(
                ['name' => $category],
                [
                    'slug' => Str::slug($category),
                    'description' => "Find the best $category services.",
                    'display_order' => 0,
                    'is_active' => true,
                ]
            );
        }
    }
}
