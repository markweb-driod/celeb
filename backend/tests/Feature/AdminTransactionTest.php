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

class AdminTransactionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;

    private FanProfile $fan;
    private CelebrityProfile $celeb;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['email' => 'admin@test.com']);
        $this->token = $this->admin->createToken('test')->plainTextToken;

        $fanUser    = User::factory()->fan()->create();
        $this->fan  = FanProfile::create(['user_id' => $fanUser->id, 'display_name' => 'Fan']);

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
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    private function makeOrder(string $status = 'pending'): Order
    {
        return Order::create([
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'fan_id'       => $this->fan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $this->service->id,
            'status'       => $status,
            'subtotal'     => 50.00,
            'platform_fee' => 10.00,
            'total_amount' => 60.00,
            'currency'     => 'USD',
        ]);
    }

    private function makeTransaction(Order $order, string $status = 'pending'): Transaction
    {
        return Transaction::create([
            'transaction_number' => 'TXN-' . strtoupper(Str::random(12)),
            'order_id'           => $order->id,
            'user_id'            => $this->fan->user_id,
            'transaction_type'   => 'payment',
            'payment_method'     => 'paypal',
            'amount'             => 60.00,
            'currency'           => 'USD',
            'status'             => $status,
            'created_at'         => now(),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_list_transactions(): void
    {
        $this->getJson('/api/v1/admin/transactions')->assertStatus(401);
    }

    public function test_non_admin_cannot_list_transactions(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/transactions', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_transactions(): void
    {
        $order = $this->makeOrder('pending');
        $this->makeTransaction($order);

        $response = $this->getJson('/api/v1/admin/transactions', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'transactions' => ['data'],
                'summary' => ['total_payments', 'total_refunds', 'pending_confirmation_count'],
            ]);
    }

    public function test_admin_can_filter_transactions_by_status(): void
    {
        $order1 = $this->makeOrder('pending');
        $this->makeTransaction($order1, 'pending');

        $order2 = $this->makeOrder('confirmed');
        $this->makeTransaction($order2, 'completed');

        $response = $this->getJson('/api/v1/admin/transactions?status=completed', $this->authHeader());

        $response->assertOk();
        $statuses = collect($response->json('transactions.data'))->pluck('status');
        $this->assertTrue($statuses->every(fn ($s) => $s === 'completed'));
    }

    public function test_admin_can_filter_transactions_by_type(): void
    {
        $order = $this->makeOrder('pending');
        $this->makeTransaction($order, 'pending');

        $response = $this->getJson('/api/v1/admin/transactions?transaction_type=payment', $this->authHeader());

        $response->assertOk();
        $types = collect($response->json('transactions.data'))->pluck('transaction_type');
        $this->assertTrue($types->every(fn ($t) => $t === 'payment'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_show_transaction(): void
    {
        $order       = $this->makeOrder('pending');
        $transaction = $this->makeTransaction($order);

        $response = $this->getJson("/api/v1/admin/transactions/{$transaction->id}", $this->authHeader());

        $response->assertOk()
            ->assertJsonPath('transaction.id', $transaction->id)
            ->assertJsonStructure(['transaction' => ['id', 'transaction_number', 'status', 'amount']]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Confirm
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_confirm_pending_transaction(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('pending_confirmation status requires MySQL enum extension');
        }

        $order       = $this->makeOrder('pending');
        $transaction = $this->makeTransaction($order, 'pending');

        $this->postJson("/api/v1/admin/transactions/{$transaction->id}/confirm", [
            'admin_note' => 'Verified payment.',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'Payment confirmed.');

        $this->assertDatabaseHas('transactions', [
            'id'     => $transaction->id,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('orders', [
            'id'     => $order->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_cannot_confirm_already_completed_transaction(): void
    {
        $order       = $this->makeOrder('confirmed');
        $transaction = $this->makeTransaction($order, 'completed');

        $this->postJson("/api/v1/admin/transactions/{$transaction->id}/confirm", [], $this->authHeader())
            ->assertStatus(422);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Reject
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_reject_pending_transaction(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('pending_confirmation status requires MySQL enum extension');
        }

        $order       = $this->makeOrder('pending');
        $transaction = $this->makeTransaction($order, 'pending');

        $this->postJson("/api/v1/admin/transactions/{$transaction->id}/reject", [
            'admin_note' => 'Proof was invalid.',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('transactions', [
            'id'     => $transaction->id,
            'status' => 'failed',
        ]);
    }

    public function test_cannot_reject_completed_transaction(): void
    {
        $order       = $this->makeOrder('confirmed');
        $transaction = $this->makeTransaction($order, 'completed');

        $this->postJson("/api/v1/admin/transactions/{$transaction->id}/reject", [], $this->authHeader())
            ->assertStatus(422);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Payouts
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_payouts(): void
    {
        $response = $this->getJson('/api/v1/admin/payouts', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['payouts']);
    }

    public function test_unauthenticated_cannot_list_payouts(): void
    {
        $this->getJson('/api/v1/admin/payouts')->assertStatus(401);
    }
}
