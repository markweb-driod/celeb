<?php

namespace App\Http\Controllers\API\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class PaymentConfigController extends Controller
{
    private const GENERAL_KEYS = [
        'payout_schedule',
        'platform_bank_details',
        'vat_rate',
    ];

    /**
     * Default structure for every supported payment method.
     * The 'type' field drives how the frontend renders the checkout UI.
     */
    private const METHOD_DEFAULTS = [
        'paypal'     => ['label' => 'PayPal',        'type' => 'manual',   'enabled' => false, 'email' => '',          'instructions' => 'Send the exact amount to the PayPal email shown below, then click "I Have Sent Payment".'],
        'zelle'      => ['label' => 'Zelle',          'type' => 'manual',   'enabled' => false, 'phone_or_email' => '', 'holder_name' => '', 'instructions' => 'Send via Zelle to the account shown below, then click "I Have Sent Payment".'],
        'cashapp'    => ['label' => 'Cash App',       'type' => 'manual',   'enabled' => false, 'cashtag' => '',        'instructions' => 'Send via Cash App to the $Cashtag shown below, then click "I Have Sent Payment".'],
        'venmo'      => ['label' => 'Venmo',          'type' => 'manual',   'enabled' => false, 'handle' => '',         'instructions' => 'Send via Venmo to the handle shown below, then click "I Have Sent Payment".'],
        'apple_pay'  => ['label' => 'Apple Pay',      'type' => 'manual',   'enabled' => false, 'phone' => '',          'instructions' => 'Send via Apple Pay to the phone number shown below, then click "I Have Sent Payment".'],
        'google_pay' => ['label' => 'Google Pay',     'type' => 'manual',   'enabled' => false, 'phone_or_email' => '', 'instructions' => 'Send via Google Pay to the account shown below, then click "I Have Sent Payment".'],
        'crypto_btc' => ['label' => 'Bitcoin (BTC)',  'type' => 'crypto',   'enabled' => false, 'address' => '',        'network' => 'Bitcoin',    'instructions' => 'Send BTC to the wallet address below and upload a transaction screenshot.'],
        'crypto_eth' => ['label' => 'Ethereum (ETH)', 'type' => 'crypto',   'enabled' => false, 'address' => '',        'network' => 'Ethereum',   'instructions' => 'Send ETH to the wallet address below and upload a transaction screenshot.'],
        'crypto_usdt'=> ['label' => 'USDT (TRC20)',   'type' => 'crypto',   'enabled' => false, 'address' => '',        'network' => 'USDT TRC20', 'instructions' => 'Send USDT to the wallet address below and upload a transaction screenshot.'],
        'gift_card'  => ['label' => 'Gift Card',      'type' => 'gift_card','enabled' => false, 'supported_brands' => 'Amazon, Google Play, iTunes', 'instructions' => 'Enter the gift card code and upload a clear photo of the gift card front.'],
    ];

    private function mergedMethods(): array
    {
        $stored  = SystemSetting::getValue('payments.methods') ?? [];
        $methods = [];
        foreach (self::METHOD_DEFAULTS as $key => $defaults) {
            $methods[$key] = array_merge($defaults, $stored[$key] ?? []);
        }
        return $methods;
    }

    public function show()
    {
        $config = [];
        foreach (self::GENERAL_KEYS as $key) {
            $config[$key] = SystemSetting::getValue('payments.' . $key);
        }

        return response()->json([
            'payment_config'  => $config,
            'payment_methods' => $this->mergedMethods(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'payout_schedule'       => ['nullable', 'in:manual,daily,weekly,monthly'],
            'platform_bank_details' => ['nullable', 'array'],
            'vat_rate'              => ['nullable', 'numeric', 'between:0,100'],
        ]);

        foreach ($data as $key => $value) {
            SystemSetting::setValue('payments.' . $key, $value);
        }

        return response()->json(['message' => 'Payment configuration updated.']);
    }

    public function showMethods()
    {
        return response()->json(['payment_methods' => $this->mergedMethods()]);
    }

    public function updateMethods(Request $request)
    {
        $data = $request->validate(['methods' => ['required', 'array']]);

        $stored   = SystemSetting::getValue('payments.methods') ?? [];
        $incoming = $data['methods'];

        foreach (self::METHOD_DEFAULTS as $key => $defaults) {
            if (!isset($incoming[$key])) {
                continue;
            }
            $allowedFields = array_keys($defaults);
            $sanitized     = [];
            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $incoming[$key])) {
                    $sanitized[$field] = $incoming[$key][$field];
                }
            }
            $stored[$key] = array_merge($stored[$key] ?? $defaults, $sanitized);
        }

        SystemSetting::setValue('payments.methods', $stored);

        return response()->json(['message' => 'Payment methods updated.']);
    }
}
