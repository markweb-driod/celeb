<?php

namespace App\Http\Controllers\API\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\CelebrityProfile;
use App\Models\FanProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request)
    {
        try {
            DB::beginTransaction();

            $user = User::create([
                'email' => $request->email,
                'password_hash' => Hash::make($request->password),
                'user_type' => $request->user_type,
                'status' => 'active',
            ]);

            if ($request->user_type === 'celebrity') {
                CelebrityProfile::create([
                    'user_id' => $user->id,
                    'stage_name' => $request->stage_name,
                    'slug' => Str::slug($request->stage_name) . '-' . Str::random(4),
                    'category' => $request->category,
                    'verification_status' => 'pending',
                ]);
            } else {
                FanProfile::create([
                    'user_id' => $user->id,
                    'display_name' => $request->display_name ?? explode('@', $user->email)[0],
                ]);
            }

            DB::commit();

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'User registered successfully',
                'user' => $user->load($request->user_type === 'celebrity' ? 'celebrityProfile' : 'fanProfile'),
                'access_token' => $token,
                'token_type' => 'Bearer',
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
