<?php

namespace Tests\Feature;

use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCmsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create(['email' => 'admin@test.com']);
        $this->token = $this->admin->createToken('test')->plainTextToken;
    }

    private function authHeader(): array
    {
        return ['Authorization' => "Bearer {$this->token}"];
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Access Control
    // ──────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_cannot_access_cms(): void
    {
        $this->getJson('/api/v1/admin/cms/content')->assertStatus(401);
    }

    public function test_non_admin_cannot_access_cms(): void
    {
        $fan   = User::factory()->fan()->create();
        $token = $fan->createToken('test')->plainTextToken;

        $this->getJson('/api/v1/admin/cms/content', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Show
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_show_cms_content(): void
    {
        $response = $this->getJson('/api/v1/admin/cms/content', $this->authHeader());

        $response->assertOk()
            ->assertJsonStructure([
                'content' => [
                    'home_hero_title',
                    'home_hero_subtitle',
                    'home_featured_title',
                    'site_support_email',
                    'site_terms_url',
                    'site_privacy_url',
                    'footer_tagline',
                ],
            ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Update
    // ──────────────────────────────────────────────────────────────────────────

    public function test_admin_can_update_cms_content(): void
    {
        $this->putJson('/api/v1/admin/cms/content', [
            'home_hero_title'    => 'Welcome to Celebrity Hub',
            'home_hero_subtitle' => 'Connect with your favorite stars.',
            'footer_tagline'     => 'Your stars, your way.',
        ], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('message', 'CMS content updated successfully.');

        $this->assertEquals('Welcome to Celebrity Hub', SystemSetting::getValue('cms.home_hero_title'));
        $this->assertEquals('Your stars, your way.', SystemSetting::getValue('cms.footer_tagline'));
    }

    public function test_admin_can_update_support_email(): void
    {
        $this->putJson('/api/v1/admin/cms/content', [
            'site_support_email' => 'support@celebrity.com',
        ], $this->authHeader())
            ->assertOk();

        $this->assertEquals('support@celebrity.com', SystemSetting::getValue('cms.site_support_email'));
    }

    public function test_cms_update_rejects_invalid_email(): void
    {
        $this->putJson('/api/v1/admin/cms/content', [
            'site_support_email' => 'not-an-email',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['site_support_email']);
    }

    public function test_cms_hero_title_max_length(): void
    {
        $this->putJson('/api/v1/admin/cms/content', [
            'home_hero_title' => str_repeat('x', 161),
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['home_hero_title']);
    }

    public function test_cms_update_with_empty_body_succeeds(): void
    {
        $this->putJson('/api/v1/admin/cms/content', [], $this->authHeader())
            ->assertOk();
    }
}
