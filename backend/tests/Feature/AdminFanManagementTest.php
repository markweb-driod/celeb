<?php

namespace Tests\Feature;

use App\Models\FanProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFanManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['email' => 'admin@test.com']);
        $this->token = $this->admin->createToken('test')->plainTextToken;
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    private function makeFan(array $overrides = []): FanProfile
    {
        $user = User::factory()->fan()->create($overrides);

        return FanProfile::create([
            'user_id'      => $user->id,
            'display_name' => 'Fan ' . $user->id,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_fans(): void
    {
        $this->getJson('/api/v1/admin/fans')->assertStatus(401);
    }

    public function test_non_admin_cannot_list_fans(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/fans', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_fans(): void
    {
        $this->makeFan();
        $this->makeFan();

        $response = $this->getJson('/api/v1/admin/fans', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['fans' => ['data', 'total']]);

        $this->assertGreaterThanOrEqual(2, $response->json('fans.total'));
    }

    public function test_admin_can_search_fans_by_display_name(): void
    {
        $user1 = User::factory()->fan()->create(['email' => 'fan1@test.com']);
        FanProfile::create(['user_id' => $user1->id, 'display_name' => 'John Doe']);

        $user2 = User::factory()->fan()->create(['email' => 'fan2@test.com']);
        FanProfile::create(['user_id' => $user2->id, 'display_name' => 'Jane Smith']);

        $response = $this->getJson('/api/v1/admin/fans?q=John', $this->authHeader());

        $response->assertOk();
        $names = collect($response->json('fans.data'))->pluck('display_name');
        $this->assertTrue($names->contains('John Doe'));
        $this->assertFalse($names->contains('Jane Smith'));
    }

    public function test_admin_can_filter_fans_by_status(): void
    {
        $user1 = User::factory()->fan()->create(['email' => 'active@test.com', 'status' => 'active']);
        FanProfile::create(['user_id' => $user1->id, 'display_name' => 'Active Fan']);

        $user2 = User::factory()->fan()->create(['email' => 'susp@test.com', 'status' => 'suspended']);
        FanProfile::create(['user_id' => $user2->id, 'display_name' => 'Suspended Fan']);

        $response = $this->getJson('/api/v1/admin/fans?status=suspended', $this->authHeader());

        $response->assertOk();
        // All returned users should be suspended
        foreach ($response->json('fans.data') as $fan) {
            $this->assertEquals('suspended', $fan['user']['status']);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_show_fan(): void
    {
        $fan = $this->makeFan();

        $response = $this->getJson("/api/v1/admin/fans/{$fan->id}", $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['fan', 'recent_orders'])
            ->assertJsonPath('fan.id', $fan->id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update User Status
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_suspend_fan(): void
    {
        $fan = $this->makeFan(['status' => 'active']);

        $this->patchJson("/api/v1/admin/fans/{$fan->id}/user-status", [
            'status' => 'suspended',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $fan->user_id, 'status' => 'suspended']);
    }

    public function test_admin_can_ban_fan(): void
    {
        $fan = $this->makeFan();

        $this->patchJson("/api/v1/admin/fans/{$fan->id}/user-status", [
            'status' => 'banned',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $fan->user_id, 'status' => 'banned']);
    }

    public function test_update_fan_status_rejects_invalid_value(): void
    {
        $fan = $this->makeFan();

        $this->patchJson("/api/v1/admin/fans/{$fan->id}/user-status", [
            'status' => 'deleted',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }
}
