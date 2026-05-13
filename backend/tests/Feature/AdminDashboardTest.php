<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\FanProfile;
use App\Models\Order;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
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

    public function test_unauthenticated_cannot_access_admin_overview(): void
    {
        $this->getJson('/api/v1/admin/overview')
            ->assertStatus(401);
    }

    public function test_fan_cannot_access_admin_overview(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/overview', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    public function test_celebrity_cannot_access_admin_overview(): void
    {
        $celeb = User::factory()->celebrity()->create();
        $token = $celeb->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/overview', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Overview
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_get_overview(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('Overview uses DATE_FORMAT which requires MySQL');
        }

        $response = $this->getJson('/api/v1/admin/overview', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'stats' => [
                    'users_total',
                    'users_by_type',
                    'users_by_status',
                    'orders_total',
                    'orders_by_status',
                    'conversations_total',
                    'messages_total',
                ],
            ]);
    }

    public function test_overview_counts_reflect_actual_data(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('Overview uses DATE_FORMAT which requires MySQL');
        }

        User::factory()->fan()->create();
        User::factory()->celebrity()->create();

        $response = $this->getJson('/api/v1/admin/overview', $this->authHeader());

        $response->assertOk();
        // At minimum admin + 2 created = 3 users
        $this->assertGreaterThanOrEqual(3, $response->json('stats.users_total'));
        $this->assertGreaterThanOrEqual(1, $response->json('stats.users_by_type.fan'));
        $this->assertGreaterThanOrEqual(1, $response->json('stats.users_by_type.celebrity'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Monitoring
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_get_monitoring(): void
    {
        $response = $this->getJson('/api/v1/admin/monitoring', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'system' => ['app_name', 'app_env', 'php_version', 'laravel_version'],
                'health' => ['database_ok'],
            ]);

        $this->assertTrue($response->json('health.database_ok'));
    }

    public function test_unauthenticated_cannot_access_monitoring(): void
    {
        $this->getJson('/api/v1/admin/monitoring')
            ->assertStatus(401);
    }
}
