<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'service_id',
        'celebrity_id',
        'reviewer_id',
        'rating',
        'title',
        'comment',
        'status',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function celebrity(): BelongsTo
    {
        return $this->belongsTo(CelebrityProfile::class, 'celebrity_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(FanProfile::class, 'reviewer_id');
    }
}
