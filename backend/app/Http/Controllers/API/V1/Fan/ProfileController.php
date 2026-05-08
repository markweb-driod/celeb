<?php

namespace App\Http\Controllers\API\V1\Fan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->fanProfile;
        
        return response()->json([
             'profile' => $profile
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'display_name' => 'nullable|string|max:255',
            'avatar_photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $profile = $request->user()->fanProfile;

        $payload = [];

        if ($request->has('display_name')) {
            $payload['display_name'] = $request->input('display_name') ?: null;
        }

        if ($request->hasFile('avatar_photo')) {
            $path = $request->file('avatar_photo')->store('fan-avatars', 'public');
            $payload['avatar_url'] = Storage::disk('public')->url($path);
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
