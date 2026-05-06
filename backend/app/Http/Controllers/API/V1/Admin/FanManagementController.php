<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\FanProfile;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FanManagementController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q'        => ['nullable', 'string', 'max:120'],
            'status'   => ['nullable', Rule::in(['active', 'suspended', 'banned'])],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $fans = FanProfile::query()
            ->with(['user:id,email,status,created_at'])
            ->when(
                $validated['q'] ?? null,
                fn ($q, $search) => $q->where('display_name', 'like', '%' . $search . '%')
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', '%' . $search . '%'))
            )
            ->when(
                $validated['status'] ?? null,
                fn ($q, $s) => $q->whereHas('user', fn ($u) => $u->where('status', $s))
            )
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json(['fans' => $fans]);
    }

    public function show(FanProfile $fan)
    {
        $fan->load(['user:id,email,status,created_at']);

        $recentOrders = $fan->orders()
            ->with(['celebrity:id,stage_name', 'service:id,title'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'fan'           => $fan,
            'recent_orders' => $recentOrders,
        ]);
    }

    public function updateUserStatus(Request $request, FanProfile $fan)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended', 'banned'])],
        ]);

        $fan->user()->update(['status' => $data['status']]);

        return response()->json(['message' => 'User status updated.']);
    }
}
