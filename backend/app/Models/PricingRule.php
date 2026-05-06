<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingRule extends Model
{
    protected $fillable = [
        'name',
        'service_type',
        'celebrity_tier',
        'region',
        'min_price',
        'max_price',
        'commission_override',
        'priority',
        'is_active',
    ];

    protected $casts = [
        'min_price'           => 'float',
        'max_price'           => 'float',
        'commission_override' => 'float',
        'priority'            => 'integer',
        'is_active'           => 'boolean',
    ];
}
