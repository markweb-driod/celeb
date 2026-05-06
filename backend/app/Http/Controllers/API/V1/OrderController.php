<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\CreateOrderRequest;
use App\Models\Booking;
use App\Models\Order;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Stripe\StripeClient;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        
        $orders = Order::query()
            ->when($user->user_type === 'fan', fn($q) => $q->where('fan_id', $user->fanProfile->id))
            ->when($user->user_type === 'celebrity', fn($q) => $q->where('celebrity_id', $user->celebrityProfile->id))
            ->with(['service', 'celebrity', 'fan'])
            ->latest()
            ->paginate(15);
            
        return response()->json(['orders' => $orders]);
    }

    public function store(CreateOrderRequest $request)
    {
        $service = Service::findOrFail($request->service_id);
        
        // Calculate fees
        $subtotal = $service->base_price; // Add logic for tiered/hourly if needed
        $platformFee = $subtotal * ($service->celebrity->commission_rate / 100);
        $totalAmount = $subtotal + $platformFee;

        try {
            DB::beginTransaction();

            $order = Order::create([
                'order_number' => 'ORD-' . strtoupper(Str::random(10)),
                'fan_id' => $request->user()->fanProfile->id,
                'celebrity_id' => $service->celebrity_id,
                'service_id' => $service->id,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'platform_fee' => $platformFee,
                'total_amount' => $totalAmount,
                'currency' => $service->currency,
                'customization_data' => $request->customization_data,
            ]);

            // Create booking if required
            if ($service->requires_booking && $request->has('booking_date')) {
                Booking::create([
                    'order_id' => $order->id,
                    'booking_date' => $request->booking_date,
                    'booking_time' => $request->booking_time,
                    'duration_minutes' => $service->duration_minutes,
                    'location_type' => 'virtual', // Default for now
                    'booking_status' => 'scheduled',
                ]);
            }
            
            // Here we would typically initiate Stripe Payment Intent

            DB::commit();

            return response()->json([
                'message' => 'Order created successfully',
                'order' => $order->load('booking')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Order creation failed', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Request $request, Order $order)
    {
        $user = $request->user();

        // Authorization check
        if ($user->user_type === 'fan' && $order->fan_id !== $user->fanProfile->id) {
            abort(403);
        }
        if ($user->user_type === 'celebrity' && $order->celebrity_id !== $user->celebrityProfile->id) {
            abort(403);
        }

        return response()->json(['order' => $order->load('service', 'booking', 'transaction')]);
    }

    /**
     * Celebrity updates an order status (confirm → in_progress → completed / cancelled).
     * Fans may only cancel their own pending orders.
     */
    public function updateStatus(Request $request, Order $order)
    {
        $user = $request->user();

        // Determine allowed transitions per role
        if ($user->user_type === 'celebrity') {
            if (! $user->celebrityProfile || (int) $order->celebrity_id !== (int) $user->celebrityProfile->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            $allowed = ['confirmed', 'in_progress', 'completed', 'cancelled'];
        } elseif ($user->user_type === 'fan') {
            if (! $user->fanProfile || (int) $order->fan_id !== (int) $user->fanProfile->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            if ($order->status !== 'pending') {
                return response()->json(['message' => 'Fans can only cancel pending orders.'], 422);
            }
            $allowed = ['cancelled'];
        } else {
            // Admins can set any status
            $allowed = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded'];
        }

        $data = $request->validate([
            'status' => ['required', 'string', 'in:' . implode(',', $allowed)],
            'notes'  => ['nullable', 'string', 'max:1000'],
        ]);

        $order->update([
            'status' => $data['status'],
            'notes'  => $data['notes'] ?? $order->notes,
        ]);

        return response()->json([
            'message' => 'Order status updated.',
            'order'   => $order->fresh()->load('service'),
        ]);
    }

    /**
     * Create a Stripe Payment Intent for an order so the frontend can collect payment.
     */
    public function createPaymentIntent(Request $request, Order $order)
    {
        $user = $request->user();

        if ($user->user_type === 'fan') {
            if (! $user->fanProfile || (int) $order->fan_id !== (int) $user->fanProfile->id) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
        } else {
            return response()->json(['message' => 'Only fans can initiate payment.'], 403);
        }

        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Order is not in a payable state.'], 422);
        }

        $secretKey = config('services.stripe.secret');
        if (! $secretKey) {
            return response()->json(['message' => 'Stripe is not configured.'], 503);
        }

        try {
            $stripe = new StripeClient($secretKey);

            $intent = $stripe->paymentIntents->create([
                'amount'   => (int) round((float) $order->total_amount * 100),
                'currency' => strtolower($order->currency ?? 'usd'),
                'metadata' => [
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                    'fan_id'       => $order->fan_id,
                    'celebrity_id' => $order->celebrity_id,
                ],
                'automatic_payment_methods' => ['enabled' => true],
            ]);

            return response()->json([
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'amount' => $order->total_amount,
                'currency' => $order->currency,
            ]);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            return response()->json(['message' => 'Stripe error: ' . $e->getMessage()], 502);
        }
    }
}
