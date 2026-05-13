<?php

namespace App\Http\Requests\Service;

use Illuminate\Foundation\Http\FormRequest;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $service = $this->route('service'); 
        // We will bind model route binding, but for now assuming we check ownership in controller or policy.
        return $this->user()->user_type === 'celebrity';
    }

    public function rules(): array
    {
        return [
            'category_id'      => 'sometimes|exists:service_categories,id',
            'service_type'     => 'sometimes|string|in:fan_card,video_message,private_event,birthday_performance,meet_greet,merchandise,exclusive_content,membership,shoutout,video_shoutout,live_session,meet_and_greet,birthday_surprise,custom',
            'title'            => 'sometimes|string|max:255',
            'description'      => 'sometimes|string',
            'base_price'       => 'sometimes|numeric|min:0',
            'is_digital'           => 'sometimes|boolean',
            'requires_booking'     => 'sometimes|boolean',
            'status'               => 'sometimes|in:draft,active,paused',
            'images_upload'        => 'nullable|array|max:2',
            'images_upload.*'      => 'image|mimes:jpg,jpeg,png,webp|max:2048',
            'service_video'        => 'nullable|file|mimes:mp4,mov,webm|max:51200',
            'duration_minutes'     => 'nullable|integer|min:0',
            'max_delivery_days'    => 'nullable|integer|min:1|max:365',
            'currency'             => 'nullable|string|size:3',
        ];
    }
}
