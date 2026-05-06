<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;

class ChatSupervisionController extends Controller
{
    /**
     * List all conversations with summary info for admin supervision.
     */
    public function index(Request $request)
    {
        $conversations = Conversation::query()
            ->with([
                'order.service:id,title,service_type',
                'order.fan:id,user_id,display_name',
                'order.fan.user:id,email',
                'order.celebrity:id,user_id,stage_name,profile_image_url',
                'order.celebrity.user:id,email',
                'latestMessage:id,conversation_id,sender_id,content,created_at',
                'latestMessage.sender:id,email,user_type',
            ])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), function ($q, $search) {
                $q->whereHas('order.fan.user', fn ($u) => $u->where('email', 'like', "%{$search}%"))
                  ->orWhereHas('order.celebrity.user', fn ($u) => $u->where('email', 'like', "%{$search}%"));
            })
            ->latest('last_message_at')
            ->paginate(25);

        return response()->json(['conversations' => $conversations]);
    }

    /**
     * Get all messages in a conversation for admin review.
     */
    public function messages(Request $request, Conversation $conversation)
    {
        $messages = $conversation->messages()
            ->with('sender:id,email,user_type')
            ->oldest('id')
            ->paginate(100);

        return response()->json([
            'conversation' => $conversation->load([
                'order.fan.user:id,email',
                'order.celebrity:id,stage_name',
            ]),
            'messages' => $messages,
        ]);
    }

    /**
     * Admin can archive/re-activate a conversation.
     */
    public function updateStatus(Request $request, Conversation $conversation)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:active,archived,flagged'],
        ]);

        $conversation->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Conversation status updated.',
            'conversation' => $conversation->fresh(),
        ]);
    }

    /**
     * Admin can delete a specific message (moderation).
     */
    public function deleteMessage(Request $request, Conversation $conversation, Message $message)
    {
        if ((int) $message->conversation_id !== $conversation->id) {
            return response()->json(['message' => 'Message does not belong to this conversation.'], 422);
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted.']);
    }
}
