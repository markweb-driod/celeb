<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q'                => ['nullable', 'string', 'max:120'],
            'transaction_type' => ['nullable', Rule::in(['payment', 'refund', 'payout'])],
            'status'           => ['nullable', Rule::in(['pending', 'pending_confirmation', 'completed', 'failed'])],
            'per_page'         => ['nullable', 'integer', 'between:5,100'],
        ]);

        $transactions = Transaction::query()
            ->with([
                'user:id,email',
                'order:id,order_number,fan_id,celebrity_id',
                'order.fan:id,display_name',
                'order.celebrity:id,stage_name',
            ])
            ->when($validated['q'] ?? null, fn ($q, $search) =>
                $q->where('transaction_number', 'like', '%' . $search . '%')
            )
            ->when($validated['transaction_type'] ?? null, fn ($q, $type) => $q->where('transaction_type', $type))
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->latest('created_at')
            ->paginate((int) ($validated['per_page'] ?? 25));

        $summary = [
            'total_payments'              => (float) Transaction::where('transaction_type', 'payment')->where('status', 'completed')->sum('amount'),
            'total_refunds'               => (float) Transaction::where('transaction_type', 'refund')->where('status', 'completed')->sum('amount'),
            'pending_confirmation_count'  => Transaction::where('status', 'pending_confirmation')->count(),
            'pending_count'               => Transaction::where('status', 'pending')->count(),
            'failed_count'                => Transaction::where('status', 'failed')->count(),
        ];

        return response()->json([
            'transactions' => $transactions,
            'summary'      => $summary,
        ]);
    }

    public function show(Transaction $transaction)
    {
        $transaction->load([
            'user:id,email',
            'order:id,order_number,fan_id,celebrity_id,total_amount,status',
            'order.fan:id,display_name,user_id',
            'order.fan.user:id,email',
            'order.celebrity:id,stage_name',
        ]);

        return response()->json(['transaction' => $transaction]);
    }

    public function confirm(Request $request, Transaction $transaction)
    {
        if ($transaction->status !== 'pending_confirmation') {
            return response()->json(['message' => 'Transaction is not awaiting confirmation.'], 422);
        }

        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $transaction->update([
            'status'       => 'completed',
            'admin_note'   => $validated['admin_note'] ?? null,
            'confirmed_by' => auth()->id(),
            'confirmed_at' => now(),
        ]);

        // Advance the linked order to confirmed
        if ($transaction->order && $transaction->order->status === 'awaiting_confirmation') {
            $transaction->order->update(['status' => 'confirmed']);
        }

        return response()->json(['message' => 'Payment confirmed.', 'transaction' => $transaction->fresh()]);
    }

    public function reject(Request $request, Transaction $transaction)
    {
        if ($transaction->status !== 'pending_confirmation') {
            return response()->json(['message' => 'Transaction is not awaiting confirmation.'], 422);
        }

        $validated = $request->validate([
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $transaction->update([
            'status'     => 'failed',
            'admin_note' => $validated['admin_note'] ?? null,
        ]);

        // Revert order to pending so fan can retry
        if ($transaction->order && $transaction->order->status === 'awaiting_confirmation') {
            $transaction->order->update(['status' => 'pending']);
        }

        return response()->json(['message' => 'Payment rejected.', 'transaction' => $transaction->fresh()]);
    }

    public function payouts(Request $request)
    {
        $validated = $request->validate([
            'status'   => ['nullable', Rule::in(['pending', 'processing', 'paid', 'failed'])],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $payouts = Payout::query()
            ->with(['celebrity:id,stage_name,user_id', 'celebrity.user:id,email'])
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->latest('created_at')
            ->paginate((int) ($validated['per_page'] ?? 25));

        $payoutSummary = [
            'total_gross'    => (float) Payout::where('status', 'paid')->sum('gross_amount'),
            'total_net'      => (float) Payout::where('status', 'paid')->sum('net_amount'),
            'total_fees'     => (float) Payout::where('status', 'paid')->sum('platform_fees'),
            'pending_count'  => Payout::whereIn('status', ['pending', 'processing'])->count(),
        ];

        return response()->json([
            'payouts'        => $payouts,
            'payout_summary' => $payoutSummary,
        ]);
    }
}
