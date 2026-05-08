<?php

namespace App\Http\Controllers\API\V1\Celebrity;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->celebrityProfile;
        
        return response()->json([
             'profile' => $profile
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'bio'          => 'nullable|string',
            'profile_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'cover_photo'   => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'social_links' => 'nullable|string', // JSON-encoded array
        ]);

        $profile = $request->user()->celebrityProfile;

        $payload = [];

        if ($request->has('bio')) {
            $payload['bio'] = $request->input('bio') ?: null;
        }

        if ($request->hasFile('profile_photo')) {
            $path = $request->file('profile_photo')->store('celebrity-profiles', 'public');
            $payload['profile_image_url'] = Storage::disk('public')->url($path);
        }

        if ($request->hasFile('cover_photo')) {
            $path = $request->file('cover_photo')->store('celebrity-covers', 'public');
            $payload['cover_image_url'] = Storage::disk('public')->url($path);
        }

        if ($request->has('social_links')) {
            $decoded = json_decode($request->input('social_links'), true);
            $payload['social_links'] = is_array($decoded) ? $decoded : [];
        }

        if (!empty($payload)) {
            $profile->update($payload);
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile->fresh(),
        ]);
    }
}
