<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

class Service extends Model
{
    use HasFactory, Searchable;

    protected $fillable = [
        'celebrity_id',
        'category_id',
        'service_type',
        'title',
        'slug',
        'description',
        'images',
        'short_video_url',
        'base_price',
        'currency',
        'pricing_type',
        'is_digital',
        'requires_booking',
        'max_delivery_days',
        'duration_minutes',
        'status',
        'total_sold',
        'view_count',
    ];

    protected $casts = [
        'images' => 'array',
        'short_video_url' => 'string',
        'base_price' => 'decimal:2',
        'is_digital' => 'boolean',
        'requires_booking' => 'boolean',
        'total_sold' => 'integer',
        'view_count' => 'integer',
    ];

    public function toSearchableArray()
    {
        return [
            'title' => $this->title,
            'description' => $this->description,
        ];
    }

    public function celebrity(): BelongsTo
    {
        return $this->belongsTo(CelebrityProfile::class, 'celebrity_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
