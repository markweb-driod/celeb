<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\FanProfile;
use App\Models\Order;
use App\Models\Service;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    private User $fanUser;
    private FanProfile $fan;
    private string $fanToken;

    private User $celebUser;
    private CelebrityProfile $celeb;
    private string $celebToken;

    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Fan
        $this->fanUser = User::factory()->fan()->create(['email' => 'fan@test.com']);
        $this->fan     = FanProfile::create(['user_id' => $this->fanUser->id, 'display_name' => 'Fan User']);
        $this->fanToken = $this->fanUser->createToken('test')->plainTextToken;

        // Celebrity
        $this->celebUser = User::factory()->celebrity()->create(['email' => 'star@test.com']);
        $this->celeb     = CelebrityProfile::create([
            'user_id'             => $this->celebUser->id,
            'stage_name'          => 'Test Star',
            'slug'                => 'test-star-' . $this->celebUser->id,
            'category'            => 'Music',
            'profile_image_url'   => 'https://example.com/photo.jpg',
            'commission_rate'     => 20,
            'verification_status' => 'verified',
        ]);
        $this->celebToken = $this->celebUser->createToken('test')->plainTextToken;

        // Service
        $this->service = Service::create([
            'celebrity_id'     => $this->celeb->id,
            'service_type'     => 'shoutout',
            'title'            => 'Birthday Shoutout',
            'slug'             => 'birthday-shoutout-' . $this->celebUser->id,
            'description'      => 'A shoutout.',
            'base_price'       => 50.00,
            'currency'         => 'USD',
            'status'           => 'active',
            'is_digital'       => true,
            'requires_booking' => false,
        ]);
    }

    private function fanHeader(): array
    {
        return ['Authorization' => "Bearer {$this->fanToken}"];
    }

    private function celebHeader(): array
    {
        return ['Authorization' => "Bearer {$this->celebToken}"];
    }

    private function makeOrder(array $overrides = []): Order
    {
        return Order::create(array_merge([
            'order_number'  => 'ORD-' . strtoupper(Str::random(10)),
            'fan_id'        => $this->fan->id,
            'celebrity_id'  => $this->celeb->id,
            'service_id'    => $this->service->id,
            'status'        => 'pending',
            'subtotal'      => 50.00,
            'platform_fee'  => 10.00,
            'total_amount'  => 60.00,
            'currency'      => 'USD',
        ], $overrides));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_orders(): void
    {
        $this->getJson('/api/v1/orders')
            ->assertStatus(401);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_list_own_orders(): void
    {
        $this->makeOrder();

        // Other fan's order
        $otherFanUser = User::factory()->fan()->create();
        $otherFan     = FanProfile::create(['user_id' => $otherFanUser->id, 'display_name' => 'Other']);
        Order::create([
            'order_number' => 'ORD-OTHER',
            'fan_id'       => $otherFan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $this->service->id,
            'status'       => 'pending',
            'subtotal'     => 50.00,
            'platform_fee' => 10.00,
            'total_amount' => 60.00,
            'currency'     => 'USD',
        ]);

        $response = $this->getJson('/api/v1/orders', $this->fanHeader());

        $response->assertOk()
            ->assertJsonStructure(['orders' => ['data']]);

        $this->assertCount(1, $response->json('orders.data'));
    }

    public function test_celebrity_can_list_own_orders(): void
    {
        $this->makeOrder();

        $response = $this->getJson('/api/v1/orders', $this->celebHeader());

        $response->assertOk();
        $this->assertCount(1, $response->json('orders.data'));
    }

    public function test_orders_can_be_filtered_by_status(): void
    {
        $this->makeOrder(['status' => 'pending']);
        $this->makeOrder(['order_number' => 'ORD-CONF', 'status' => 'confirmed']);

        $response = $this->getJson('/api/v1/orders?status=pending', $this->fanHeader());

        $response->assertOk();
        $statuses = collect($response->json('orders.data'))->pluck('status');
        $this->assertTrue($statuses->every(fn ($s) => $s === 'pending'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Store
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_create_order(): void
    {
        $response = $this->postJson('/api/v1/orders', [
            'service_id'         => $this->service->id,
            'customization_data' => ['recipient_name' => 'John'],
        ], $this->fanHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['order' => ['id', 'order_number', 'status', 'total_amount']]);

        $this->assertDatabaseHas('orders', [
            'fan_id'     => $this->fan->id,
            'service_id' => $this->service->id,
            'status'     => 'pending',
        ]);
    }

    public function test_create_order_requires_service_id(): void
    {
        $this->postJson('/api/v1/orders', [
            'customization_data' => [],
        ], $this->fanHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['service_id']);
    }

    public function test_create_order_requires_valid_service_id(): void
    {
        $this->postJson('/api/v1/orders', [
            'service_id'         => 99999,
            'customization_data' => [],
        ], $this->fanHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['service_id']);
    }

    public function test_booking_service_requires_booking_date_and_time(): void
    {
        $bookingService = Service::create([
            'celebrity_id'     => $this->celeb->id,
            'service_type'     => 'shoutout',
            'title'            => 'Live Show',
            'slug'             => 'live-show-' . rand(100, 999),
            'description'      => 'A live performance.',
            'base_price'       => 200.00,
            'currency'         => 'USD',
            'status'           => 'active',
            'is_digital'       => true,
            'requires_booking' => true,
        ]);

        $this->postJson('/api/v1/orders', [
            'service_id'         => $bookingService->id,
            'customization_data' => [],
        ], $this->fanHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['booking_date', 'booking_time']);
    }

    public function test_celebrity_cannot_create_order(): void
    {
        $this->postJson('/api/v1/orders', [
            'service_id'         => $this->service->id,
            'customization_data' => [],
        ], $this->celebHeader())
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_show_own_order(): void
    {
        $order = $this->makeOrder();

        $this->getJson("/api/v1/orders/{$order->id}", $this->fanHeader())
            ->assertOk()
            ->assertJsonPath('order.id', $order->id);
    }

    public function test_celebrity_can_show_own_order(): void
    {
        $order = $this->makeOrder();

        $this->getJson("/api/v1/orders/{$order->id}", $this->celebHeader())
            ->assertOk()
            ->assertJsonPath('order.id', $order->id);
    }

    public function test_fan_cannot_show_other_fans_order(): void
    {
        $otherFanUser = User::factory()->fan()->create();
        $otherFan     = FanProfile::create(['user_id' => $otherFanUser->id, 'display_name' => 'Other']);
        $order        = Order::create([
            'order_number' => 'ORD-OTHER2',
            'fan_id'       => $otherFan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $this->service->id,
            'status'       => 'pending',
            'subtotal'     => 50.00,
            'platform_fee' => 10.00,
            'total_amount' => 60.00,
            'currency'     => 'USD',
        ]);

        $this->getJson("/api/v1/orders/{$order->id}", $this->fanHeader())
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update Status
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_confirm_pending_order(): void
    {
        $order = $this->makeOrder(['status' => 'pending']);

        $this->patchJson("/api/v1/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ], $this->celebHeader())
            ->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'confirmed']);
    }

    public function test_celebrity_can_mark_order_as_completed(): void
    {
        $order = $this->makeOrder(['status' => 'confirmed']);

        $this->patchJson("/api/v1/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->celebHeader())
            ->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'completed']);
    }

    public function test_fan_can_cancel_own_pending_order(): void
    {
        $order = $this->makeOrder(['status' => 'pending']);

        $this->patchJson("/api/v1/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ], $this->fanHeader())
            ->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);
    }

    public function test_fan_cannot_cancel_non_pending_order(): void
    {
        $order = $this->makeOrder(['status' => 'confirmed']);

        $this->patchJson("/api/v1/orders/{$order->id}/status", [
            'status' => 'cancelled',
        ], $this->fanHeader())
            ->assertStatus(422);
    }

    public function test_fan_cannot_confirm_order(): void
    {
        $order = $this->makeOrder(['status' => 'pending']);

        $this->patchJson("/api/v1/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ], $this->fanHeader())
            ->assertStatus(422);
    }

    public function test_celebrity_cannot_update_other_celebrities_order(): void
    {
        // Create another celebrity and an order for their fan
        $otherCelebUser = User::factory()->celebrity()->create();
        $otherCeleb     = CelebrityProfile::create([
            'user_id'           => $otherCelebUser->id,
            'stage_name'        => 'Other Celebrity',
            'slug'              => 'other-celeb-' . $otherCelebUser->id,
            'category'          => 'Music',
            'profile_image_url' => 'https://example.com/other.jpg',
            'commission_rate'   => 20,
        ]);
        $otherService = Service::create([
            'celebrity_id' => $otherCeleb->id,
            'service_type' => 'shoutout',
            'title'        => 'Other Svc',
            'slug'         => 'other-svc-' . rand(100, 999),
            'description'  => 'Other.',
            'base_price'   => 30.00,
            'currency'     => 'USD',
            'status'       => 'active',
        ]);
        $order = Order::create([
            'order_number' => 'ORD-NOMINE',
            'fan_id'       => $this->fan->id,
            'celebrity_id' => $otherCeleb->id,
            'service_id'   => $otherService->id,
            'status'       => 'pending',
            'subtotal'     => 30.00,
            'platform_fee' => 6.00,
            'total_amount' => 36.00,
            'currency'     => 'USD',
        ]);

        $this->patchJson("/api/v1/orders/{$order->id}/status", [
            'status' => 'confirmed',
        ], $this->celebHeader())
            ->assertStatus(403);
    }
}
