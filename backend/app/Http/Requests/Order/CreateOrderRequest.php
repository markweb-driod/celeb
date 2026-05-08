<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Service;
use Illuminate\Validation\Validator;

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
            'booking_date' => 'nullable|date|after:today',
            'booking_time' => 'nullable',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $serviceId = (int) $this->input('service_id');
            if ($serviceId <= 0) {
                return;
            }

            $service = Service::find($serviceId);
            if (! $service || ! $service->requires_booking) {
                return;
            }

            if (! $this->filled('booking_date')) {
                $validator->errors()->add('booking_date', 'Booking date is required for this service.');
            }

            if (! $this->filled('booking_time')) {
                $validator->errors()->add('booking_time', 'Booking time is required for this service.');
            }
        });
    }
}
