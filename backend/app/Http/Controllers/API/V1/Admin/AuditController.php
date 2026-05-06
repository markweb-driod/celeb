<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type'     => ['nullable', 'string', 'in:user,transaction,order'],
            'per_page' => ['nullable', 'integer', 'between:10,100'],
        ]);

        $type    = $validated['type'] ?? null;
        $perPage = (int) ($validated['per_page'] ?? 50);

        $logs = collect();

        if (!$type || $type === 'user') {
            $newUsers = User::query()
                ->select('id', 'email', 'user_type', 'status', 'created_at')
                ->latest()
                ->limit($perPage)
                ->get()
                ->map(fn ($u) => [
                    'type'       => 'user_registered',
                    'category'   => 'user',
                    'label'      => 'New ' . $u->user_type . ' registered',
                    'detail'     => $u->email,
                    'meta'       => ['id' => $u->id, 'status' => $u->status, 'user_type' => $u->user_type],
                    'created_at' => $u->created_at?->toISOString(),
                ]);

            $logs = $logs->merge($newUsers);
        }

        if (!$type || $type === 'transaction') {
            $transactions = Transaction::query()
                ->with('user:id,email')
                ->latest('created_at')
                ->limit($perPage)
                ->get()
                ->map(fn ($t) => [
                    'type'       => 'transaction_' . $t->transaction_type,
                    'category'   => 'transaction',
                    'label'      => ucfirst($t->transaction_type) . ' — ' . strtoupper($t->status),
                    'detail'     => ($t->user->email ?? 'Unknown') . ' · $' . number_format((float) $t->amount, 2) . ' ' . strtoupper($t->currency ?? 'USD'),
                    'meta'       => [
                        'transaction_number' => $t->transaction_number,
                        'status'             => $t->status,
                        'amount'             => (float) $t->amount,
                        'currency'           => $t->currency,
                        'payment_method'     => $t->payment_method,
                    ],
                    'created_at' => $t->created_at?->toISOString(),
                ]);

            $logs = $logs->merge($transactions);
        }

        if (!$type || $type === 'order') {
            $orders = Order::query()
                ->with(['fan:id,display_name', 'celebrity:id,stage_name'])
                ->latest()
                ->limit($perPage)
                ->get()
                ->map(fn ($o) => [
                    'type'       => 'order_' . $o->status,
                    'category'   => 'order',
                    'label'      => 'Order ' . strtoupper($o->status),
                    'detail'     => ($o->fan->display_name ?? 'Fan') . ' → ' . ($o->celebrity->stage_name ?? 'Celebrity') . ' · $' . number_format((float) $o->total_amount, 2),
                    'meta'       => [
                        'order_number' => $o->order_number,
                        'status'       => $o->status,
                        'amount'       => (float) $o->total_amount,
                        'currency'     => $o->currency,
                    ],
                    'created_at' => $o->created_at?->toISOString(),
                ]);

            $logs = $logs->merge($orders);
        }

        $sorted = $logs
            ->sortByDesc('created_at')
            ->take($perPage)
            ->values();

        return response()->json(['logs' => $sorted]);
    }
}
