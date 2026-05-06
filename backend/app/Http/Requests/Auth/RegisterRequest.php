<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'user_type' => ['required', 'string', 'in:celebrity,fan'],
            
            // Celebrity specific fields
            'stage_name' => ['required_if:user_type,celebrity', 'nullable', 'string', 'max:255'],
            'category' => ['required_if:user_type,celebrity', 'nullable', 'string', 'max:255'],
            
            // Fan specific fields
            'display_name' => ['required_if:user_type,fan', 'nullable', 'string', 'max:255'],
        ];
    }
}
