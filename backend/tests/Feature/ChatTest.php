<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\Conversation;
use App\Models\FanProfile;
use App\Models\Message;
use App\Models\Order;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    private User $fanUser;
    private FanProfile $fan;
    private string $fanToken;

    private User $celebUser;
    private CelebrityProfile $celeb;
    private string $celebToken;

    private Service $membershipService;

    protected function setUp(): void
    {
        parent::setUp();

        // Fan
        $this->fanUser  = User::factory()->fan()->create(['email' => 'fan@test.com']);
        $this->fan      = FanProfile::create(['user_id' => $this->fanUser->id, 'display_name' => 'Fan User']);
        $this->fanToken = $this->fanUser->createToken('test')->plainTextToken;

        // Celebrity
        $this->celebUser  = User::factory()->celebrity()->create(['email' => 'star@test.com']);
        $this->celeb      = CelebrityProfile::create([
            'user_id'           => $this->celebUser->id,
            'stage_name'        => 'Test Star',
            'slug'              => 'test-star-' . $this->celebUser->id,
            'category'          => 'Music',
            'profile_image_url' => 'https://example.com/photo.jpg',
            'commission_rate'   => 20,
        ]);
        $this->celebToken = $this->celebUser->createToken('test')->plainTextToken;

        // Membership service
        $this->membershipService = Service::create([
            'celebrity_id'     => $this->celeb->id,
            'service_type'     => 'membership',
            'title'            => 'Premium Membership',
            'slug'             => 'membership-' . $this->celebUser->id,
            'description'      => 'Monthly membership.',
            'base_price'       => 19.99,
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

    private function makeConfirmedMembershipOrder(): Order
    {
        return Order::create([
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'fan_id'       => $this->fan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $this->membershipService->id,
            'status'       => 'confirmed',
            'subtotal'     => 19.99,
            'platform_fee' => 4.00,
            'total_amount' => 23.99,
            'currency'     => 'USD',
        ]);
    }

    private function makeConversation(Order $order, string $status = 'active'): Conversation
    {
        return Conversation::create([
            'order_id'        => $order->id,
            'status'          => $status,
            'last_message_at' => now(),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Subscriptions
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_list_subscriptions(): void
    {
        $order = $this->makeConfirmedMembershipOrder();
        $this->makeConversation($order);

        $response = $this->getJson('/api/v1/chat/subscriptions', $this->fanHeader());

        $response->assertOk()
            ->assertJsonStructure(['subscriptions']);

        $this->assertCount(1, $response->json('subscriptions'));
    }

    public function test_celebrity_cannot_access_subscriptions(): void
    {
        $this->getJson('/api/v1/chat/subscriptions', $this->celebHeader())
            ->assertStatus(403);
    }

    public function test_unauthenticated_cannot_access_subscriptions(): void
    {
        $this->getJson('/api/v1/chat/subscriptions')
            ->assertStatus(401);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Conversations Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_list_conversations(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('latestOfMany with SQLite has an ambiguous column_id bug');
        }

        $order = $this->makeConfirmedMembershipOrder();
        $this->makeConversation($order);

        $response = $this->getJson('/api/v1/chat/conversations', $this->celebHeader());

        $response->assertOk()
            ->assertJsonStructure(['conversations' => ['data']]);
    }

    public function test_fan_can_list_conversations(): void
    {
        if (config('database.default') === 'sqlite') {
            $this->markTestSkipped('latestOfMany with SQLite has an ambiguous column_id bug');
        }

        $order = $this->makeConfirmedMembershipOrder();
        $this->makeConversation($order);

        $response = $this->getJson('/api/v1/chat/conversations', $this->fanHeader());

        $response->assertOk()
            ->assertJsonStructure(['conversations' => ['data']]);
    }

    public function test_unauthenticated_cannot_list_conversations(): void
    {
        $this->getJson('/api/v1/chat/conversations')
            ->assertStatus(401);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Conversations Store
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_start_conversation_for_confirmed_membership_order(): void
    {
        $order = $this->makeConfirmedMembershipOrder();

        $response = $this->postJson('/api/v1/chat/conversations', [
            'order_id' => $order->id,
        ], $this->fanHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['conversation']);

        $this->assertDatabaseHas('conversations', ['order_id' => $order->id]);
    }

    public function test_starting_conversation_for_same_order_is_idempotent(): void
    {
        $order = $this->makeConfirmedMembershipOrder();

        $this->postJson('/api/v1/chat/conversations', ['order_id' => $order->id], $this->fanHeader())
            ->assertStatus(201);

        $this->postJson('/api/v1/chat/conversations', ['order_id' => $order->id], $this->fanHeader())
            ->assertStatus(201);

        $this->assertDatabaseCount('conversations', 1);
    }

    public function test_fan_cannot_start_conversation_for_pending_order(): void
    {
        $pendingOrder = Order::create([
            'order_number' => 'ORD-PEND',
            'fan_id'       => $this->fan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $this->membershipService->id,
            'status'       => 'pending',
            'subtotal'     => 19.99,
            'platform_fee' => 4.00,
            'total_amount' => 23.99,
            'currency'     => 'USD',
        ]);

        $this->postJson('/api/v1/chat/conversations', ['order_id' => $pendingOrder->id], $this->fanHeader())
            ->assertStatus(422);
    }

    public function test_fan_cannot_start_conversation_for_non_membership_service(): void
    {
        $shoutoutService = Service::create([
            'celebrity_id'     => $this->celeb->id,
            'service_type'     => 'shoutout',
            'title'            => 'Shoutout',
            'slug'             => 'shoutout-x',
            'description'      => 'Desc.',
            'base_price'       => 50.00,
            'currency'         => 'USD',
            'status'           => 'active',
            'is_digital'       => true,
            'requires_booking' => false,
        ]);
        $order = Order::create([
            'order_number' => 'ORD-SHOUT',
            'fan_id'       => $this->fan->id,
            'celebrity_id' => $this->celeb->id,
            'service_id'   => $shoutoutService->id,
            'status'       => 'confirmed',
            'subtotal'     => 50.00,
            'platform_fee' => 10.00,
            'total_amount' => 60.00,
            'currency'     => 'USD',
        ]);

        $this->postJson('/api/v1/chat/conversations', ['order_id' => $order->id], $this->fanHeader())
            ->assertStatus(422);
    }

    public function test_celebrity_cannot_start_conversation(): void
    {
        $order = $this->makeConfirmedMembershipOrder();

        $this->postJson('/api/v1/chat/conversations', ['order_id' => $order->id], $this->celebHeader())
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Messages
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_list_messages_in_own_conversation(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order);
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id'       => $this->fanUser->id,
            'content'         => 'Hello!',
        ]);

        $response = $this->getJson("/api/v1/chat/conversations/{$conversation->id}/messages", $this->fanHeader());

        $response->assertOk()
            ->assertJsonStructure(['messages']);
    }

    public function test_celebrity_can_list_messages_in_own_conversation(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order);

        $response = $this->getJson("/api/v1/chat/conversations/{$conversation->id}/messages", $this->celebHeader());

        $response->assertOk();
    }

    public function test_fan_can_send_message(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order);

        $response = $this->postJson(
            "/api/v1/chat/conversations/{$conversation->id}/messages",
            ['content' => 'Hi there!'],
            $this->fanHeader()
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.content', 'Hi there!');

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'sender_id'       => $this->fanUser->id,
            'content'         => 'Hi there!',
        ]);
    }

    public function test_celebrity_can_send_message(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order);

        $response = $this->postJson(
            "/api/v1/chat/conversations/{$conversation->id}/messages",
            ['content' => 'Welcome!'],
            $this->celebHeader()
        );

        $response->assertStatus(201);
    }

    public function test_send_message_requires_content(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order);

        $this->postJson(
            "/api/v1/chat/conversations/{$conversation->id}/messages",
            [],
            $this->fanHeader()
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors(['content']);
    }

    public function test_cannot_send_message_to_archived_conversation(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order, 'archived');

        $this->postJson(
            "/api/v1/chat/conversations/{$conversation->id}/messages",
            ['content' => 'Hello?'],
            $this->fanHeader()
        )
            ->assertStatus(422);
    }

    public function test_outsider_cannot_access_conversation_messages(): void
    {
        $order        = $this->makeConfirmedMembershipOrder();
        $conversation = $this->makeConversation($order);

        $outsider = User::factory()->fan()->create();
        $token    = $outsider->createToken('test')->plainTextToken;

        $this->getJson(
            "/api/v1/chat/conversations/{$conversation->id}/messages",
            ['Authorization' => "Bearer {$token}"]
        )
            ->assertStatus(403);
    }
}
