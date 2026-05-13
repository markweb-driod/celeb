<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\PricingRule;
use App\Models\Service;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPricingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;
    private CelebrityProfile $celeb;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['email' => 'admin@test.com']);
        $this->token = $this->admin->createToken('test')->plainTextToken;

        $celebUser   = User::factory()->celebrity()->create();
        $this->celeb = CelebrityProfile::create([
            'user_id'           => $celebUser->id,
            'stage_name'        => 'Star',
            'slug'              => 'star-' . $celebUser->id,
            'category'          => 'Music',
            'profile_image_url' => 'https://example.com/photo.jpg',
            'commission_rate'   => 20,
        ]);
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    private function makeService(array $overrides = []): Service
    {
        return Service::create(array_merge([
            'celebrity_id'     => $this->celeb->id,
            'service_type'     => 'shoutout',
            'title'            => 'Test Service',
            'slug'             => 'test-service-' . rand(1000, 9999),
            'description'      => 'A test service.',
            'base_price'       => 50.00,
            'currency'         => 'USD',
            'status'           => 'active',
            'is_digital'       => true,
            'requires_booking' => false,
        ], $overrides));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_pricing(): void
    {
        $this->getJson('/api/v1/admin/pricing')->assertStatus(401);
    }

    public function test_non_admin_cannot_access_pricing(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/pricing', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_services_with_defaults(): void
    {
        $this->makeService();

        $response = $this->getJson('/api/v1/admin/pricing', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'defaults' => ['platform_commission_rate', 'default_subscription_price'],
                'services' => ['data'],
            ]);
    }

    public function test_admin_can_search_services_in_pricing(): void
    {
        $this->makeService(['title' => 'Birthday Shoutout']);
        $this->makeService(['title' => 'Anniversary Pack']);

        $response = $this->getJson('/api/v1/admin/pricing?q=Birthday', $this->authHeader());

        $response->assertOk();
        $titles = collect($response->json('services.data'))->pluck('title');
        $this->assertTrue($titles->contains('Birthday Shoutout'));
        $this->assertFalse($titles->contains('Anniversary Pack'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Defaults
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_update_pricing_defaults(): void
    {
        $this->putJson('/api/v1/admin/pricing/defaults', [
            'platform_commission_rate'    => 18,
            'default_subscription_price'  => 24.99,
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'Default pricing updated successfully.');

        $this->assertEquals(18, SystemSetting::getValue('pricing.platform_commission_rate'));
        $this->assertEquals(24.99, SystemSetting::getValue('pricing.default_subscription_price'));
    }

    public function test_platform_commission_rate_must_be_between_0_and_100(): void
    {
        $this->putJson('/api/v1/admin/pricing/defaults', [
            'platform_commission_rate' => 101,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['platform_commission_rate']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Service Price
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_update_service_price(): void
    {
        $service = $this->makeService(['base_price' => 50.00]);

        $this->patchJson("/api/v1/admin/pricing/services/{$service->id}", [
            'base_price' => 75.00,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'base_price' => 75.00]);
    }

    public function test_admin_can_update_service_currency(): void
    {
        $service = $this->makeService(['currency' => 'USD']);

        $this->patchJson("/api/v1/admin/pricing/services/{$service->id}", [
            'base_price' => 50.00,
            'currency'   => 'GBP',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'currency' => 'GBP']);
    }

    public function test_admin_can_pause_service_via_pricing(): void
    {
        $service = $this->makeService(['status' => 'active']);

        $this->patchJson("/api/v1/admin/pricing/services/{$service->id}", [
            'base_price' => 50.00,
            'status'     => 'paused',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'status' => 'paused']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Pricing Rules
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_pricing_rules(): void
    {
        PricingRule::create([
            'name'      => 'Rule A',
            'priority'  => 1,
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/admin/pricing/rules', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['rules']);

        $this->assertCount(1, $response->json('rules'));
    }

    public function test_admin_can_create_pricing_rule(): void
    {
        $response = $this->postJson('/api/v1/admin/pricing/rules', [
            'name'         => 'Superstar Rule',
            'service_type' => 'shoutout',
            'min_price'    => 100,
            'max_price'    => 500,
            'priority'     => 5,
            'is_active'    => true,
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['rule' => ['id', 'name']]);

        $this->assertDatabaseHas('pricing_rules', ['name' => 'Superstar Rule']);
    }

    public function test_create_pricing_rule_requires_name(): void
    {
        $this->postJson('/api/v1/admin/pricing/rules', [
            'priority' => 1,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_admin_can_update_pricing_rule(): void
    {
        $rule = PricingRule::create([
            'name'      => 'Old Rule',
            'priority'  => 1,
            'is_active' => true,
        ]);

        $this->putJson("/api/v1/admin/pricing/rules/{$rule->id}", [
            'name'      => 'Updated Rule',
            'priority'  => 10,
            'is_active' => false,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('pricing_rules', [
            'id'       => $rule->id,
            'name'     => 'Updated Rule',
            'priority' => 10,
        ]);
    }

    public function test_admin_can_delete_pricing_rule(): void
    {
        $rule = PricingRule::create([
            'name'      => 'To Delete',
            'priority'  => 1,
            'is_active' => true,
        ]);

        $this->deleteJson("/api/v1/admin/pricing/rules/{$rule->id}", [], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseMissing('pricing_rules', ['id' => $rule->id]);
    }
}
