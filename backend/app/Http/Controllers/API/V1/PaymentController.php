<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\SystemSetting;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Get all enabled payment methods (public-facing display info, no secrets).
     */
    public function methods()
    {
        $methods = SystemSetting::getValue('payments.methods') ?? [];
        $enabled = [];

        $displayFields = ['key', 'label', 'type', 'instructions', 'email', 'phone_or_email',
                          'handle', 'cashtag', 'phone', 'address', 'network', 'supported_brands',
                          'holder_name'];

        foreach ($methods as $key => $config) {
            if (!empty($config['enabled'])) {
                $item = ['key' => $key];
                foreach ($displayFields as $field) {
                    if (isset($config[$field])) {
                        $item[$field] = $config[$field];
                    }
                }
                $enabled[] = $item;
            }
        }

        return response()->json(['methods' => $enabled]);
    }

    /**
     * Upload a proof-of-payment image and return its public URL.
     * Accepts multipart/form-data with field "proof".
     */
    public function uploadProof(Request $request)
    {
        $request->validate([
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,pdf', 'max:8192'],
        ]);

        $path = $request->file('proof')->store('payment-proofs', 'public');
        $url  = Storage::disk('public')->url($path);

        return response()->json(['proof_url' => $url]);
    }

    /**
     * Fan submits payment for an order.
     * Creates a transaction record with status = pending_confirmation
     * and moves the order to awaiting_confirmation.
     */
    public function submit(Request $request, Order $order)
    {
        $fan = auth()->user()->fanProfile;

        if (!$fan || $order->fan_id !== $fan->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'This order is not awaiting payment.'], 422);
        }

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'max:50'],
            'proof_url'      => ['nullable', 'string', 'max:1000'],
            'gift_card_code' => ['nullable', 'string', 'max:500'],
            'notes'          => ['nullable', 'string', 'max:1000'],
        ]);

        // Verify the method is enabled
        $methods = SystemSetting::getValue('payments.methods') ?? [];
        $method  = $validated['payment_method'];

        if (!isset($methods[$method]) || empty($methods[$method]['enabled'])) {
            return response()->json(['message' => 'Payment method is not available.'], 422);
        }

        // Build payment_meta
        $meta = [];
        if (!empty($validated['notes'])) {
            $meta['notes'] = $validated['notes'];
        }
        $meta['method_label'] = $methods[$method]['label'] ?? $method;

        $txn = Transaction::create([
            'transaction_number' => 'TXN-' . strtoupper(Str::random(12)),
            'order_id'           => $order->id,
            'user_id'            => auth()->id(),
            'transaction_type'   => 'payment',
            'payment_method'     => $method,
            'amount'             => $order->total_amount,
            'currency'           => $order->currency ?? 'USD',
            'status'             => 'pending_confirmation',
            'proof_url'          => $validated['proof_url'] ?? null,
            'gift_card_code'     => $validated['gift_card_code'] ?? null,
            'payment_meta'       => !empty($meta) ? $meta : null,
            'created_at'         => now(),
        ]);

        $order->update(['status' => 'awaiting_confirmation']);

        return response()->json([
            'message'     => 'Payment submitted. You will be notified once it is confirmed.',
            'transaction' => [
                'id'                 => $txn->id,
                'transaction_number' => $txn->transaction_number,
                'status'             => $txn->status,
                'order_id'           => $order->id,
                'order_number'       => $order->order_number,
            ],
        ], 201);
    }
}
