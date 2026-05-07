<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

class CelebrityProfile extends Model
{
    use HasFactory, Searchable;

    protected $fillable = [
        'user_id',
        'stage_name',
        'slug',
        'bio',
        'category',
        'verification_status',
        'profile_image_url',
        'cover_image_url',
        'social_links',
        'total_followers',
        'rating_average',
        'rating_count',
        'commission_rate',
        'is_featured',
        'sort_order',
    ];

    protected $casts = [
        'social_links' => 'array',
        'total_followers' => 'integer',
        'rating_average' => 'decimal:2',
        'rating_count' => 'integer',
        'commission_rate' => 'decimal:2',
        'is_featured' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function toSearchableArray()
    {
        return [
            'stage_name' => $this->stage_name,
            'bio' => $this->bio,
            'category' => $this->category,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class, 'celebrity_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'celebrity_id');
    }
}
