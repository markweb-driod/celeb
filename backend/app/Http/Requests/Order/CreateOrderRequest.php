<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Service;

class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->user_type === 'fan';
    }

    public function rules(): array
    {
        $serviceRequiresBooking = function (): bool {
            $serviceId = (int) $this->input('service_id');
            if ($serviceId <= 0) {
                return false;
            }

            $service = Service::find($serviceId);
            return (bool) ($service?->requires_booking);
        };

        return [
            'service_id' => 'required|exists:services,id',
            'customization_data' => 'required|array',
            'booking_date' => [Rule::requiredIf($serviceRequiresBooking), 'date', 'after:today'],
            'booking_time' => [Rule::requiredIf($serviceRequiresBooking)],
        ];
    }
}
