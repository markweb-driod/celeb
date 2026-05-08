<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CelebrityProfile;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Review;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
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
            ->orderBy('sort_order', 'asc')
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
            'stage_name'          => ['nullable', 'string', 'max:150'],
            'bio'                 => ['nullable', 'string', 'max:2000'],
            'category'            => ['nullable', 'string', 'max:100'],
            'profile_image_url'   => ['nullable', 'url', 'max:500'],
            'cover_image_url'     => ['nullable', 'url', 'max:500'],
            'social_links'        => ['nullable', 'array'],
            'verification_status' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
            'is_featured'         => ['nullable', 'boolean'],
            'commission_rate'     => ['nullable', 'numeric', 'between:0,100'],
            'sort_order'          => ['nullable', 'integer', 'min:0'],
        ]);

        $celebrity->update(array_filter($data, fn ($v) => !is_null($v)));

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

    /* ── Create celebrity ─────────────────────────────────────────────────── */

    public function store(Request $request)
    {
        $data = $request->validate([
            'email'               => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'            => ['required', 'string', 'min:8'],
            'stage_name'          => ['required', 'string', 'max:150'],
            'bio'                 => ['nullable', 'string', 'max:2000'],
            'category'            => ['nullable', 'string', 'max:100'],
            'commission_rate'     => ['nullable', 'numeric', 'between:0,100'],
            'verification_status' => ['nullable', Rule::in(['pending', 'verified', 'rejected'])],
            'is_featured'         => ['nullable', 'boolean'],
        ]);

        $user = User::create([
            'email'         => $data['email'],
            'password_hash' => $data['password'],
            'user_type'     => 'celebrity',
            'status'        => 'active',
        ]);

        $celebrity = CelebrityProfile::create([
            'user_id'             => $user->id,
            'stage_name'          => $data['stage_name'],
            'slug'                => Str::slug($data['stage_name']) . '-' . $user->id,
            'bio'                 => $data['bio'] ?? null,
            'category'            => $data['category'] ?? null,
            'commission_rate'     => $data['commission_rate'] ?? 20,
            'verification_status' => $data['verification_status'] ?? 'pending',
            'is_featured'         => $data['is_featured'] ?? false,
        ]);

        $celebrity->load('user');

        return response()->json(['celebrity' => $celebrity], 201);
    }

    /* ── Delete celebrity ─────────────────────────────────────────────────── */

    public function destroy(CelebrityProfile $celebrity)
    {
        DB::transaction(function () use ($celebrity) {
            $user = $celebrity->user;

            $orderIds = Order::where('celebrity_id', $celebrity->id)->pluck('id');

            if ($orderIds->isNotEmpty()) {
                Conversation::whereIn('order_id', $orderIds)->delete();
                Transaction::whereIn('order_id', $orderIds)->delete();
                Review::whereIn('order_id', $orderIds)->delete();
                Order::whereIn('id', $orderIds)->delete();
            }

            Payout::where('celebrity_id', $celebrity->id)->delete();
            Review::where('celebrity_id', $celebrity->id)->delete();
            Service::where('celebrity_id', $celebrity->id)->delete();

            if ($user) {
                Message::where('sender_id', $user->id)->delete();
                Transaction::where('user_id', $user->id)->delete();
            }

            $celebrity->delete();
            $user?->delete();
        });

        return response()->json(['message' => 'Celebrity deleted.']);
    }

    /* ── Bulk reorder ──────────────────────────────────────────────────────── */

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order'               => ['required', 'array', 'min:1'],
            'order.*.id'          => ['required', 'integer', 'exists:celebrity_profiles,id'],
            'order.*.sort_order'  => ['required', 'integer', 'min:0'],
        ]);

        foreach ($data['order'] as $item) {
            CelebrityProfile::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json(['message' => 'Display order saved.']);
    }

    /* ── Services (payment items) ─────────────────────────────────────────── */

    public function services(CelebrityProfile $celebrity)
    {
        $services = $celebrity->services()
            ->withCount('orders')
            ->latest()
            ->get();

        return response()->json(['services' => $services]);
    }

    public function storeService(Request $request, CelebrityProfile $celebrity)
    {
        $data = $request->validate([
            'title'             => ['required', 'string', 'max:200'],
            'description'       => ['nullable', 'string', 'max:2000'],
            'service_type'      => ['required', Rule::in(['video_shoutout', 'live_session', 'exclusive_content', 'meet_and_greet', 'birthday_surprise', 'custom'])],
            'base_price'        => ['required', 'numeric', 'min:0'],
            'currency'          => ['nullable', 'string', 'max:3'],
            'max_delivery_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'status'            => ['nullable', Rule::in(['active', 'inactive', 'draft'])],
            'images'            => ['nullable', 'array', 'max:8'],
            'images.*'          => ['required', 'url', 'max:1000'],
            'short_video_url'   => ['nullable', 'url', 'max:1000'],
        ]);

        $service = $celebrity->services()->create([
            ...$data,
            'slug'     => Str::slug($data['title']) . '-' . time(),
            'currency' => $data['currency'] ?? 'USD',
            'status'   => $data['status'] ?? 'active',
        ]);

        return response()->json(['service' => $service], 201);
    }

    public function updateService(Request $request, CelebrityProfile $celebrity, Service $service)
    {
        abort_if($service->celebrity_id !== $celebrity->id, 404);

        $data = $request->validate([
            'title'             => ['nullable', 'string', 'max:200'],
            'description'       => ['nullable', 'string', 'max:2000'],
            'service_type'      => ['nullable', Rule::in(['video_shoutout', 'live_session', 'exclusive_content', 'meet_and_greet', 'birthday_surprise', 'custom'])],
            'base_price'        => ['nullable', 'numeric', 'min:0'],
            'currency'          => ['nullable', 'string', 'max:3'],
            'max_delivery_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'status'            => ['nullable', Rule::in(['active', 'inactive', 'draft'])],
            'images'            => ['nullable', 'array', 'max:8'],
            'images.*'          => ['required', 'url', 'max:1000'],
            'short_video_url'   => ['nullable', 'url', 'max:1000'],
        ]);

        $service->update(array_filter($data, fn ($v) => !is_null($v)));

        return response()->json(['service' => $service->fresh()]);
    }

    public function destroyService(CelebrityProfile $celebrity, Service $service)
    {
        abort_if($service->celebrity_id !== $celebrity->id, 404);
        $service->delete();

        return response()->json(['message' => 'Service deleted.']);
    }
}
