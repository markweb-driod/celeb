<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class CmsController extends Controller
{
    private const KEYS = [
        'home_hero_title',
        'home_hero_subtitle',
        'home_featured_title',
        'site_support_email',
        'site_terms_url',
        'site_privacy_url',
        'footer_tagline',
    ];

    public function show()
    {
        $content = [];

        foreach (self::KEYS as $key) {
            $content[$key] = SystemSetting::getValue('cms.' . $key, '');
        }

        return response()->json(['content' => $content]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'home_hero_title' => ['nullable', 'string', 'max:160'],
            'home_hero_subtitle' => ['nullable', 'string', 'max:500'],
            'home_featured_title' => ['nullable', 'string', 'max:160'],
            'site_support_email' => ['nullable', 'email:rfc,dns', 'max:255'],
            'site_terms_url' => ['nullable', 'url', 'max:255'],
            'site_privacy_url' => ['nullable', 'url', 'max:255'],
            'footer_tagline' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::setValue('cms.' . $key, $value);
        }

        return response()->json([
            'message' => 'CMS content updated successfully.',
        ]);
    }
}
