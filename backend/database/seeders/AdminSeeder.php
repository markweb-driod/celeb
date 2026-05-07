<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@celebstarshub.com'],
            [
                'user_type'     => 'admin',
                'status'        => 'active',
                'password_hash' => 'Admin@1234',
            ]
        );

        $this->command->info('Admin seeded: admin@celebstarshub.com / Admin@1234');
    }
}
