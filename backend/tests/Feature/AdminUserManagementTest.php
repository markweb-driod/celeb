<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\FanProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
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

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_users(): void
    {
        $this->getJson('/api/v1/admin/users')->assertStatus(401);
    }

    public function test_fan_cannot_list_users(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/users', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_all_users(): void
    {
        User::factory()->fan()->create(['email' => 'fan1@test.com']);
        User::factory()->celebrity()->create(['email' => 'celeb1@test.com']);

        $response = $this->getJson('/api/v1/admin/users', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['users' => ['data', 'total', 'per_page', 'current_page']]);

        $this->assertGreaterThanOrEqual(3, $response->json('users.total'));
    }

    public function test_admin_can_search_users_by_email(): void
    {
        User::factory()->fan()->create(['email' => 'findme@test.com']);
        User::factory()->fan()->create(['email' => 'other@test.com']);

        $response = $this->getJson('/api/v1/admin/users?q=findme', $this->authHeader());

        $response->assertOk();
        $emails = collect($response->json('users.data'))->pluck('email');
        $this->assertTrue($emails->contains('findme@test.com'));
        $this->assertFalse($emails->contains('other@test.com'));
    }

    public function test_admin_can_filter_users_by_type(): void
    {
        User::factory()->fan()->create(['email' => 'fan@test.com']);
        User::factory()->celebrity()->create(['email' => 'celeb@test.com']);

        $response = $this->getJson('/api/v1/admin/users?user_type=fan', $this->authHeader());

        $response->assertOk();
        $types = collect($response->json('users.data'))->pluck('user_type');
        $this->assertTrue($types->every(fn ($t) => $t === 'fan'));
    }

    public function test_admin_can_filter_users_by_status(): void
    {
        User::factory()->fan()->create(['email' => 'active@test.com', 'status' => 'active']);
        User::factory()->fan()->create(['email' => 'suspended@test.com', 'status' => 'suspended']);

        $response = $this->getJson('/api/v1/admin/users?status=suspended', $this->authHeader());

        $response->assertOk();
        $statuses = collect($response->json('users.data'))->pluck('status');
        $this->assertTrue($statuses->every(fn ($s) => $s === 'suspended'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Status
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_suspend_user(): void
    {
        $user = User::factory()->fan()->create(['status' => 'active']);

        $this->patchJson("/api/v1/admin/users/{$user->id}/status", [
            'status' => 'suspended',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'suspended']);
    }

    public function test_admin_can_ban_user(): void
    {
        $user = User::factory()->fan()->create();

        $this->patchJson("/api/v1/admin/users/{$user->id}/status", [
            'status' => 'banned',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'banned']);
    }

    public function test_admin_can_reactivate_user(): void
    {
        $user = User::factory()->fan()->create(['status' => 'suspended']);

        $this->patchJson("/api/v1/admin/users/{$user->id}/status", [
            'status' => 'active',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'status' => 'active']);
    }

    public function test_update_status_rejects_invalid_status(): void
    {
        $user = User::factory()->fan()->create();

        $this->patchJson("/api/v1/admin/users/{$user->id}/status", [
            'status' => 'deleted',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Commission
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_update_celebrity_commission(): void
    {
        $celebUser = User::factory()->celebrity()->create();
        CelebrityProfile::create([
            'user_id'           => $celebUser->id,
            'stage_name'        => 'Star',
            'slug'              => 'star-' . $celebUser->id,
            'category'          => 'Music',
            'profile_image_url' => 'https://example.com/photo.jpg',
            'commission_rate'   => 20,
        ]);

        $this->patchJson("/api/v1/admin/users/{$celebUser->id}/commission", [
            'commission_rate' => 25,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('celebrity_profiles', [
            'user_id'         => $celebUser->id,
            'commission_rate' => 25,
        ]);
    }

    public function test_admin_cannot_update_fan_commission(): void
    {
        $fanUser = User::factory()->fan()->create();
        FanProfile::create(['user_id' => $fanUser->id, 'display_name' => 'Fan']);

        $this->patchJson("/api/v1/admin/users/{$fanUser->id}/commission", [
            'commission_rate' => 10,
        ], $this->authHeader())
            ->assertStatus(422);
    }

    public function test_commission_rate_must_be_between_0_and_100(): void
    {
        $celebUser = User::factory()->celebrity()->create();
        CelebrityProfile::create([
            'user_id'           => $celebUser->id,
            'stage_name'        => 'Star2',
            'slug'              => 'star2-' . $celebUser->id,
            'category'          => 'Music',
            'profile_image_url' => 'https://example.com/photo.jpg',
            'commission_rate'   => 20,
        ]);

        $this->patchJson("/api/v1/admin/users/{$celebUser->id}/commission", [
            'commission_rate' => 150,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['commission_rate']);
    }
}
