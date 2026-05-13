<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email'         => fake()->unique()->safeEmail(),
            'password_hash' => static::$password ??= Hash::make('password'),
            'user_type'     => 'fan',
            'status'        => 'active',
            'remember_token' => Str::random(10),
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_type' => 'admin',
        ]);
    }

    public function celebrity(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_type' => 'celebrity',
        ]);
    }

    public function fan(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_type' => 'fan',
        ]);
    }
}
