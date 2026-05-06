<?php

namespace Database\Seeders;

use App\Models\CelebrityProfile;
use App\Models\FanProfile;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Shoutouts', 'Music Performance', 'Q&A', 'Comedy via Video',
            'Business Advice', 'Roast', 'Relationship Advice', 'Marketing',
        ];
        foreach ($categories as $name) {
            ServiceCategory::firstOrCreate(
                ['name' => $name],
                ['slug' => Str::slug($name), 'description' => "Best $name experiences.", 'display_order' => 0, 'is_active' => true]
            );
        }

        $shoutoutCat = ServiceCategory::where('name', 'Shoutouts')->first();
        $musicCat    = ServiceCategory::where('name', 'Music Performance')->first();
        $qaCat       = ServiceCategory::where('name', 'Q&A')->first();
        $comedyCat   = ServiceCategory::where('name', 'Comedy via Video')->first();
        $roastCat    = ServiceCategory::where('name', 'Roast')->first();

        $fan = User::firstOrCreate(
            ['email' => 'fan@demo.com'],
            ['user_type' => 'fan', 'status' => 'active', 'password_hash' => 'password']
        );
        FanProfile::firstOrCreate(
            ['user_id' => $fan->id],
            ['display_name' => 'Alex Demo Fan', 'total_spent' => 0, 'total_bookings' => 0]
        );

        $celebrities = [
            [
                'email' => 'celebrity@demo.com', 'stage_name' => 'Luna Starr', 'slug' => 'luna-starr',
                'bio' => 'Multi-platinum pop artist and actress. Known for electrifying performances worldwide.',
                'category' => 'Music', 'followers' => 4200000, 'rating' => 4.9, 'rating_count' => 812, 'featured' => true,
                'services' => [
                    ['category_id' => $shoutoutCat?->id, 'service_type' => 'video_message', 'title' => 'Personalised Birthday Shoutout', 'slug' => 'luna-starr-birthday-shoutout', 'description' => 'A personalised video message for you or a loved one. Perfect for birthdays and anniversaries.', 'base_price' => '149.99', 'max_delivery_days' => 3, 'total_sold' => 234],
                    ['category_id' => $musicCat?->id,    'service_type' => 'video_message', 'title' => 'Exclusive Acoustic Performance', 'slug' => 'luna-starr-acoustic', 'description' => 'Request your favourite song and I will perform it acoustically just for you.', 'base_price' => '399.00', 'max_delivery_days' => 7, 'total_sold' => 88],
                ],
            ],
            [
                'email' => 'celebrity2@demo.com', 'stage_name' => 'Marcus The King Johnson', 'slug' => 'marcus-the-king-johnson',
                'bio' => 'Three-time world boxing champion and motivational powerhouse. Helping you unlock your inner champion.',
                'category' => 'Sports', 'followers' => 2800000, 'rating' => 4.8, 'rating_count' => 540, 'featured' => true,
                'services' => [
                    ['category_id' => $shoutoutCat?->id, 'service_type' => 'video_message',   'title' => 'Champion Motivation Video',  'slug' => 'marcus-champion-motivation', 'description' => 'A fire motivation speech to get you training harder than ever.', 'base_price' => '99.00',  'max_delivery_days' => 2, 'total_sold' => 412],
                    ['category_id' => $qaCat?->id,       'service_type' => 'video_message',   'title' => '1-on-1 Training Q&A',        'slug' => 'marcus-training-qa',          'description' => 'Send me your training questions and I will answer them in a personalised video.', 'base_price' => '199.00', 'max_delivery_days' => 5, 'total_sold' => 156],
                ],
            ],
            [
                'email' => 'celebrity3@demo.com', 'stage_name' => 'Zara Voss', 'slug' => 'zara-voss',
                'bio' => 'Stand-up comedian, actress, and podcast host. Bringing laughs to millions one roast at a time.',
                'category' => 'Comedy', 'followers' => 1500000, 'rating' => 4.7, 'rating_count' => 329, 'featured' => false,
                'services' => [
                    ['category_id' => $comedyCat?->id, 'service_type' => 'video_message', 'title' => 'Comedy Video Message',       'slug' => 'zara-voss-comedy-video', 'description' => 'A hilarious custom comedy video for your friend or colleague. Guaranteed laughs.', 'base_price' => '79.00',  'max_delivery_days' => 3, 'total_sold' => 601],
                    ['category_id' => $roastCat?->id,  'service_type' => 'video_message', 'title' => 'Personalised Celebrity Roast', 'slug' => 'zara-voss-roast',         'description' => 'Tell me about your target and I will roast them in style. No one is safe.', 'base_price' => '119.00', 'max_delivery_days' => 4, 'total_sold' => 287],
                ],
            ],
            [
                'email' => 'celebrity4@demo.com', 'stage_name' => 'Dr. Priya Nair', 'slug' => 'dr-priya-nair',
                'bio' => 'Tech entrepreneur, bestselling author, and keynote speaker. Forbes 30 Under 30.',
                'category' => 'Business', 'followers' => 980000, 'rating' => 4.9, 'rating_count' => 203, 'featured' => true,
                'services' => [
                    ['category_id' => $qaCat?->id, 'service_type' => 'video_message', 'title' => 'Startup Advice Video', 'slug' => 'priya-startup-advice', 'description' => 'Send me your startup question and I will answer it in a detailed personalised video.', 'base_price' => '249.00', 'max_delivery_days' => 5, 'total_sold' => 97],
                ],
            ],
        ];

        foreach ($celebrities as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                ['user_type' => 'celebrity', 'status' => 'active', 'password_hash' => 'password']
            );
            $profile = CelebrityProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'stage_name' => $data['stage_name'], 'slug' => $data['slug'], 'bio' => $data['bio'],
                    'category' => $data['category'], 'verification_status' => 'verified',
                    'total_followers' => $data['followers'], 'rating_average' => $data['rating'],
                    'rating_count' => $data['rating_count'], 'commission_rate' => 10.00, 'is_featured' => $data['featured'],
                ]
            );
            foreach ($data['services'] as $svc) {
                Service::firstOrCreate(
                    ['slug' => $svc['slug']],
                    array_merge($svc, [
                        'celebrity_id' => $profile->id, 'currency' => 'USD', 'pricing_type' => 'fixed',
                        'is_digital' => true, 'requires_booking' => false, 'duration_minutes' => 0,
                        'view_count' => rand(500, 5000), 'status' => 'active',
                    ])
                );
            }
        }

        $this->command->info('Demo users seeded:');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['Fan',       'fan@demo.com',        'password'],
                ['Celebrity', 'celebrity@demo.com',  'password'],
                ['Celebrity', 'celebrity2@demo.com', 'password'],
                ['Celebrity', 'celebrity3@demo.com', 'password'],
                ['Celebrity', 'celebrity4@demo.com', 'password'],
            ]
        );
    }
}