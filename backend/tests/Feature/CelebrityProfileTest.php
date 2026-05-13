<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CelebrityProfileTest extends TestCase
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
            'bio'                 => 'Initial bio.',
            'category'            => 'Music',
            'profile_image_url'   => 'https://example.com/photo.jpg',
            'commission_rate'     => 20,
            'verification_status' => 'verified',
        ]);

        $this->token = $this->celebUser->createToken('test')->plainTextToken;
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_show_own_profile(): void
    {
        $this->getJson('/api/v1/celebrity/profile', $this->authHeader())
            ->assertOk()
            ->assertJsonStructure(['profile'])
            ->assertJsonPath('profile.stage_name', 'Test Star');
    }

    public function test_unauthenticated_cannot_show_celebrity_profile(): void
    {
        $this->getJson('/api/v1/celebrity/profile')
            ->assertStatus(401);
    }

    public function test_fan_cannot_access_celebrity_profile_endpoint(): void
    {
        $fan      = User::factory()->fan()->create();
        $fanToken = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/celebrity/profile', ['Authorization' => "Bearer {$fanToken}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update
    // ──────────────────────────────────────────────────────────────────────────

    public function test_celebrity_can_update_bio(): void
    {
        $this->putJson('/api/v1/celebrity/profile', [
            'bio' => 'Updated bio text.',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('profile.bio', 'Updated bio text.');

        $this->assertDatabaseHas('celebrity_profiles', [
            'id'  => $this->celeb->id,
            'bio' => 'Updated bio text.',
        ]);
    }

    public function test_celebrity_can_upload_profile_photo(): void
    {
        $photo = UploadedFile::fake()->image('profile.jpg', 200, 200);

        $response = $this->call(
            'PUT',
            '/api/v1/celebrity/profile',
            [],
            [],
            ['profile_photo' => $photo],
            ['HTTP_Authorization' => "Bearer {$this->token}"]
        );

        $response->assertOk();
        $this->assertNotNull($response->json('profile.profile_image_url'));
    }

    public function test_celebrity_can_upload_cover_photo(): void
    {
        $cover = UploadedFile::fake()->image('cover.jpg', 400, 200);

        $response = $this->call(
            'PUT',
            '/api/v1/celebrity/profile',
            [],
            [],
            ['cover_photo' => $cover],
            ['HTTP_Authorization' => "Bearer {$this->token}"]
        );

        $response->assertOk();
        $this->assertNotNull($response->json('profile.cover_image_url'));
    }

    public function test_celebrity_can_update_social_links(): void
    {
        $links = json_encode(['instagram' => 'https://instagram.com/star', 'twitter' => 'https://twitter.com/star']);

        $this->putJson('/api/v1/celebrity/profile', [
            'social_links' => $links,
        ], $this->authHeader())
            ->assertOk();

        $profile = $this->celeb->fresh();
        $this->assertIsArray($profile->social_links);
        $this->assertArrayHasKey('instagram', $profile->social_links);
    }

    public function test_celebrity_update_with_no_fields_still_succeeds(): void
    {
        $this->putJson('/api/v1/celebrity/profile', [], $this->authHeader())
            ->assertOk();
    }

    public function test_update_rejects_non_image_profile_photo(): void
    {
        $file = UploadedFile::fake()->create('script.php', 100, 'application/php');

        $response = $this->call(
            'PUT',
            '/api/v1/celebrity/profile',
            [],
            [],
            ['profile_photo' => $file],
            [
                'HTTP_Authorization' => "Bearer {$this->token}",
                'HTTP_ACCEPT'        => 'application/json',
            ]
        );

        $response->assertStatus(422);
    }
}
