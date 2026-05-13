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

class AdminAnalyticsAuditTest extends TestCase
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
    // Analytics Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_analytics(): void
    {
        $this->getJson('/api/v1/admin/analytics')->assertStatus(401);
    }

    public function test_non_admin_cannot_access_analytics(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/analytics', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Analytics
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_get_analytics(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('Analytics uses DATE_FORMAT which requires MySQL');
        }

        $response = $this->getJson('/api/v1/admin/analytics', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'monthly',
                'top_services',
                'top_celebrities',
            ]);

        // Monthly should have 6 entries (current + 5 previous months)
        $this->assertCount(6, $response->json('monthly'));
    }

    public function test_analytics_monthly_has_expected_keys(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('Analytics uses DATE_FORMAT which requires MySQL');
        }

        $response = $this->getJson('/api/v1/admin/analytics', $this->authHeader());

        $response->assertOk();
        $first = $response->json('monthly.0');
        $this->assertArrayHasKey('month', $first);
        $this->assertArrayHasKey('gross', $first);
        $this->assertArrayHasKey('refunds', $first);
        $this->assertArrayHasKey('net', $first);
        $this->assertArrayHasKey('platform_fees', $first);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Audit Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_audit_log(): void
    {
        $this->getJson('/api/v1/admin/audit')->assertStatus(401);
    }

    public function test_non_admin_cannot_access_audit_log(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/audit', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Audit
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_get_audit_log(): void
    {
        // Create some data for audit entries
        User::factory()->fan()->create(['email' => 'new@test.com']);

        $response = $this->getJson('/api/v1/admin/audit', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['logs']);

        $this->assertNotEmpty($response->json('logs'));
    }

    public function test_audit_log_entries_have_expected_structure(): void
    {
        User::factory()->fan()->create(['email' => 'audit@test.com']);

        $response = $this->getJson('/api/v1/admin/audit', $this->authHeader());

        $response->assertOk();
        $first = $response->json('logs.0');
        $this->assertArrayHasKey('type', $first);
        $this->assertArrayHasKey('category', $first);
        $this->assertArrayHasKey('label', $first);
        $this->assertArrayHasKey('detail', $first);
        $this->assertArrayHasKey('created_at', $first);
    }

    public function test_audit_log_can_be_filtered_by_type(): void
    {
        $response = $this->getJson('/api/v1/admin/audit?type=user', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['logs']);

        $categories = collect($response->json('logs'))->pluck('category');
        $this->assertTrue($categories->every(fn ($c) => $c === 'user'));
    }

    public function test_audit_log_type_must_be_valid(): void
    {
        $this->getJson('/api/v1/admin/audit?type=invalid', $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_audit_log_can_be_filtered_by_transaction_type(): void
    {
        $response = $this->getJson('/api/v1/admin/audit?type=transaction', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['logs']);

        $categories = collect($response->json('logs'))->pluck('category');
        $this->assertTrue($categories->every(fn ($c) => $c === 'transaction'));
    }
}
