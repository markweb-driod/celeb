<?php

namespace Tests\Feature;

use App\Models\FanProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FanProfileTest extends TestCase
{
    use RefreshDatabase;

    private User $fanUser;
    private FanProfile $fan;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->fanUser = User::factory()->fan()->create([
            'email'         => 'fan@test.com',
            'password_hash' => bcrypt('Password@1'),
        ]);

        $this->fan = FanProfile::create([
            'user_id'      => $this->fanUser->id,
            'display_name' => 'Original Name',
        ]);

        $this->token = $this->fanUser->createToken('test')->plainTextToken;
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_show_own_profile(): void
    {
        $this->getJson('/api/v1/fan/profile', $this->authHeader())
            ->assertOk()
            ->assertJsonStructure(['profile'])
            ->assertJsonPath('profile.display_name', 'Original Name');
    }

    public function test_unauthenticated_cannot_show_fan_profile(): void
    {
        $this->getJson('/api/v1/fan/profile')
            ->assertStatus(401);
    }

    public function test_celebrity_cannot_access_fan_profile_endpoint(): void
    {
        $celeb      = User::factory()->celebrity()->create();
        $celebToken = $celeb->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/fan/profile', ['Authorization' => "Bearer {$celebToken}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update
    // ──────────────────────────────────────────────────────────────────────────

    public function test_fan_can_update_display_name(): void
    {
        $this->putJson('/api/v1/fan/profile', [
            'display_name' => 'New Display Name',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('profile.display_name', 'New Display Name');

        $this->assertDatabaseHas('fan_profiles', [
            'id'           => $this->fan->id,
            'display_name' => 'New Display Name',
        ]);
    }

    public function test_fan_can_upload_avatar(): void
    {
        $avatar = UploadedFile::fake()->image('avatar.jpg', 100, 100);

        $response = $this->call(
            'PUT',
            '/api/v1/fan/profile',
            [],
            [],
            ['avatar_photo' => $avatar],
            ['HTTP_Authorization' => "Bearer {$this->token}"]
        );

        $response->assertOk();
        $this->assertNotNull($response->json('profile.avatar_url'));
    }

    public function test_fan_update_with_no_fields_still_succeeds(): void
    {
        $this->putJson('/api/v1/fan/profile', [], $this->authHeader())
            ->assertOk();
    }

    public function test_fan_update_rejects_non_image_avatar(): void
    {
        $file = UploadedFile::fake()->create('bad.exe', 100, 'application/octet-stream');

        $response = $this->call(
            'PUT',
            '/api/v1/fan/profile',
            [],
            [],
            ['avatar_photo' => $file],
            [
                'HTTP_Authorization' => "Bearer {$this->token}",
                'HTTP_ACCEPT'        => 'application/json',
            ]
        );

        $response->assertStatus(422);
    }

    public function test_fan_display_name_max_length_validation(): void
    {
        $this->putJson('/api/v1/fan/profile', [
            'display_name' => str_repeat('x', 256),
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['display_name']);
    }
}
