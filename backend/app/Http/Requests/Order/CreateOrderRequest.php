<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->user_type === 'fan';
    }

    public function rules(): array
    {
        return [
            'service_id' => 'required|exists:services,id',
            'customization_data' => 'required|array',
            'booking_date' => 'required_if:requires_booking,true|date|after:today',
            'booking_time' => 'required_if:requires_booking,true',
        ];
    }
}
