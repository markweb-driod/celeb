<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    public $timestamps = false; // "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" only in spec.

    protected $dates = ['created_at']; // Laravel 10+ uses casting, but for single timestamp column without updated_at, manually handling might be needed or just let Laravel handle it if timestamps=true but null updated_at.
    // Spec has only created_at. I'll use timestamps=false and manual create handling or just rely on DB default.
    // Better: public $timestamps = false; protected $casts = ['created_at' => 'datetime'];

    protected $fillable = [
        'transaction_number',
        'order_id',
        'user_id',
        'transaction_type',
        'payment_method',
        'stripe_payment_intent_id',
        'amount',
        'currency',
        'status',
        'proof_url',
        'gift_card_code',
        'payment_meta',
        'admin_note',
        'confirmed_by',
        'confirmed_at',
        'created_at',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'created_at'   => 'datetime',
        'confirmed_at' => 'datetime',
        'payment_meta' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
