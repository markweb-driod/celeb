<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminCelebrityManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->admin = User::factory()->admin()->create([
            'email'         => 'admin@test.com',
            'password_hash' => bcrypt('Admin@1234'),
        ]);

        $this->token = $this->admin->createToken('test')->plainTextToken;
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    private function makeCelebrity(array $overrides = []): CelebrityProfile
    {
        $user = User::factory()->celebrity()->create();

        return CelebrityProfile::create(array_merge([
            'user_id'             => $user->id,
            'stage_name'          => 'Test Star',
            'slug'                => 'test-star-' . $user->id,
            'bio'                 => 'A great performer.',
            'category'            => 'Music',
            'profile_image_url'   => 'https://example.com/photo.jpg',
            'commission_rate'     => 20,
            'verification_status' => 'pending',
            'is_featured'         => false,
            'sort_order'          => 0,
        ], $overrides));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Authentication / Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_admin_celebrities(): void
    {
        $this->getJson('/api/v1/admin/celebrities')
            ->assertStatus(401);
    }

    public function test_non_admin_cannot_access_admin_celebrities(): void
    {
        $fan = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/celebrities', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_list_celebrities(): void
    {
        $this->makeCelebrity(['stage_name' => 'Singer One']);
        $this->makeCelebrity(['stage_name' => 'Actor Two']);

        $response = $this->getJson('/api/v1/admin/celebrities', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['celebrities' => ['data', 'total', 'per_page', 'current_page']]);

        $this->assertCount(2, $response->json('celebrities.data'));
    }

    public function test_admin_can_search_celebrities_by_stage_name(): void
    {
        $this->makeCelebrity(['stage_name' => 'Famous Singer']);
        $this->makeCelebrity(['stage_name' => 'Unknown Actor']);

        $response = $this->getJson('/api/v1/admin/celebrities?q=Famous', $this->authHeader());

        $response->assertOk();
        $this->assertCount(1, $response->json('celebrities.data'));
        $this->assertEquals('Famous Singer', $response->json('celebrities.data.0.stage_name'));
    }

    public function test_admin_can_filter_celebrities_by_verification_status(): void
    {
        $this->makeCelebrity(['verification_status' => 'verified']);
        $this->makeCelebrity(['verification_status' => 'pending']);

        $response = $this->getJson('/api/v1/admin/celebrities?verification_status=verified', $this->authHeader());

        $response->assertOk();
        $this->assertCount(1, $response->json('celebrities.data'));
        $this->assertEquals('verified', $response->json('celebrities.data.0.verification_status'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Store (Create Celebrity) — the main failing feature
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_create_celebrity(): void
    {
        $image = UploadedFile::fake()->image('profile.jpg', 100, 100);

        $response = $this->postJson('/api/v1/admin/celebrities', [
            'email'               => 'newstar@example.com',
            'password'            => 'Password@1',
            'stage_name'          => 'New Star',
            'bio'                 => 'Rising talent.',
            'category'            => 'Music',
            'commission_rate'     => 15,
            'verification_status' => 'pending',
            'is_featured'         => false,
            'profile_photo'       => $image,
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['celebrity' => ['id', 'stage_name', 'slug', 'user_id']]);

        $this->assertEquals('New Star', $response->json('celebrity.stage_name'));
        $this->assertDatabaseHas('users', ['email' => 'newstar@example.com', 'user_type' => 'celebrity']);
        $this->assertDatabaseHas('celebrity_profiles', ['stage_name' => 'New Star']);

        Storage::disk('public')->assertExists(
            \Illuminate\Support\Str::after(
                parse_url($response->json('celebrity.profile_image_url'), PHP_URL_PATH),
                '/storage/'
            )
        );
    }

    public function test_create_celebrity_requires_email(): void
    {
        $image = UploadedFile::fake()->image('profile.jpg');

        $this->postJson('/api/v1/admin/celebrities', [
            'password'      => 'Password@1',
            'stage_name'    => 'No Email Star',
            'profile_photo' => $image,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_create_celebrity_requires_unique_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);
        $image = UploadedFile::fake()->image('profile.jpg');

        $this->postJson('/api/v1/admin/celebrities', [
            'email'         => 'taken@example.com',
            'password'      => 'Password@1',
            'stage_name'    => 'Dupe',
            'profile_photo' => $image,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_create_celebrity_requires_profile_photo(): void
    {
        $this->postJson('/api/v1/admin/celebrities', [
            'email'      => 'nophoto@example.com',
            'password'   => 'Password@1',
            'stage_name' => 'No Photo',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['profile_photo']);
    }

    public function test_create_celebrity_requires_stage_name(): void
    {
        $image = UploadedFile::fake()->image('profile.jpg');

        $this->postJson('/api/v1/admin/celebrities', [
            'email'         => 'noname@example.com',
            'password'      => 'Password@1',
            'profile_photo' => $image,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['stage_name']);
    }

    public function test_create_celebrity_rejects_invalid_image_mime(): void
    {
        $badFile = UploadedFile::fake()->create('profile.pdf', 100, 'application/pdf');

        $this->postJson('/api/v1/admin/celebrities', [
            'email'         => 'mime@example.com',
            'password'      => 'Password@1',
            'stage_name'    => 'Mime Test',
            'profile_photo' => $badFile,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['profile_photo']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_show_celebrity(): void
    {
        $celeb = $this->makeCelebrity(['stage_name' => 'Show Me']);

        $response = $this->getJson("/api/v1/admin/celebrities/{$celeb->id}", $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['celebrity' => ['id', 'stage_name', 'user'], 'recent_orders']);

        $this->assertEquals('Show Me', $response->json('celebrity.stage_name'));
    }

    public function test_show_returns_404_for_missing_celebrity(): void
    {
        $this->getJson('/api/v1/admin/celebrities/99999', $this->authHeader())
            ->assertStatus(404);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_update_celebrity_stage_name(): void
    {
        $celeb = $this->makeCelebrity(['stage_name' => 'Old Name']);

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}", [
            'stage_name' => 'New Name',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('celebrity.stage_name', 'New Name');

        $this->assertDatabaseHas('celebrity_profiles', ['id' => $celeb->id, 'stage_name' => 'New Name']);
    }

    public function test_admin_can_update_commission_rate(): void
    {
        $celeb = $this->makeCelebrity(['commission_rate' => 20]);

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}", [
            'commission_rate' => 35,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('celebrity_profiles', ['id' => $celeb->id, 'commission_rate' => 35]);
    }

    public function test_admin_can_toggle_featured(): void
    {
        $celeb = $this->makeCelebrity(['is_featured' => false]);

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}", [
            'is_featured' => true,
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('celebrity_profiles', ['id' => $celeb->id, 'is_featured' => 1]);
    }

    public function test_admin_can_set_verification_status(): void
    {
        $celeb = $this->makeCelebrity(['verification_status' => 'pending']);

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}", [
            'verification_status' => 'verified',
        ], $this->authHeader())
            ->assertOk();

        $this->assertDatabaseHas('celebrity_profiles', ['id' => $celeb->id, 'verification_status' => 'verified']);
    }

    public function test_update_rejects_invalid_commission_rate(): void
    {
        $celeb = $this->makeCelebrity();

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}", [
            'commission_rate' => 150, // > 100
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['commission_rate']);
    }

    public function test_admin_can_upload_profile_photo_on_update(): void
    {
        $celeb = $this->makeCelebrity();
        $image = UploadedFile::fake()->image('new_photo.jpg', 200, 200);

        $response = $this->call(
            'PATCH',
            "/api/v1/admin/celebrities/{$celeb->id}",
            [],
            [],
            ['profile_photo' => $image],
            ['HTTP_Authorization' => "Bearer {$this->token}", 'CONTENT_TYPE' => 'multipart/form-data']
        );

        $response->assertOk();
        $this->assertNotNull($response->json('celebrity.profile_image_url'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update User Status
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_suspend_celebrity_user(): void
    {
        $celeb = $this->makeCelebrity();

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}/user-status", [
            'status' => 'suspended',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'User status updated.');

        $this->assertDatabaseHas('users', ['id' => $celeb->user_id, 'status' => 'suspended']);
    }

    public function test_update_user_status_rejects_invalid_status(): void
    {
        $celeb = $this->makeCelebrity();

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}/user-status", [
            'status' => 'deleted',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Delete
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_delete_celebrity(): void
    {
        $celeb = $this->makeCelebrity();
        $userId = $celeb->user_id;

        $this->deleteJson("/api/v1/admin/celebrities/{$celeb->id}", [], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'Celebrity deleted.');

        $this->assertDatabaseMissing('celebrity_profiles', ['id' => $celeb->id]);
        $this->assertDatabaseMissing('users', ['id' => $userId]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Reorder
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_reorder_celebrities(): void
    {
        $c1 = $this->makeCelebrity(['sort_order' => 0]);
        $c2 = $this->makeCelebrity(['sort_order' => 1]);

        $this->postJson('/api/v1/admin/celebrities/reorder', [
            'order' => [
                ['id' => $c1->id, 'sort_order' => 5],
                ['id' => $c2->id, 'sort_order' => 2],
            ],
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'Display order saved.');

        $this->assertDatabaseHas('celebrity_profiles', ['id' => $c1->id, 'sort_order' => 5]);
        $this->assertDatabaseHas('celebrity_profiles', ['id' => $c2->id, 'sort_order' => 2]);
    }

    public function test_reorder_requires_valid_celebrity_ids(): void
    {
        $this->postJson('/api/v1/admin/celebrities/reorder', [
            'order' => [
                ['id' => 99999, 'sort_order' => 0],
            ],
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['order.0.id']);
    }

    public function test_reorder_requires_order_array(): void
    {
        $this->postJson('/api/v1/admin/celebrities/reorder', [
            'order' => [],
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['order']);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Celebrity Services (Admin)
    // ──────────────────────────────────────────────────────────────────────────

    private function makeService(CelebrityProfile $celeb, array $overrides = []): Service
    {
        return Service::create(array_merge([
            'celebrity_id'  => $celeb->id,
            'service_type'  => 'shoutout',
            'title'         => 'Test Shoutout',
            'slug'          => 'test-shoutout-' . rand(1000, 9999),
            'description'   => 'A custom shoutout video.',
            'base_price'    => 50.00,
            'currency'      => 'USD',
            'status'        => 'active',
        ], $overrides));
    }

    public function test_admin_can_list_celebrity_services(): void
    {
        $celeb = $this->makeCelebrity();
        $this->makeService($celeb, ['title' => 'Service A']);
        $this->makeService($celeb, ['title' => 'Service B', 'slug' => 'service-b-1']);

        $response = $this->getJson("/api/v1/admin/celebrities/{$celeb->id}/services", $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure(['services']);
        $this->assertCount(2, $response->json('services'));
    }

    public function test_admin_can_create_service_for_celebrity(): void
    {
        $celeb = $this->makeCelebrity();

        $response = $this->postJson("/api/v1/admin/celebrities/{$celeb->id}/services", [
            'title'        => 'Premium Shoutout',
            'service_type' => 'shoutout',
            'base_price'   => 99.99,
            'description'  => 'I will make a personal shoutout.',
            'currency'     => 'USD',
            'status'       => 'active',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['service' => ['id', 'title', 'base_price']]);

        $this->assertEquals('Premium Shoutout', $response->json('service.title'));
        $this->assertDatabaseHas('services', ['celebrity_id' => $celeb->id, 'title' => 'Premium Shoutout']);
    }

    public function test_admin_create_service_requires_title(): void
    {
        $celeb = $this->makeCelebrity();

        $this->postJson("/api/v1/admin/celebrities/{$celeb->id}/services", [
            'service_type' => 'shoutout',
            'base_price'   => 50,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_admin_create_service_rejects_invalid_service_type(): void
    {
        $celeb = $this->makeCelebrity();

        $this->postJson("/api/v1/admin/celebrities/{$celeb->id}/services", [
            'title'        => 'Bad Type',
            'service_type' => 'invalid_type',
            'base_price'   => 50,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['service_type']);
    }

    public function test_admin_can_update_celebrity_service(): void
    {
        $celeb = $this->makeCelebrity();
        $service = $this->makeService($celeb);

        $this->patchJson("/api/v1/admin/celebrities/{$celeb->id}/services/{$service->id}", [
            'title'      => 'Updated Title',
            'base_price' => 149.99,
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('service.title', 'Updated Title');

        $this->assertDatabaseHas('services', ['id' => $service->id, 'title' => 'Updated Title']);
    }

    public function test_admin_cannot_update_service_belonging_to_different_celebrity(): void
    {
        $celeb1 = $this->makeCelebrity();
        $celeb2 = $this->makeCelebrity();
        $service = $this->makeService($celeb1);

        $this->patchJson("/api/v1/admin/celebrities/{$celeb2->id}/services/{$service->id}", [
            'title' => 'Hijack',
        ], $this->authHeader())
            ->assertStatus(404);
    }

    public function test_admin_can_delete_celebrity_service(): void
    {
        $celeb = $this->makeCelebrity();
        $service = $this->makeService($celeb);

        $this->deleteJson("/api/v1/admin/celebrities/{$celeb->id}/services/{$service->id}", [], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'Service deleted.');

        $this->assertDatabaseMissing('services', ['id' => $service->id]);
    }

    public function test_admin_cannot_delete_service_belonging_to_different_celebrity(): void
    {
        $celeb1 = $this->makeCelebrity();
        $celeb2 = $this->makeCelebrity();
        $service = $this->makeService($celeb1);

        $this->deleteJson("/api/v1/admin/celebrities/{$celeb2->id}/services/{$service->id}", [], $this->authHeader())
            ->assertStatus(404);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Index ordering by sort_order
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrities_are_listed_in_sort_order(): void
    {
        $c1 = $this->makeCelebrity(['stage_name' => 'Third',  'sort_order' => 30]);
        $c2 = $this->makeCelebrity(['stage_name' => 'First',  'sort_order' => 10]);
        $c3 = $this->makeCelebrity(['stage_name' => 'Second', 'sort_order' => 20]);

        $response = $this->getJson('/api/v1/admin/celebrities?per_page=50', $this->authHeader());

        $names = array_column($response->json('celebrities.data'), 'stage_name');
        $this->assertEquals(['First', 'Second', 'Third'], $names);
    }
}
