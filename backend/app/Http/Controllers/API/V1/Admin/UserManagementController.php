<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'user_type' => ['nullable', Rule::in(['admin', 'celebrity', 'fan'])],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'banned'])],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $users = User::query()
            ->with([
                'celebrityProfile:id,user_id,stage_name,category,verification_status,commission_rate',
                'fanProfile:id,user_id,display_name,total_spent,total_bookings',
            ])
            ->when($validated['q'] ?? null, fn ($query, $q) => $query->where('email', 'like', '%' . $q . '%'))
            ->when($validated['user_type'] ?? null, fn ($query, $userType) => $query->where('user_type', $userType))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json(['users' => $users]);
    }

    public function updateStatus(Request $request, User $user)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended', 'banned'])],
        ]);

        $user->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'User status updated successfully.',
            'user' => $user,
        ]);
    }

    public function updateCommission(Request $request, User $user)
    {
        $data = $request->validate([
            'commission_rate' => ['required', 'numeric', 'between:0,100'],
        ]);

        if ($user->user_type !== 'celebrity' || ! $user->celebrityProfile) {
            return response()->json([
                'message' => 'Commission can only be updated for celebrity users with profiles.',
            ], 422);
        }

        $user->celebrityProfile->update([
            'commission_rate' => $data['commission_rate'],
        ]);

        return response()->json([
            'message' => 'Commission updated successfully.',
            'profile' => $user->celebrityProfile,
        ]);
    }
}
