<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CelebrityProfile;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function overview()
    {
        $usersByType = User::query()
            ->select('user_type', DB::raw('COUNT(*) as total'))
            ->groupBy('user_type')
            ->pluck('total', 'user_type');

        $usersByStatus = User::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $ordersByStatus = Order::query()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $grossPayments = (float) Transaction::query()
            ->where('transaction_type', 'payment')
            ->where('status', 'completed')
            ->sum('amount');

        $refunds = (float) Transaction::query()
            ->where('transaction_type', 'refund')
            ->where('status', 'completed')
            ->sum('amount');

        $platformFees = (float) Order::query()
            ->where('status', 'completed')
            ->sum('platform_fee');

        $activeSubscriptions = Order::query()
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereHas('service', fn ($query) => $query->where('service_type', 'membership'))
            ->count();

        $monthlyRows = Transaction::query()
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as ym")
            ->selectRaw("SUM(CASE WHEN transaction_type = 'payment' AND status = 'completed' THEN amount ELSE 0 END) as payments")
            ->selectRaw("SUM(CASE WHEN transaction_type = 'refund' AND status = 'completed' THEN amount ELSE 0 END) as refunds")
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('ym')
            ->orderBy('ym')
            ->get()
            ->keyBy('ym');

        $monthly = collect(range(5, 0))->reverse()->map(function (int $offset) use ($monthlyRows) {
            $month = Carbon::now()->subMonths($offset);
            $key = $month->format('Y-m');
            $row = $monthlyRows->get($key);

            return [
                'month' => $month->format('M Y'),
                'payments' => (float) ($row->payments ?? 0),
                'refunds' => (float) ($row->refunds ?? 0),
                'net' => (float) (($row->payments ?? 0) - ($row->refunds ?? 0)),
            ];
        })->values();

        $topCreators = CelebrityProfile::query()
            ->with('user:id,email')
            ->withCount([
                'orders as completed_orders' => fn ($query) => $query->where('status', 'completed'),
            ])
            ->withSum([
                'orders as completed_revenue' => fn ($query) => $query->where('status', 'completed'),
            ], 'total_amount')
            ->orderByDesc('completed_revenue')
            ->limit(8)
            ->get(['id', 'user_id', 'stage_name', 'category', 'verification_status'])
            ->map(fn (CelebrityProfile $profile) => [
                'id' => $profile->id,
                'stage_name' => $profile->stage_name,
                'email' => $profile->user?->email,
                'category' => $profile->category,
                'verification_status' => $profile->verification_status,
                'completed_orders' => (int) ($profile->completed_orders ?? 0),
                'completed_revenue' => (float) ($profile->completed_revenue ?? 0),
            ]);

        return response()->json([
            'stats' => [
                'users_total' => (int) User::query()->count(),
                'users_by_type' => [
                    'admin' => (int) ($usersByType['admin'] ?? 0),
                    'celebrity' => (int) ($usersByType['celebrity'] ?? 0),
                    'fan' => (int) ($usersByType['fan'] ?? 0),
                ],
                'users_by_status' => [
                    'active' => (int) ($usersByStatus['active'] ?? 0),
                    'suspended' => (int) ($usersByStatus['suspended'] ?? 0),
                    'banned' => (int) ($usersByStatus['banned'] ?? 0),
                ],
                'orders_total' => (int) Order::query()->count(),
                'orders_by_status' => [
                    'pending' => (int) ($ordersByStatus['pending'] ?? 0),
                    'confirmed' => (int) ($ordersByStatus['confirmed'] ?? 0),
                    'completed' => (int) ($ordersByStatus['completed'] ?? 0),
                    'cancelled' => (int) ($ordersByStatus['cancelled'] ?? 0),
                    'refunded' => (int) ($ordersByStatus['refunded'] ?? 0),
                ],
                'conversations_total' => (int) Conversation::query()->count(),
                'messages_total' => (int) Message::query()->count(),
                'active_subscriptions' => $activeSubscriptions,
                'gross_payments' => $grossPayments,
                'refunds' => $refunds,
                'net_revenue' => $grossPayments - $refunds,
                'platform_fees_collected' => $platformFees,
            ],
            'monthly_revenue' => $monthly,
            'top_creators' => $topCreators,
        ]);
    }

    public function monitoring()
    {
        $dbHealthy = true;
        $dbError = null;

        try {
            DB::select('SELECT 1');
        } catch (\Throwable $exception) {
            $dbHealthy = false;
            $dbError = $exception->getMessage();
        }

        $jobsPending = Schema::hasTable('jobs') ? DB::table('jobs')->count() : null;
        $jobsFailed = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : null;

        return response()->json([
            'system' => [
                'app_name' => config('app.name'),
                'app_env' => config('app.env'),
                'app_debug' => (bool) config('app.debug'),
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'timezone' => config('app.timezone'),
                'server_time' => now()->toIso8601String(),
            ],
            'health' => [
                'database_ok' => $dbHealthy,
                'database_error' => $dbError,
                'jobs_pending' => $jobsPending,
                'jobs_failed' => $jobsFailed,
            ],
        ]);
    }
}
