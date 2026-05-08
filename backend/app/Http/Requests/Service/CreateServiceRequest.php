<?php

namespace App\Http\Requests\Service;

use Illuminate\Foundation\Http\FormRequest;

class CreateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->user_type === 'celebrity';
    }

    public function rules(): array
    {
        return [
            'category_id'      => 'required|exists:service_categories,id',
            'service_type'     => 'required|string|in:fan_card,video_message,private_event,birthday_performance,meet_greet,merchandise,exclusive_content,membership,shoutout,video_shoutout,live_session,meet_and_greet,birthday_surprise,custom',
            'title'            => 'required|string|max:255',
            'description'      => 'required|string',
            'base_price'       => 'required|numeric|min:0',
            'images_upload'    => 'nullable|array|max:2',
            'images_upload.*'  => 'image|mimes:jpg,jpeg,png,webp|max:2048',
            'service_video'    => 'nullable|file|mimes:mp4,mov,webm|max:51200',
            'is_digital'       => 'boolean',
            'requires_booking' => 'boolean',
            'duration_minutes' => 'nullable|integer|min:0',
        ];
    }
}
