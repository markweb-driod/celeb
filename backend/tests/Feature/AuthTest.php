<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    // ──────────────────────────────────────────────────────────────────────────
    // Register
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email'                 => 'fan@example.com',
            'password'              => 'Password@1',
            'password_confirmation' => 'Password@1',
            'user_type'             => 'fan',
            'display_name'          => 'FanUser',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'email', 'user_type'],
                'access_token',
                'token_type',
            ]);

        $this->assertDatabaseHas('users', ['email' => 'fan@example.com', 'user_type' => 'fan']);
        $this->assertDatabaseHas('fan_profiles', ['display_name' => 'FanUser']);
    }

    public function test_celebrity_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email'                 => 'star@example.com',
            'password'              => 'Password@1',
            'password_confirmation' => 'Password@1',
            'user_type'             => 'celebrity',
            'stage_name'            => 'Test Star',
            'category'              => 'Music',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'email', 'user_type'],
                'access_token',
            ]);

        $this->assertDatabaseHas('users', ['email' => 'star@example.com', 'user_type' => 'celebrity']);
        $this->assertDatabaseHas('celebrity_profiles', ['stage_name' => 'Test Star']);
    }

    public function test_register_requires_email(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'password'  => 'Password@1',
            'user_type' => 'fan',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_requires_unique_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'email'     => 'taken@example.com',
            'password'  => 'Password@1',
            'user_type' => 'fan',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_requires_password(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'email'     => 'new@example.com',
            'user_type' => 'fan',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_register_requires_valid_user_type(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'email'     => 'new@example.com',
            'password'  => 'Password@1',
            'user_type' => 'superuser',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['user_type']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Login
    // ──────────────────────────────────────────────────────────────────────────

    public function test_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->fan()->create([
            'email'         => 'login@example.com',
            'password_hash' => bcrypt('Password@1'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'login@example.com',
            'password' => 'Password@1',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'message',
                'user',
                'access_token',
                'token_type',
            ]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->fan()->create([
            'email'         => 'wrong@example.com',
            'password_hash' => bcrypt('CorrectPassword@1'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email'    => 'wrong@example.com',
            'password' => 'WrongPassword@1',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_fails_with_unregistered_email(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'nobody@example.com',
            'password' => 'Password@1',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_requires_email_and_password(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Logout
    // ──────────────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_logout(): void
    {
        $user  = User::factory()->fan()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully');
    }

    public function test_unauthenticated_cannot_logout(): void
    {
        $this->postJson('/api/v1/auth/logout')
            ->assertStatus(401);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Me
    // ──────────────────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_get_profile(): void
    {
        $user  = User::factory()->fan()->create(['email' => 'me@example.com']);
        $token = $user->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('email', 'me@example.com');
    }

    public function test_unauthenticated_cannot_get_profile(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }
}
