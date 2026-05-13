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

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $fanUser;
    private FanProfile $fan;
    private string $fanToken;

    private CelebrityProfile $celeb;
    private Service $service;
    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // Fan
        $this->fanUser = User::factory()->fan()->create(['email' => 'fan@test.com']);
        $this->fan     = FanProfile::create(['user_id' => $this->fanUser->id, 'display_name' => 'Fan User']);
        $this->fanToken = $this->fanUser->createToken('test')->plainTextToken;

        // Celebrity + service
        $celebUser   = User::factory()->celebrity()->create();
        $this->celeb = CelebrityProfile::create([
            'user_id'           => $celebUser->id,
            'stage_name'        => 'Star',
            'slug'              => 'star-' . $celebUser->id,
            'category'          => 'Music',
            'profile_image_url' => 'https://example.com/photo.jpg',
            'commission_rate'   => 20,
        ]);
        $this->service = Service::create([
            'celebrity_id'     => $this->celeb->id,
            'service_type'     => 'shoutout',
            'title'            => 'Shoutout',
            'slug'             => 'shoutout-' . $celebUser->id,
            'description'      => 'Desc.',
            'base_price'       => 50.00,
            'currency'         => 'USD',
            'status'           => 'active',
            'is_digital'       => true,
            'requires_booking' => false,
        ]);

        // Order
        $this->order = Order::create([
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'fan_id'       => $this->fan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $this->service->id,
            'status'       => 'pending',
            'subtotal'     => 50.00,
            'platform_fee' => 10.00,
            'total_amount' => 60.00,
            'currency'     => 'USD',
        ]);

        // Enable a payment method
        SystemSetting::setValue('payments.methods', [
            'paypal' => [
                'label'        => 'PayPal',
                'type'         => 'manual',
                'enabled'      => true,
                'email'        => 'pay@example.com',
                'instructions' => 'Send to PayPal.',
            ],
        ]);
    }

    private function fanHeader(): array
    {
        return ['Authorization' => "Bearer {$this->fanToken}"];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Upload Proof
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_upload_payment_proof(): void
    {
        $file = UploadedFile::fake()->image('proof.jpg', 200, 200);

        $response = $this->call(
            'POST',
            '/api/v1/payments/upload-proof',
            [],
            [],
            ['proof' => $file],
            ['HTTP_Authorization' => "Bearer {$this->fanToken}"]
        );

        $response->assertOk()
            ->assertJsonStructure(['proof_url']);

        $this->assertStringContainsString('payment-proofs', $response->json('proof_url'));
    }

    public function test_upload_proof_requires_file(): void
    {
        $this->postJson('/api/v1/payments/upload-proof', [], $this->fanHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['proof']);
    }

    public function test_upload_proof_requires_authenticated_user(): void
    {
        $file = UploadedFile::fake()->image('proof.jpg');

        $this->postJson('/api/v1/payments/upload-proof', [], [])
            ->assertStatus(401);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Submit Payment
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_submit_payment(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('pending_confirmation/awaiting_confirmation statuses require MySQL enum extension');
        }

        $response = $this->postJson("/api/v1/orders/{$this->order->id}/payment/submit", [
            'payment_method' => 'paypal',
        ], $this->fanHeader());

        $response->assertOk()
            ->assertJsonStructure(['transaction']);

        $this->assertDatabaseHas('transactions', [
            'order_id'       => $this->order->id,
            'payment_method' => 'paypal',
        ]);
    }

    public function test_submit_payment_requires_payment_method(): void
    {
        $this->postJson("/api/v1/orders/{$this->order->id}/payment/submit", [], $this->fanHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['payment_method']);
    }

    public function test_submit_payment_rejects_disabled_method(): void
    {
        $this->postJson("/api/v1/orders/{$this->order->id}/payment/submit", [
            'payment_method' => 'zelle',
        ], $this->fanHeader())
            ->assertStatus(422);
    }

    public function test_fan_cannot_submit_payment_for_other_fans_order(): void
    {
        $otherFanUser = User::factory()->fan()->create();
        $otherFan     = FanProfile::create(['user_id' => $otherFanUser->id, 'display_name' => 'Other']);
        $otherOrder   = Order::create([
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

        $this->postJson("/api/v1/orders/{$otherOrder->id}/payment/submit", [
            'payment_method' => 'paypal',
        ], $this->fanHeader())
            ->assertStatus(403);
    }

    public function test_cannot_submit_payment_for_non_pending_order(): void
    {
        $this->order->update(['status' => 'confirmed']);

        $this->postJson("/api/v1/orders/{$this->order->id}/payment/submit", [
            'payment_method' => 'paypal',
        ], $this->fanHeader())
            ->assertStatus(422);
    }

    public function test_unauthenticated_cannot_submit_payment(): void
    {
        $this->postJson("/api/v1/orders/{$this->order->id}/payment/submit", [
            'payment_method' => 'paypal',
        ])
            ->assertStatus(401);
    }
}
