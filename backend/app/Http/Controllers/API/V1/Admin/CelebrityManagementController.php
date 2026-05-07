<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CelebrityProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CelebrityManagementController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q'                   => ['nullable', 'string', 'max:120'],
            'category'            => ['nullable', 'string', 'max:100'],
            'verification_status' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
            'is_featured'         => ['nullable', 'boolean'],
            'per_page'            => ['nullable', 'integer', 'between:5,100'],
        ]);

        $celebrities = CelebrityProfile::query()
            ->with(['user:id,email,status,created_at'])
            ->withCount([
                'orders as total_orders',
                'orders as completed_orders' => fn ($q) => $q->where('status', 'completed'),
            ])
            ->withSum(['orders as total_revenue' => fn ($q) => $q->where('status', 'completed')], 'total_amount')
            ->when(
                $validated['q'] ?? null,
                fn ($q, $search) => $q->where('stage_name', 'like', '%' . $search . '%')
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', '%' . $search . '%'))
            )
            ->when($validated['category'] ?? null, fn ($q, $cat) => $q->where('category', $cat))
            ->when($validated['verification_status'] ?? null, fn ($q, $vs) => $q->where('verification_status', $vs))
            ->when(isset($validated['is_featured']), fn ($q) => $q->where('is_featured', $validated['is_featured']))
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json(['celebrities' => $celebrities]);
    }

    public function show(CelebrityProfile $celebrity)
    {
        $celebrity->load(['user:id,email,status,created_at']);
        $celebrity->loadCount([
            'orders as total_orders',
            'orders as completed_orders' => fn ($q) => $q->where('status', 'completed'),
        ]);
        $celebrity->loadSum(['orders as total_revenue' => fn ($q) => $q->where('status', 'completed')], 'total_amount');

        $recentOrders = $celebrity->orders()
            ->with(['fan:id,display_name', 'service:id,title'])
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'celebrity'     => $celebrity,
            'recent_orders' => $recentOrders,
        ]);
    }

    public function update(Request $request, CelebrityProfile $celebrity)
    {
        $data = $request->validate([
            'verification_status' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
            'is_featured'         => ['nullable', 'boolean'],
            'commission_rate'     => ['nullable', 'numeric', 'between:0,100'],
        ]);

        $celebrity->update(array_filter($data, fn ($v) => $v !== null));

        return response()->json([
            'message'   => 'Celebrity profile updated.',
            'celebrity' => $celebrity->fresh(['user']),
        ]);
    }

    public function updateUserStatus(Request $request, CelebrityProfile $celebrity)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended', 'banned'])],
        ]);

        $celebrity->user()->update(['status' => $data['status']]);

        return response()->json(['message' => 'User status updated.']);
    }
}
