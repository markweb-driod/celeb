<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPaymentConfigTest extends TestCase
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

    public function test_unauthenticated_cannot_access_payment_config(): void
    {
        $this->getJson('/api/v1/admin/payments/config')->assertStatus(401);
    }

    public function test_non_admin_cannot_access_payment_config(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/payments/config', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show Config
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_show_payment_config(): void
    {
        $response = $this->getJson('/api/v1/admin/payments/config', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'payment_config' => ['payout_schedule', 'vat_rate'],
                'payment_methods',
            ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Config
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_update_payment_config(): void
    {
        $this->putJson('/api/v1/admin/payments/config', [
            'payout_schedule' => 'weekly',
            'vat_rate'        => 10,
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'Payment configuration updated.');

        $this->assertEquals('weekly', SystemSetting::getValue('payments.payout_schedule'));
        $this->assertEquals(10, SystemSetting::getValue('payments.vat_rate'));
    }

    public function test_payout_schedule_must_be_valid_value(): void
    {
        $this->putJson('/api/v1/admin/payments/config', [
            'payout_schedule' => 'yearly',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payout_schedule']);
    }

    public function test_vat_rate_must_be_between_0_and_100(): void
    {
        $this->putJson('/api/v1/admin/payments/config', [
            'vat_rate' => 150,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['vat_rate']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show Methods
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_show_payment_methods(): void
    {
        $response = $this->getJson('/api/v1/admin/payments/methods', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['payment_methods']);

        // All known methods should be present (defaults merged)
        $keys = array_keys($response->json('payment_methods'));
        $this->assertContains('paypal', $keys);
        $this->assertContains('zelle', $keys);
        $this->assertContains('cashapp', $keys);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Methods
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_enable_payment_method(): void
    {
        $this->putJson('/api/v1/admin/payments/methods', [
            'methods' => [
                'paypal' => [
                    'enabled' => true,
                    'email'   => 'pay@example.com',
                ],
            ],
        ], $this->authHeader())
            ->assertOk();

        $stored = SystemSetting::getValue('payments.methods');
        $this->assertTrue((bool) ($stored['paypal']['enabled'] ?? false));
    }

    public function test_update_methods_requires_methods_array(): void
    {
        $this->putJson('/api/v1/admin/payments/methods', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['methods']);
    }
}
