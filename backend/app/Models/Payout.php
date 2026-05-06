<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payout extends Model
{
    use HasFactory;

    public $timestamps = false; 

    protected $fillable = [
        'payout_number',
        'celebrity_id',
        'gross_amount',
        'platform_fees',
        'net_amount',
        'status',
        'stripe_payout_id',
        'created_at',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:2',
        'platform_fees' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function celebrity(): BelongsTo
    {
        return $this->belongsTo(CelebrityProfile::class, 'celebrity_id');
    }
}
