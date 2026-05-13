<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CelebrityServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $celebUser;
    private CelebrityProfile $celeb;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->celebUser = User::factory()->celebrity()->create([
            'email'         => 'star@test.com',
            'password_hash' => bcrypt('Password@1'),
        ]);

        $this->celeb = CelebrityProfile::create([
            'user_id'             => $this->celebUser->id,
            'stage_name'          => 'Test Star',
            'slug'                => 'test-star-' . $this->celebUser->id,
            'bio'                 => 'Great performer.',
            'category'            => 'Music',
            'profile_image_url'   => 'https://example.com/photo.jpg',
            'commission_rate'     => 20,
            'verification_status' => 'verified',
            'is_featured'         => false,
            'sort_order'          => 0,
        ]);

        $this->token = $this->celebUser->createToken('test')->plainTextToken;
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    private function makeService(array $overrides = []): Service
    {
        return Service::create(array_merge([
            'celebrity_id'  => $this->celeb->id,
            'service_type'  => 'shoutout',
            'title'         => 'Birthday Shoutout',
            'slug'          => 'birthday-shoutout-' . rand(1000, 9999),
            'description'   => 'A personal video for your birthday.',
            'base_price'    => 49.99,
            'currency'      => 'USD',
            'status'        => 'active',
            'is_digital'    => true,
            'requires_booking' => false,
        ], $overrides));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_celebrity_services(): void
    {
        $this->getJson('/api/v1/celebrity/services')
            ->assertStatus(401);
    }

    public function test_fan_cannot_access_celebrity_services(): void
    {
        $fan = User::factory()->fan()->create();
        $fanToken = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/celebrity/services', ['Authorization' => "Bearer {$fanToken}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_list_own_services(): void
    {
        $this->makeService(['title' => 'Service A']);
        $this->makeService(['title' => 'Service B', 'slug' => 'service-b-x']);

        $response = $this->getJson('/api/v1/celebrity/services', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['services']);
        $this->assertCount(2, $response->json('services'));
    }

    public function test_celebrity_cannot_see_another_celebrities_services(): void
    {
        // Services for another celebrity
        $otherUser = User::factory()->celebrity()->create();
        $otherCeleb = CelebrityProfile::create([
            'user_id'    => $otherUser->id,
            'stage_name' => 'Other Star',
            'slug'       => 'other-star-' . $otherUser->id,
            'category'   => 'Music',
            'profile_image_url' => 'https://example.com/other.jpg',
            'commission_rate'   => 20,
        ]);
        Service::create([
            'celebrity_id' => $otherCeleb->id,
            'service_type' => 'shoutout',
            'title'        => 'Other Service',
            'slug'         => 'other-service-1',
            'description'  => 'Other description.',
            'base_price'   => 30,
            'currency'     => 'USD',
            'status'       => 'active',
        ]);

        // Our celebrity has no services
        $response = $this->getJson('/api/v1/celebrity/services', $this->authHeader());

        $response->assertOk();
        $this->assertCount(0, $response->json('services'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Store
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_create_service(): void
    {
        $response = $this->postJson('/api/v1/celebrity/services', [
            'category_id'      => null,
            'service_type'     => 'video_message',
            'title'            => 'Personal Video',
            'description'      => 'I will record a personalised video just for you.',
            'base_price'       => 75.00,
            'is_digital'       => true,
            'requires_booking' => false,
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['service' => ['id', 'title', 'base_price', 'celebrity_id']]);

        $this->assertEquals('Personal Video', $response->json('service.title'));
        $this->assertDatabaseHas('services', [
            'celebrity_id' => $this->celeb->id,
            'title'        => 'Personal Video',
        ]);
    }

    public function test_celebrity_create_service_with_image_upload(): void
    {
        $image = UploadedFile::fake()->image('cover.jpg', 200, 200);

        $response = $this->call(
            'POST',
            '/api/v1/celebrity/services',
            [
                'service_type' => 'shoutout',
                'title'        => 'Image Service',
                'description'  => 'Has a cover photo.',
                'base_price'   => 60,
                'is_digital'   => 1,
                'requires_booking' => 0,
            ],
            [],
            ['images_upload' => [$image]],
            ['HTTP_Authorization' => "Bearer {$this->token}"]
        );

        $response->assertStatus(201);
        $this->assertNotNull($response->json('service.images'));
    }

    public function test_create_service_requires_title(): void
    {
        $this->postJson('/api/v1/celebrity/services', [
            'service_type' => 'shoutout',
            'description'  => 'No title here.',
            'base_price'   => 50,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_create_service_requires_description(): void
    {
        $this->postJson('/api/v1/celebrity/services', [
            'service_type' => 'shoutout',
            'title'        => 'No Desc',
            'base_price'   => 50,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    public function test_create_service_requires_valid_service_type(): void
    {
        $this->postJson('/api/v1/celebrity/services', [
            'service_type' => 'invalid_type',
            'title'        => 'Bad Type',
            'description'  => 'Testing.',
            'base_price'   => 50,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['service_type']);
    }

    public function test_create_service_requires_positive_price(): void
    {
        $this->postJson('/api/v1/celebrity/services', [
            'service_type' => 'shoutout',
            'title'        => 'Free Service',
            'description'  => 'Testing negative price.',
            'base_price'   => -10,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['base_price']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_show_own_service(): void
    {
        $service = $this->makeService(['title' => 'My Service']);

        $response = $this->getJson("/api/v1/celebrity/services/{$service->id}", $this->authHeader());

        $response->assertOk()
            ->assertJsonPath('service.title', 'My Service');
    }

    public function test_celebrity_cannot_show_other_celebrities_service(): void
    {
        $otherUser = User::factory()->celebrity()->create();
        $otherCeleb = CelebrityProfile::create([
            'user_id'    => $otherUser->id,
            'stage_name' => 'Other',
            'slug'       => 'other-' . $otherUser->id,
            'category'   => 'Music',
            'profile_image_url' => 'https://example.com/o.jpg',
            'commission_rate'   => 20,
        ]);
        $otherService = Service::create([
            'celebrity_id' => $otherCeleb->id,
            'service_type' => 'shoutout',
            'title'        => 'Owned By Other',
            'slug'         => 'owned-by-other-1',
            'description'  => 'Not yours.',
            'base_price'   => 30,
            'currency'     => 'USD',
            'status'       => 'active',
        ]);

        $this->getJson("/api/v1/celebrity/services/{$otherService->id}", $this->authHeader())
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_update_service_title(): void
    {
        $service = $this->makeService(['title' => 'Old Title']);

        $this->patchJson("/api/v1/celebrity/services/{$service->id}", [
            'title' => 'New Title',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('service.title', 'New Title');

        $this->assertDatabaseHas('services', ['id' => $service->id, 'title' => 'New Title']);
    }

    public function test_celebrity_can_update_service_price(): void
    {
        $service = $this->makeService(['base_price' => 49.99]);

        $this->patchJson("/api/v1/celebrity/services/{$service->id}", [
            'base_price' => 99.99,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'base_price' => 99.99]);
    }

    public function test_celebrity_can_update_service_type(): void
    {
        $service = $this->makeService(['service_type' => 'shoutout']);

        $this->patchJson("/api/v1/celebrity/services/{$service->id}", [
            'service_type' => 'video_message',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'service_type' => 'video_message']);
    }

    public function test_celebrity_can_update_service_booleans(): void
    {
        $service = $this->makeService(['is_digital' => true, 'requires_booking' => false]);

        $this->patchJson("/api/v1/celebrity/services/{$service->id}", [
            'is_digital'       => false,
            'requires_booking' => true,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', [
            'id'               => $service->id,
            'is_digital'       => 0,
            'requires_booking' => 1,
        ]);
    }

    public function test_celebrity_cannot_update_other_celebrities_service(): void
    {
        $otherUser = User::factory()->celebrity()->create();
        $otherCeleb = CelebrityProfile::create([
            'user_id'    => $otherUser->id,
            'stage_name' => 'Other',
            'slug'       => 'other2-' . $otherUser->id,            'category'   => 'Music',            'profile_image_url' => 'https://example.com/o2.jpg',
            'commission_rate'   => 20,
        ]);
        $otherService = Service::create([
            'celebrity_id' => $otherCeleb->id,
            'service_type' => 'shoutout',
            'title'        => 'Not Mine',
            'slug'         => 'not-mine-1',
            'description'  => 'Belongs to other.',
            'base_price'   => 30,
            'currency'     => 'USD',
            'status'       => 'active',
        ]);

        $this->patchJson("/api/v1/celebrity/services/{$otherService->id}", [
            'title' => 'Hijack',
        ], $this->authHeader())
            ->assertStatus(403);
    }

    public function test_update_rejects_invalid_service_type(): void
    {
        $service = $this->makeService();

        $this->patchJson("/api/v1/celebrity/services/{$service->id}", [
            'service_type' => 'invalid_type',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['service_type']);
    }

    public function test_update_rejects_negative_price(): void
    {
        $service = $this->makeService();

        $this->patchJson("/api/v1/celebrity/services/{$service->id}", [
            'base_price' => -5,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['base_price']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Status toggle (via updateStatus on the list page)
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_pause_service(): void
    {
        $service = $this->makeService(['status' => 'active']);

        $this->putJson("/api/v1/celebrity/services/{$service->id}", [
            'status' => 'paused',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'status' => 'paused']);
    }

    public function test_celebrity_can_reactivate_service(): void
    {
        $service = $this->makeService(['status' => 'paused']);

        $this->putJson("/api/v1/celebrity/services/{$service->id}", [
            'status' => 'active',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'status' => 'active']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Destroy
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_delete_own_service(): void
    {
        $service = $this->makeService();

        $this->deleteJson("/api/v1/celebrity/services/{$service->id}", [], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseMissing('services', ['id' => $service->id]);
    }

    public function test_celebrity_cannot_delete_other_celebrities_service(): void
    {
        $otherUser = User::factory()->celebrity()->create();
        $otherCeleb = CelebrityProfile::create([
            'user_id'    => $otherUser->id,
            'stage_name' => 'Other3',
            'slug'       => 'other3-' . $otherUser->id,
            'category'   => 'Music',
            'profile_image_url' => 'https://example.com/o3.jpg',
            'commission_rate'   => 20,
        ]);
        $otherService = Service::create([
            'celebrity_id' => $otherCeleb->id,
            'service_type' => 'shoutout',
            'title'        => 'Not Deletable',
            'slug'         => 'not-deletable-1',
            'description'  => 'Belongs to other.',
            'base_price'   => 30,
            'currency'     => 'USD',
            'status'       => 'active',
        ]);

        $this->deleteJson("/api/v1/celebrity/services/{$otherService->id}", [], $this->authHeader())
            ->assertStatus(403);

        $this->assertDatabaseHas('services', ['id' => $otherService->id]);
    }
}
