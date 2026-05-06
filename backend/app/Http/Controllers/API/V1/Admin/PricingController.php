<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\PricingRule;
use App\Models\Service;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class PricingController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'service_type' => ['nullable', 'string', 'max:50'],
            'per_page' => ['nullable', 'integer', 'between:5,100'],
        ]);

        $services = Service::query()
            ->with('celebrity:id,stage_name')
            ->when($validated['service_type'] ?? null, fn ($query, $serviceType) => $query->where('service_type', $serviceType))
            ->when($validated['q'] ?? null, function ($query, $q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('title', 'like', '%' . $q . '%')
                        ->orWhere('description', 'like', '%' . $q . '%');
                });
            })
            ->latest('id')
            ->paginate((int) ($validated['per_page'] ?? 20));

        $defaults = [
            'platform_commission_rate' => (float) SystemSetting::getValue('pricing.platform_commission_rate', 15),
            'default_subscription_price' => (float) SystemSetting::getValue('pricing.default_subscription_price', 19.99),
            'default_fan_card_price' => (float) SystemSetting::getValue('pricing.default_fan_card_price', 9.99),
            'default_currency' => (string) SystemSetting::getValue('pricing.default_currency', 'USD'),
        ];

        return response()->json([
            'defaults' => $defaults,
            'services' => $services,
        ]);
    }

    public function updateDefaults(Request $request)
    {
        $data = $request->validate([
            'platform_commission_rate' => ['nullable', 'numeric', 'between:0,100'],
            'default_subscription_price' => ['nullable', 'numeric', 'min:0'],
            'default_fan_card_price' => ['nullable', 'numeric', 'min:0'],
            'default_currency' => ['nullable', 'string', 'size:3'],
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::setValue('pricing.' . $key, $value);
        }

        return response()->json([
            'message' => 'Default pricing updated successfully.',
        ]);
    }

    public function updateServicePrice(Request $request, Service $service)
    {
        $data = $request->validate([
            'base_price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'status' => ['nullable', 'in:draft,active,paused'],
        ]);

        $service->update($data);

        return response()->json([
            'message' => 'Service pricing updated successfully.',
            'service' => $service,
        ]);
    }

    // ── Pricing Rules Engine ──────────────────────────────────────────────────

    public function rules()
    {
        $rules = PricingRule::query()
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get();

        return response()->json(['rules' => $rules]);
    }

    public function storeRule(Request $request)
    {
        $data = $request->validate([
            'name'                => ['required', 'string', 'max:120'],
            'service_type'        => ['nullable', 'string', 'max:50'],
            'celebrity_tier'      => ['nullable', 'string', 'in:rising,established,superstar'],
            'region'              => ['nullable', 'string', 'max:2'],
            'min_price'           => ['nullable', 'numeric', 'min:0'],
            'max_price'           => ['nullable', 'numeric', 'min:0'],
            'commission_override' => ['nullable', 'numeric', 'between:0,100'],
            'priority'            => ['nullable', 'integer', 'min:0'],
            'is_active'           => ['nullable', 'boolean'],
        ]);

        $rule = PricingRule::create($data);

        return response()->json(['message' => 'Pricing rule created.', 'rule' => $rule], 201);
    }

    public function updateRule(Request $request, PricingRule $rule)
    {
        $data = $request->validate([
            'name'                => ['sometimes', 'string', 'max:120'],
            'service_type'        => ['nullable', 'string', 'max:50'],
            'celebrity_tier'      => ['nullable', 'string', 'in:rising,established,superstar'],
            'region'              => ['nullable', 'string', 'max:2'],
            'min_price'           => ['nullable', 'numeric', 'min:0'],
            'max_price'           => ['nullable', 'numeric', 'min:0'],
            'commission_override' => ['nullable', 'numeric', 'between:0,100'],
            'priority'            => ['nullable', 'integer', 'min:0'],
            'is_active'           => ['nullable', 'boolean'],
        ]);

        $rule->update($data);

        return response()->json(['message' => 'Pricing rule updated.', 'rule' => $rule->fresh()]);
    }

    public function deleteRule(PricingRule $rule)
    {
        $rule->delete();

        return response()->json(['message' => 'Pricing rule deleted.']);
    }
}
