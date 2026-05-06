<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'email',
        'password_hash',
        'user_type',
        'status',
        'two_factor_secret',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
        'two_factor_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password_hash' => 'hashed',
        ];
    }

    public function getAuthPasswordName()
    {
        return 'password_hash';
    }

    public function celebrityProfile()
    {
        return $this->hasOne(CelebrityProfile::class);
    }

    public function fanProfile()
    {
        return $this->hasOne(FanProfile::class);
    }
}
