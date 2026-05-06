<?php

namespace App\Http\Controllers\API\V1\Chat;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function subscriptions(Request $request)
    {
        $user = $request->user();

        if ($user->user_type !== 'fan' || ! $user->fanProfile) {
            return response()->json([
                'message' => 'Only fans can fetch subscription chats.',
            ], 403);
        }

        $eligibleOrders = Order::query()
            ->where('fan_id', $user->fanProfile->id)
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereHas('service', fn ($query) => $query->where('service_type', 'membership'))
            ->with([
                'service:id,title,service_type,base_price,currency',
                'celebrity:id,user_id,stage_name,profile_image_url',
                'celebrity.user:id,email',
            ])
            ->latest('id')
            ->get();

        $conversationsByOrder = Conversation::query()
            ->whereIn('order_id', $eligibleOrders->pluck('id'))
            ->pluck('id', 'order_id');

        $subscriptions = $eligibleOrders
            ->unique('celebrity_id')
            ->values()
            ->map(function (Order $order) use ($conversationsByOrder) {
                return [
                    'order_id' => $order->id,
                    'conversation_id' => $conversationsByOrder[$order->id] ?? null,
                    'celebrity_id' => $order->celebrity_id,
                    'celebrity_name' => $order->celebrity?->stage_name,
                    'celebrity_email' => $order->celebrity?->user?->email,
                    'celebrity_avatar' => $order->celebrity?->profile_image_url,
                    'service_title' => $order->service?->title,
                    'subscription_price' => (float) ($order->service?->base_price ?? 0),
                    'currency' => $order->service?->currency ?? 'USD',
                ];
            });

        return response()->json([
            'subscriptions' => $subscriptions,
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();

        $query = Conversation::query()->with([
            'order.service:id,title,service_type',
            'order.fan:id,user_id,display_name',
            'order.fan.user:id,email',
            'order.celebrity:id,user_id,stage_name,profile_image_url',
            'order.celebrity.user:id,email',
            'latestMessage:id,conversation_id,sender_id,content,created_at',
            'latestMessage.sender:id,email,user_type',
        ])->latest('last_message_at');

        if ($user->user_type === 'fan' && $user->fanProfile) {
            $query->whereHas('order', function ($inner) use ($user) {
                $inner->where('fan_id', $user->fanProfile->id)
                    ->whereIn('status', ['confirmed', 'completed'])
                    ->whereHas('service', fn ($s) => $s->where('service_type', 'membership'));
            });
        } elseif ($user->user_type === 'celebrity' && $user->celebrityProfile) {
            $query->whereHas('order', function ($inner) use ($user) {
                $inner->where('celebrity_id', $user->celebrityProfile->id)
                    ->whereHas('service', fn ($s) => $s->where('service_type', 'membership'));
            });
        } elseif ($user->user_type !== 'admin') {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'conversations' => $query->paginate(20),
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->user_type !== 'fan' || ! $user->fanProfile) {
            return response()->json([
                'message' => 'Only fans can start a subscription chat.',
            ], 403);
        }

        $data = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
        ]);

        $order = Order::query()
            ->with('service')
            ->findOrFail($data['order_id']);

        if ($order->fan_id !== $user->fanProfile->id) {
            return response()->json(['message' => 'You cannot start chat for this order.'], 403);
        }

        if (! in_array($order->status, ['confirmed', 'completed'], true)) {
            return response()->json(['message' => 'Chat opens after order is confirmed.'], 422);
        }

        if ($order->service?->service_type !== 'membership') {
            return response()->json(['message' => 'Only membership orders can open subscription chat.'], 422);
        }

        $conversation = Conversation::query()->firstOrCreate(
            ['order_id' => $order->id],
            [
                'status' => 'active',
                'last_message_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Conversation ready.',
            'conversation' => $conversation,
        ], 201);
    }

    public function messages(Request $request, Conversation $conversation)
    {
        if (! $this->canAccessConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $messages = $conversation->messages()
            ->with('sender:id,email,user_type')
            ->latest('id')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();

        return response()->json([
            'messages' => $messages,
        ]);
    }

    public function sendMessage(Request $request, Conversation $conversation)
    {
        if (! $this->canAccessConversation($request->user(), $conversation)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if ($conversation->status !== 'active') {
            return response()->json(['message' => 'Conversation is archived.'], 422);
        }

        $data = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
            'attachments' => ['nullable', 'array'],
        ]);

        $message = Message::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'content' => $data['content'],
            'attachments' => $data['attachments'] ?? null,
        ]);

        $conversation->update([
            'last_message_at' => now(),
        ]);

        broadcast(new MessageSent($message))->toOthers();

        return response()->json([
            'message' => 'Message sent.',
            'data' => $message->load('sender:id,email,user_type'),
        ], 201);
    }

    private function canAccessConversation(User $user, Conversation $conversation): bool
    {
        if ($user->user_type === 'admin') {
            return true;
        }

        $conversation->loadMissing('order.service');

        if (! $conversation->order || $conversation->order->service?->service_type !== 'membership') {
            return false;
        }

        if ($user->user_type === 'fan' && $user->fanProfile) {
            return (int) $conversation->order->fan_id === (int) $user->fanProfile->id;
        }

        if ($user->user_type === 'celebrity' && $user->celebrityProfile) {
            return (int) $conversation->order->celebrity_id === (int) $user->celebrityProfile->id;
        }

        return false;
    }
}
