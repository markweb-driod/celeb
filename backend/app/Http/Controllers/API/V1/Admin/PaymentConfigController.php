<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class PaymentConfigController extends Controller
{
    private const KEYS = [
        'gateway_mode',
        'stripe_publishable_key',
        'stripe_secret_key',
        'stripe_webhook_secret',
        'payout_schedule',
        'platform_bank_details',
        'vat_rate',
    ];

    public function show()
    {
        $config = [];

        foreach (self::KEYS as $key) {
            $config[$key] = SystemSetting::getValue('payments.' . $key);
        }

        $secret = (string) ($config['stripe_secret_key'] ?? '');

        return response()->json([
            'payment_config' => $config,
            'masked' => [
                'stripe_secret_key' => $secret === '' ? '' : str_repeat('*', max(0, strlen($secret) - 4)) . substr($secret, -4),
            ],
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'gateway_mode' => ['nullable', 'in:test,live'],
            'stripe_publishable_key' => ['nullable', 'string', 'max:255'],
            'stripe_secret_key' => ['nullable', 'string', 'max:255'],
            'stripe_webhook_secret' => ['nullable', 'string', 'max:255'],
            'payout_schedule' => ['nullable', 'in:manual,daily,weekly,monthly'],
            'platform_bank_details' => ['nullable', 'array'],
            'vat_rate' => ['nullable', 'numeric', 'between:0,100'],
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::setValue('payments.' . $key, $value);
        }

        return response()->json([
            'message' => 'Payment configuration updated successfully.',
        ]);
    }
}
