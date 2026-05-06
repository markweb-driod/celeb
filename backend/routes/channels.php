<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

/**
 * Private channel for a specific conversation.
 * Accessible by the fan, the celebrity, or any admin.
 */
Broadcast::channel('conversation.{conversationId}', function ($user, int $conversationId) {
    if ($user->user_type === 'admin') {
        return true;
    }

    $conversation = Conversation::query()
        ->with('order.service')
        ->find($conversationId);

    if (! $conversation || $conversation->order?->service?->service_type !== 'membership') {
        return false;
    }

    if ($user->user_type === 'fan' && $user->fanProfile) {
        return (int) $conversation->order->fan_id === (int) $user->fanProfile->id;
    }

    if ($user->user_type === 'celebrity' && $user->celebrityProfile) {
        return (int) $conversation->order->celebrity_id === (int) $user->celebrityProfile->id;
    }

    return false;
});

/**
 * Admin-only presence channel for live supervision of all chats.
 */
Broadcast::channel('admin.chat-supervision', function ($user) {
    if ($user->user_type === 'admin') {
        return ['id' => $user->id, 'email' => $user->email];
    }
    return false;
});
