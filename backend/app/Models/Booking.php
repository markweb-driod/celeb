<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory;

    public $timestamps = false; // Spec implies no timestamps for bookings or at least I didn't add them.

    protected $fillable = [
        'order_id',
        'booking_date',
        'booking_time',
        'duration_minutes',
        'location_type',
        'location_details',
        'video_call_url',
        'booking_status',
    ];

    protected $casts = [
        'booking_date' => 'date',
        'booking_time' => 'datetime:H:i:s', // or immutable
        'location_details' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
