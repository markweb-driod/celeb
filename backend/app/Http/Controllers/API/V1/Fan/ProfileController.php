<?php

namespace App\Http\Controllers\API\V1\Fan;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

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
            'avatar_url' => 'nullable|url',
        ]);

        $profile = $request->user()->fanProfile;

        $profile->update($request->only([
            'display_name',
            'avatar_url'
        ]));

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile
        ]);
    }
}
