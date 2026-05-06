<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'fan_id',
        'celebrity_id',
        'service_id',
        'status',
        'subtotal',
        'platform_fee',
        'total_amount',
        'currency',
        'customization_data',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'customization_data' => 'array',
    ];

    public function fan(): BelongsTo
    {
        return $this->belongsTo(FanProfile::class, 'fan_id');
    }

    public function celebrity(): BelongsTo
    {
        return $this->belongsTo(CelebrityProfile::class, 'celebrity_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function booking(): HasOne
    {
        return $this->hasOne(Booking::class);
    }

    public function transaction(): HasOne
    {
        return $this->hasOne(Transaction::class); // usually one payment transaction per order initially
    }

    public function conversation(): HasOne
    {
        return $this->hasOne(Conversation::class);
    }
}
