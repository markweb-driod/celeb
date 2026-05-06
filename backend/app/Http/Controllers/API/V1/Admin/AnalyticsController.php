<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CelebrityProfile;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index()
    {
        // Build 6-month buckets
        $userGrowthRows = User::query()
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month")
            ->selectRaw("SUM(CASE WHEN user_type = 'fan' THEN 1 ELSE 0 END) as fans")
            ->selectRaw("SUM(CASE WHEN user_type = 'celebrity' THEN 1 ELSE 0 END) as celebrities")
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $revenueRows = Transaction::query()
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month")
            ->selectRaw("SUM(CASE WHEN transaction_type = 'payment' AND status = 'completed' THEN amount ELSE 0 END) as gross")
            ->selectRaw("SUM(CASE WHEN transaction_type = 'refund' AND status = 'completed' THEN amount ELSE 0 END) as refunds")
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $orderRows = Order::query()
            ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month")
            ->selectRaw("COUNT(*) as total_orders")
            ->selectRaw("SUM(CASE WHEN status = 'completed' THEN platform_fee ELSE 0 END) as platform_fees")
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $monthly = collect(range(5, 0))->reverse()->map(function (int $offset) use ($userGrowthRows, $revenueRows, $orderRows) {
            $dt  = Carbon::now()->subMonths($offset);
            $key = $dt->format('Y-m');
            $rev = $revenueRows->get($key);
            $ord = $orderRows->get($key);
            $ug  = $userGrowthRows->get($key);

            return [
                'month'            => $dt->format('M Y'),
                'gross'            => (float) ($rev->gross ?? 0),
                'refunds'          => (float) ($rev->refunds ?? 0),
                'net'              => (float) (($rev->gross ?? 0) - ($rev->refunds ?? 0)),
                'platform_fees'    => (float) ($ord->platform_fees ?? 0),
                'total_orders'     => (int) ($ord->total_orders ?? 0),
                'new_fans'         => (int) ($ug->fans ?? 0),
                'new_celebrities'  => (int) ($ug->celebrities ?? 0),
            ];
        })->values();

        // Orders by status
        $ordersByStatus = Order::query()
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        // Top earning categories
        $topCategories = CelebrityProfile::query()
            ->join('orders', 'celebrity_profiles.id', '=', 'orders.celebrity_id')
            ->where('orders.status', 'completed')
            ->select(
                'celebrity_profiles.category',
                DB::raw('COUNT(*) as order_count'),
                DB::raw('SUM(orders.total_amount) as revenue')
            )
            ->groupBy('celebrity_profiles.category')
            ->orderByDesc('revenue')
            ->limit(8)
            ->get();

        // Top celebrities by revenue
        $topCelebrities = CelebrityProfile::query()
            ->with('user:id,email')
            ->withCount(['orders as completed_orders' => fn ($q) => $q->where('status', 'completed')])
            ->withSum(['orders as total_revenue' => fn ($q) => $q->where('status', 'completed')], 'total_amount')
            ->orderByDesc('total_revenue')
            ->limit(5)
            ->get();

        // KPIs
        $totalPayments = (float) Transaction::where('transaction_type', 'payment')->where('status', 'completed')->sum('amount');
        $totalRefunds  = (float) Transaction::where('transaction_type', 'refund')->where('status', 'completed')->sum('amount');
        $totalOrders   = Order::count();
        $completedOrders = Order::where('status', 'completed')->count();

        $kpis = [
            'total_gross_revenue' => $totalPayments,
            'total_refunds'       => $totalRefunds,
            'net_revenue'         => $totalPayments - $totalRefunds,
            'platform_fees'       => (float) Order::where('status', 'completed')->sum('platform_fee'),
            'total_orders'        => $totalOrders,
            'completed_orders'    => $completedOrders,
            'conversion_rate'     => $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 1) : 0,
            'total_users'         => User::count(),
            'total_celebrities'   => User::where('user_type', 'celebrity')->count(),
            'total_fans'          => User::where('user_type', 'fan')->count(),
            'active_celebrities'  => CelebrityProfile::whereHas('user', fn ($q) => $q->where('status', 'active'))->count(),
            'verified_celebrities' => CelebrityProfile::where('verification_status', 'verified')->count(),
        ];

        return response()->json([
            'kpis'             => $kpis,
            'monthly'          => $monthly,
            'orders_by_status' => $ordersByStatus,
            'top_categories'   => $topCategories,
            'top_celebrities'  => $topCelebrities,
        ]);
    }
}
