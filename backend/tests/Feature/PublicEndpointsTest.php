<?php

namespace Tests\Feature;

use App\Models\CelebrityProfile;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicEndpointsTest extends TestCase
{
    use RefreshDatabase;

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private function makeCelebrity(array $overrides = []): CelebrityProfile
    {
        $user = User::factory()->celebrity()->create();

        return CelebrityProfile::create(array_merge([
            'user_id'             => $user->id,
            'stage_name'          => 'Public Star',
            'slug'                => 'public-star-' . $user->id,
            'bio'                 => 'Bio here.',
            'category'            => 'Music',
            'profile_image_url'   => 'https://example.com/photo.jpg',
            'commission_rate'     => 20,
            'verification_status' => 'verified',
        ], $overrides));
    }

    private function makeActiveService(CelebrityProfile $celeb, array $overrides = []): Service
    {
        return Service::create(array_merge([
            'celebrity_id'     => $celeb->id,
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
    // GET /api/v1/services
    // ──────────────────────────────────────────────────────────────────────────

    public function test_can_list_active_services(): void
    {
        $celeb = $this->makeCelebrity();
        $this->makeActiveService($celeb, ['title' => 'Active Svc']);
        $this->makeActiveService($celeb, ['title' => 'Paused Svc', 'status' => 'paused', 'slug' => 'paused-svc-1']);

        $response = $this->getJson('/api/v1/services');

        $response->assertOk()
            ->assertJsonStructure(['services' => ['data']]);

        $titles = collect($response->json('services.data'))->pluck('title');
        $this->assertTrue($titles->contains('Active Svc'));
        $this->assertFalse($titles->contains('Paused Svc'));
    }

    public function test_services_can_be_filtered_by_service_type(): void
    {
        $celeb = $this->makeCelebrity();
        $this->makeActiveService($celeb, ['service_type' => 'shoutout', 'title' => 'Shoutout Svc']);
        $this->makeActiveService($celeb, ['service_type' => 'video_message', 'title' => 'Video Svc', 'slug' => 'video-svc-1']);

        $response = $this->getJson('/api/v1/services?service_type=shoutout');

        $response->assertOk();
        $types = collect($response->json('services.data'))->pluck('service_type');
        $this->assertTrue($types->every(fn ($t) => $t === 'shoutout'));
    }

    public function test_services_can_be_searched_by_q(): void
    {
        $celeb = $this->makeCelebrity();
        $this->makeActiveService($celeb, ['title' => 'Birthday Special']);
        $this->makeActiveService($celeb, ['title' => 'Anniversary Package', 'slug' => 'anniversary-1']);

        $response = $this->getJson('/api/v1/services?q=Birthday');

        $response->assertOk();
        $titles = collect($response->json('services.data'))->pluck('title');
        $this->assertTrue($titles->contains('Birthday Special'));
        $this->assertFalse($titles->contains('Anniversary Package'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/v1/services/{id}
    // ──────────────────────────────────────────────────────────────────────────

    public function test_can_show_active_service(): void
    {
        $celeb   = $this->makeCelebrity();
        $service = $this->makeActiveService($celeb, ['title' => 'Single Svc']);

        $this->getJson("/api/v1/services/{$service->id}")
            ->assertOk()
            ->assertJsonPath('service.title', 'Single Svc');
    }

    public function test_non_active_service_returns_404(): void
    {
        $celeb   = $this->makeCelebrity();
        $service = $this->makeActiveService($celeb, ['status' => 'paused', 'slug' => 'paused-single']);

        $this->getJson("/api/v1/services/{$service->id}")
            ->assertStatus(404);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/v1/categories
    // ──────────────────────────────────────────────────────────────────────────

    public function test_can_list_active_categories(): void
    {
        ServiceCategory::create([
            'name'      => 'Music',
            'slug'      => 'music',
            'is_active' => true,
        ]);
        ServiceCategory::create([
            'name'      => 'Inactive Cat',
            'slug'      => 'inactive-cat',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/v1/categories');

        $response->assertOk()
            ->assertJsonStructure(['categories']);

        $names = collect($response->json('categories'))->pluck('name');
        $this->assertTrue($names->contains('Music'));
        $this->assertFalse($names->contains('Inactive Cat'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/v1/celebrities
    // ──────────────────────────────────────────────────────────────────────────

    public function test_can_list_verified_celebrities(): void
    {
        $verified = $this->makeCelebrity(['verification_status' => 'verified', 'stage_name' => 'Verified Star']);
        $this->makeActiveService($verified);

        $pending = $this->makeCelebrity(['verification_status' => 'pending', 'stage_name' => 'Pending Star']);
        $this->makeActiveService($pending, ['slug' => 'pending-svc-2']);

        $response = $this->getJson('/api/v1/celebrities');

        $response->assertOk()
            ->assertJsonStructure(['celebrities' => ['data']]);

        $names = collect($response->json('celebrities.data'))->pluck('stage_name');
        $this->assertTrue($names->contains('Verified Star'));
        $this->assertFalse($names->contains('Pending Star'));
    }

    public function test_celebrities_can_be_searched(): void
    {
        $singer = $this->makeCelebrity(['stage_name' => 'Pop Singer', 'slug' => 'pop-singer-x']);
        $this->makeActiveService($singer, ['slug' => 'singer-svc-1']);

        $actor = $this->makeCelebrity(['stage_name' => 'Film Actor', 'slug' => 'film-actor-x']);
        $this->makeActiveService($actor, ['slug' => 'actor-svc-1']);

        $response = $this->getJson('/api/v1/celebrities?search=Pop');

        $response->assertOk();
        $names = collect($response->json('celebrities.data'))->pluck('stage_name');
        $this->assertTrue($names->contains('Pop Singer'));
        $this->assertFalse($names->contains('Film Actor'));
    }

    public function test_celebrities_can_be_filtered_by_category(): void
    {
        $musician = $this->makeCelebrity(['stage_name' => 'Musician', 'category' => 'Music', 'slug' => 'musician-x']);
        $this->makeActiveService($musician, ['slug' => 'musician-svc-1']);

        $comedian = $this->makeCelebrity(['stage_name' => 'Comedian', 'category' => 'Comedy', 'slug' => 'comedian-x']);
        $this->makeActiveService($comedian, ['slug' => 'comedian-svc-1']);

        $response = $this->getJson('/api/v1/celebrities?category=Music');

        $response->assertOk();
        $names = collect($response->json('celebrities.data'))->pluck('stage_name');
        $this->assertTrue($names->contains('Musician'));
        $this->assertFalse($names->contains('Comedian'));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/v1/celebrities/{id}
    // ──────────────────────────────────────────────────────────────────────────

    public function test_can_show_celebrity(): void
    {
        $celeb = $this->makeCelebrity(['stage_name' => 'Detail Star']);
        $this->makeActiveService($celeb);

        $this->getJson("/api/v1/celebrities/{$celeb->id}")
            ->assertOk()
            ->assertJsonPath('celebrity.stage_name', 'Detail Star');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/v1/payment-methods
    // ──────────────────────────────────────────────────────────────────────────

    public function test_can_list_enabled_payment_methods(): void
    {
        SystemSetting::setValue('payments.methods', [
            'paypal' => ['label' => 'PayPal', 'type' => 'manual', 'enabled' => true, 'email' => 'pay@example.com'],
            'zelle'  => ['label' => 'Zelle',  'type' => 'manual', 'enabled' => false],
        ]);

        $response = $this->getJson('/api/v1/payment-methods');

        $response->assertOk()
            ->assertJsonStructure(['methods']);

        $keys = collect($response->json('methods'))->pluck('key');
        $this->assertTrue($keys->contains('paypal'));
        $this->assertFalse($keys->contains('zelle'));
    }

    public function test_payment_methods_returns_empty_when_none_enabled(): void
    {
        $response = $this->getJson('/api/v1/payment-methods');

        $response->assertOk();
        $this->assertCount(0, $response->json('methods'));
    }
}
