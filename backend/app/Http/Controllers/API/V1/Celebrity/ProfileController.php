<?php

namespace App\Http\Controllers\API\V1\Celebrity;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'bio' => 'nullable|string',
            'profile_image_url' => 'nullable|url',
            'cover_image_url' => 'nullable|url',
            'social_links' => 'nullable|array',
            'commission_rate' => 'nullable|numeric|between(0,100)', // Admin usually sets this, but allowing update for demo
        ]);

        $profile = $request->user()->celebrityProfile;

        $profile->update($request->only([
            'bio', 
            'profile_image_url', 
            'cover_image_url', 
            'social_links'
        ]));

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile
        ]);
    }
}
