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
            'category_id' => 'sometimes|exists:service_categories,id',
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'base_price' => 'sometimes|numeric|min:0',
            'status' => 'sometimes|in:draft,active,paused',
            'images' => 'nullable|array|max:8',
            'images.*' => 'required|url|max:1000',
            'short_video_url' => 'nullable|url|max:1000',
            'duration_minutes' => 'nullable|integer|min:0',
        ];
    }
}
