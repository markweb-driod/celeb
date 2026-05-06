<?php
/**
 * CelebStarsHub — API Integration Test Suite
 * Run: php test_api.php
 */

$BASE = 'http://127.0.0.1:8001/api/v1';

$passed = 0;
$failed = 0;
$errors = [];

function req(string $method, string $url, array $data = [], array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

    $defaultHeaders = ['Accept: application/json', 'Content-Type: application/json'];
    foreach ($headers as $k => $v) {
        $defaultHeaders[] = "$k: $v";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $defaultHeaders);

    if (!empty($data)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err    = curl_error($ch);
    curl_close($ch);

    if ($err) {
        return ['status' => 0, 'body' => null, 'error' => $err];
    }

    return ['status' => $status, 'body' => json_decode($body, true), 'raw' => $body];
}

function test(string $label, callable $check): mixed
{
    global $passed, $failed, $errors;
    try {
        $result = $check();
        echo "\033[32m  ✓  $label\033[0m\n";
        $passed++;
        return $result;
    } catch (Throwable $e) {
        echo "\033[31m  ✗  $label\033[0m\n";
        echo "       {$e->getMessage()}\n";
        $failed++;
        $errors[] = $label;
        return null;
    }
}

function assertStatus(array $r, int $expected, string $context = ''): array
{
    if ($r['status'] !== $expected) {
        $body = is_array($r['body']) ? json_encode($r['body']) : $r['raw'];
        throw new RuntimeException("Expected HTTP $expected, got {$r['status']}. $context\nBody: $body");
    }
    return $r['body'] ?? [];
}

function assertKey(array $data, string $key): mixed
{
    // Supports dot notation: 'a.b.c'
    foreach (explode('.', $key) as $part) {
        if (!is_array($data) || !array_key_exists($part, $data)) {
            throw new RuntimeException("Missing key '$key' in: " . json_encode(array_keys($data)));
        }
        $data = $data[$part];
    }
    return $data;
}

echo "\n\033[36m╔══════════════════════════════════════════╗\033[0m\n";
echo "\033[36m║   CelebStarsHub API Test Suite           ║\033[0m\n";
echo "\033[36m╚══════════════════════════════════════════╝\033[0m\n\n";

// ─────────────────────────────────────────
echo "\033[33m1. Health & public endpoints\033[0m\n";
// ─────────────────────────────────────────

test('/up — application health', function () {
    $r = req('GET', 'http://127.0.0.1:8001/up');
    assertStatus($r, 200, '/up');
    return true;
});

$categories = test('GET /categories', function () use ($BASE) {
    $r = req('GET', "$BASE/categories");
    $d = assertStatus($r, 200);
    $cats = assertKey($d, 'categories');
    if (empty($cats)) throw new RuntimeException('No categories returned');
    echo "       " . count($cats) . " categories: " . implode(', ', array_column($cats, 'name')) . "\n";
    return $cats;
});

$celebrities = test('GET /celebrities', function () use ($BASE) {
    $r = req('GET', "$BASE/celebrities");
    $d = assertStatus($r, 200);
    $celebs = assertKey($d, 'celebrities.data');
    if (empty($celebs)) throw new RuntimeException('No celebrities returned');
    echo "       " . count($celebs) . " celebrities found\n";
    return $celebs;
});

$services = test('GET /services', function () use ($BASE) {
    $r = req('GET', "$BASE/services");
    $d = assertStatus($r, 200);
    $svcs = assertKey($d, 'services.data');
    echo "       " . count($svcs) . " services found\n";
    return $svcs;
});

if ($celebrities) {
    $slug = $celebrities[0]['slug'] ?? null;
    if ($slug) {
        test("GET /celebrities/$slug", function () use ($BASE, $slug) {
            $r = req('GET', "$BASE/celebrities/$slug");
            $d = assertStatus($r, 200);
            assertKey($d, 'celebrity.stage_name');
            return true;
        });
    }
}

// ─────────────────────────────────────────
echo "\n\033[33m2. Authentication\033[0m\n";
// ─────────────────────────────────────────

$adminToken = test('POST /auth/login (admin)', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'admin@celebstarshub.com', 'password' => 'Admin@1234']);
    $d = assertStatus($r, 200);
    $tok = assertKey($d, 'access_token');
    if (empty($tok)) throw new RuntimeException('Empty token');
    echo "       user_type=" . assertKey($d, 'user.user_type') . "\n";
    return $tok;
});

$fanToken = test('POST /auth/login (fan)', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'fan@demo.com', 'password' => 'password']);
    $d = assertStatus($r, 200);
    echo "       user_type=" . assertKey($d, 'user.user_type') . "\n";
    return assertKey($d, 'access_token');
});

$celebToken = test('POST /auth/login (celebrity)', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'celebrity@demo.com', 'password' => 'password']);
    $d = assertStatus($r, 200);
    echo "       user_type=" . assertKey($d, 'user.user_type') . "\n";
    return assertKey($d, 'access_token');
});

test('GET /auth/me (admin)', function () use ($BASE, $adminToken) {
    if (!$adminToken) throw new RuntimeException('No admin token');
    $r = req('GET', "$BASE/auth/me", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    if (assertKey($d, 'user_type') !== 'admin') throw new RuntimeException('Wrong user_type');
    return true;
});

test('GET /auth/me (fan)', function () use ($BASE, $fanToken) {
    if (!$fanToken) throw new RuntimeException('No fan token');
    $r = req('GET', "$BASE/auth/me", [], ['Authorization' => "Bearer $fanToken"]);
    $d = assertStatus($r, 200);
    if (assertKey($d, 'user_type') !== 'fan') throw new RuntimeException('Wrong user_type');
    return true;
});

test('GET /auth/me rejects unauthenticated', function () use ($BASE) {
    $r = req('GET', "$BASE/auth/me");
    assertStatus($r, 401);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m3. Celebrity profile & services\033[0m\n";
// ─────────────────────────────────────────

test('GET /celebrity/profile', function () use ($BASE, $celebToken) {
    if (!$celebToken) throw new RuntimeException('No celeb token');
    $r = req('GET', "$BASE/celebrity/profile", [], ['Authorization' => "Bearer $celebToken"]);
    $d = assertStatus($r, 200);
    assertKey($d, 'profile.stage_name');
    echo "       stage_name=" . assertKey($d, 'profile.stage_name') . "\n";
    return $d;
});

$celebServices = test('GET /celebrity/services', function () use ($BASE, $celebToken) {
    if (!$celebToken) throw new RuntimeException('No celeb token');
    $r = req('GET', "$BASE/celebrity/services", [], ['Authorization' => "Bearer $celebToken"]);
    $d = assertStatus($r, 200);
    $svcs = $d['services']['data'] ?? $d['data'] ?? [];
    echo "       " . count($svcs) . " services\n";
    return $svcs;
});

test('Fan cannot access /celebrity/services', function () use ($BASE, $fanToken) {
    if (!$fanToken) throw new RuntimeException('No fan token');
    $r = req('GET', "$BASE/celebrity/services", [], ['Authorization' => "Bearer $fanToken"]);
    assertStatus($r, 403);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m4. Fan profile\033[0m\n";
// ─────────────────────────────────────────

test('GET /fan/profile', function () use ($BASE, $fanToken) {
    if (!$fanToken) throw new RuntimeException('No fan token');
    $r = req('GET', "$BASE/fan/profile", [], ['Authorization' => "Bearer $fanToken"]);
    $d = assertStatus($r, 200);
    assertKey($d, 'profile');
    return true;
});

test('Celebrity cannot access /fan/profile', function () use ($BASE, $celebToken) {
    if (!$celebToken) throw new RuntimeException('No celeb token');
    $r = req('GET', "$BASE/fan/profile", [], ['Authorization' => "Bearer $celebToken"]);
    assertStatus($r, 403);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m5. Orders\033[0m\n";
// ─────────────────────────────────────────

$fanOrders = test('GET /orders (fan)', function () use ($BASE, $fanToken) {
    if (!$fanToken) throw new RuntimeException('No fan token');
    $r = req('GET', "$BASE/orders", [], ['Authorization' => "Bearer $fanToken"]);
    $d = assertStatus($r, 200);
    $orders = $d['orders']['data'] ?? $d['data'] ?? [];
    echo "       " . count($orders) . " orders for fan\n";
    return $orders;
});

// Find a service to order
$serviceForOrder = null;
if (!empty($services)) {
    foreach ($services as $svc) {
        if (($svc['is_active'] ?? false) && isset($svc['celebrity_id'])) {
            $serviceForOrder = $svc;
            break;
        }
    }
}

$newOrder = null;
if ($serviceForOrder) {
    $newOrder = test("POST /orders (create order for '{$serviceForOrder['title']}')", function () use ($BASE, $fanToken, $serviceForOrder) {
        $r = req('POST', "$BASE/orders", [
            'service_id' => $serviceForOrder['id'],
        ], ['Authorization' => "Bearer $fanToken"]);
        $d = assertStatus($r, 201);
        $ord = $d['order'] ?? $d;
        echo "       order_number=" . ($ord['order_number'] ?? 'n/a') . "  status=" . ($ord['status'] ?? 'n/a') . "  total=\$" . ($ord['total_amount'] ?? '0') . "\n";
        return $ord;
    });
} else {
    echo "  \033[90m-  POST /orders (skipped — no active service found)\033[0m\n";
}

// Payment intent
if ($newOrder && !empty($newOrder['id'])) {
    $orderId = $newOrder['id'];

    test("POST /orders/$orderId/payment-intent", function () use ($BASE, $fanToken, $orderId) {
        $r = req('POST', "$BASE/orders/$orderId/payment-intent", [], ['Authorization' => "Bearer $fanToken"]);
        if ($r['status'] === 422) {
            // Stripe keys not configured — expected in dev
            $msg = $r['body']['message'] ?? '';
            echo "       [expected in dev, Stripe not configured] $msg\n";
            return 'skipped';
        }
        if ($r['status'] === 200 || $r['status'] === 201) {
            $ci = $r['body']['client_secret'] ?? $r['body']['payment_intent'] ?? null;
            echo "       client_secret=" . ($ci ? substr($ci, 0, 20) . '...' : 'n/a') . "\n";
            return $ci;
        }
        assertStatus($r, 200);
        return null;
    });
}

// ─────────────────────────────────────────
echo "\n\033[33m6. Admin — users\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/users', function () use ($BASE, $adminToken) {
    if (!$adminToken) throw new RuntimeException('No admin token');
    $r = req('GET', "$BASE/admin/users", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $users = assertKey($d, 'users.data');
    echo "       " . count($users) . " users total\n";
    return $users;
});

test('GET /admin/users?q= search', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/users?q=fan", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    return true;
});

test('Fan cannot access /admin/users', function () use ($BASE, $fanToken) {
    $r = req('GET', "$BASE/admin/users", [], ['Authorization' => "Bearer $fanToken"]);
    assertStatus($r, 403);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m7. Admin — celebrity management (NEW)\033[0m\n";
// ─────────────────────────────────────────

$adminCelebs = test('GET /admin/celebrities', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/celebrities", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $celebs = assertKey($d, 'celebrities.data');
    echo "       " . count($celebs) . " celebrities\n";
    return $celebs;
});

if ($adminCelebs) {
    $firstCeleb = $adminCelebs[0];
    $cid = $firstCeleb['id'];

    test("GET /admin/celebrities/$cid", function () use ($BASE, $adminToken, $cid) {
        $r = req('GET', "$BASE/admin/celebrities/$cid", [], ['Authorization' => "Bearer $adminToken"]);
        $d = assertStatus($r, 200);
        assertKey($d, 'celebrity.stage_name');
        echo "       stage_name=" . assertKey($d, 'celebrity.stage_name') . "  recent_orders=" . count($d['recent_orders'] ?? []) . "\n";
        return true;
    });

    test("PATCH /admin/celebrities/$cid — set is_featured", function () use ($BASE, $adminToken, $cid, $firstCeleb) {
        $current = (bool) ($firstCeleb['is_featured'] ?? false);
        $r = req('PATCH', "$BASE/admin/celebrities/$cid", ['is_featured' => !$current], ['Authorization' => "Bearer $adminToken"]);
        $d = assertStatus($r, 200);
        assertKey($d, 'message');
        // Restore
        req('PATCH', "$BASE/admin/celebrities/$cid", ['is_featured' => $current], ['Authorization' => "Bearer $adminToken"]);
        return true;
    });

    test("PATCH /admin/celebrities/$cid — commission_rate", function () use ($BASE, $adminToken, $cid) {
        $r = req('PATCH', "$BASE/admin/celebrities/$cid", ['commission_rate' => 18.5], ['Authorization' => "Bearer $adminToken"]);
        $d = assertStatus($r, 200);
        assertKey($d, 'message');
        req('PATCH', "$BASE/admin/celebrities/$cid", ['commission_rate' => 15.0], ['Authorization' => "Bearer $adminToken"]);
        return true;
    });

    test("PATCH /admin/celebrities/$cid — verification_status", function () use ($BASE, $adminToken, $cid) {
        $r = req('PATCH', "$BASE/admin/celebrities/$cid", ['verification_status' => 'verified'], ['Authorization' => "Bearer $adminToken"]);
        $d = assertStatus($r, 200);
        assertKey($d, 'message');
        // Restore
        req('PATCH', "$BASE/admin/celebrities/$cid", ['verification_status' => 'pending'], ['Authorization' => "Bearer $adminToken"]);
        return true;
    });
}

// ─────────────────────────────────────────
echo "\n\033[33m8. Admin — fan management (NEW)\033[0m\n";
// ─────────────────────────────────────────

$adminFans = test('GET /admin/fans', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/fans", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $fans = assertKey($d, 'fans.data');
    echo "       " . count($fans) . " fans\n";
    return $fans;
});

if ($adminFans) {
    $fid = $adminFans[0]['id'];
    test("GET /admin/fans/$fid", function () use ($BASE, $adminToken, $fid) {
        $r = req('GET', "$BASE/admin/fans/$fid", [], ['Authorization' => "Bearer $adminToken"]);
        $d = assertStatus($r, 200);
        assertKey($d, 'fan');
        return true;
    });
}

// ─────────────────────────────────────────
echo "\n\033[33m9. Admin — transactions & payouts (NEW)\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/transactions', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/transactions", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $txs = assertKey($d, 'transactions.data');
    $summary = assertKey($d, 'summary');
    echo "       " . count($txs) . " transactions  total_payments=\$" . number_format($summary['total_payments'], 2) . "  refunds=\$" . number_format($summary['total_refunds'], 2) . "\n";
    return true;
});

test('GET /admin/transactions?transaction_type=payment', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/transactions?transaction_type=payment", [], ['Authorization' => "Bearer $adminToken"]);
    assertStatus($r, 200);
    return true;
});

test('GET /admin/payouts', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/payouts", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $payouts = assertKey($d, 'payouts.data');
    $summary = assertKey($d, 'payout_summary');
    echo "       " . count($payouts) . " payouts  total_gross=\$" . number_format($summary['total_gross'], 2) . "\n";
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m10. Admin — analytics (NEW)\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/analytics', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/analytics", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $kpis = assertKey($d, 'kpis');
    $monthly = assertKey($d, 'monthly');
    assertKey($d, 'top_celebrities');
    assertKey($d, 'top_categories');
    assertKey($d, 'orders_by_status');
    echo "       kpis: total_users={$kpis['total_users']} net_revenue=\${$kpis['net_revenue']} conversion={$kpis['conversion_rate']}%  monthly_months=" . count($monthly) . "\n";
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m11. Admin — audit log (NEW)\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/audit', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/audit", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $logs = assertKey($d, 'logs');
    echo "       " . count($logs) . " audit entries\n";
    if (!empty($logs)) {
        echo "       recent: [{$logs[0]['category']}] {$logs[0]['label']}\n";
    }
    return true;
});

test('GET /admin/audit?type=user', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/audit?type=user", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $logs = $d['logs'] ?? [];
    foreach ($logs as $log) {
        if ($log['category'] !== 'user') throw new RuntimeException("Expected only user logs but got {$log['category']}");
    }
    return true;
});

test('GET /admin/audit?type=transaction', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/audit?type=transaction", [], ['Authorization' => "Bearer $adminToken"]);
    assertStatus($r, 200);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m12. Admin — pricing & payments config\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/pricing', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/pricing", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $defaults = assertKey($d, 'defaults');
    echo "       commission={$defaults['platform_commission_rate']}%  sub_price=\${$defaults['default_subscription_price']}\n";
    return true;
});

test('GET /admin/pricing/rules', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/pricing/rules", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    echo "       " . count($d['rules'] ?? []) . " pricing rules\n";
    return true;
});

test('GET /admin/payments/config', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/payments/config", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $cfg = assertKey($d, 'payment_config');
    echo "       gateway_mode=" . ($cfg['gateway_mode'] ?? 'n/a') . "  payout_schedule=" . ($cfg['payout_schedule'] ?? 'n/a') . "\n";
    return true;
});

test('PUT /admin/pricing/defaults', function () use ($BASE, $adminToken) {
    $r = req('PUT', "$BASE/admin/pricing/defaults", [
        'platform_commission_rate'   => 15,
        'default_subscription_price' => 19.99,
        'default_fan_card_price'     => 9.99,
        'default_currency'           => 'USD',
    ], ['Authorization' => "Bearer $adminToken"]);
    assertStatus($r, 200);
    return true;
});

test('PUT /admin/payments/config', function () use ($BASE, $adminToken) {
    $r = req('PUT', "$BASE/admin/payments/config", [
        'gateway_mode'    => 'test',
        'payout_schedule' => 'weekly',
        'vat_rate'        => 0,
    ], ['Authorization' => "Bearer $adminToken"]);
    assertStatus($r, 200);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m13. Admin — CMS\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/cms/content', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/cms/content", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    assertKey($d, 'content');
    return true;
});

test('PUT /admin/cms/content', function () use ($BASE, $adminToken) {
    $r = req('PUT', "$BASE/admin/cms/content", [
        'home_hero_title'    => 'Book Your Favourite Celebrity',
        'home_hero_subtitle' => 'Personalised videos, shoutouts and more.',
        'site_support_email' => 'support@celebstarshub.com',
    ], ['Authorization' => "Bearer $adminToken"]);
    assertStatus($r, 200);
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m14. Admin — monitoring\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/monitoring', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/monitoring", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    echo "       env=" . ($d['system']['app_env'] ?? '?') . "  db=" . ($d['health']['database_ok'] ? 'ok' : 'ERROR') . "  jobs_pending=" . ($d['health']['jobs_pending'] ?? 0) . "  failed=" . ($d['health']['jobs_failed'] ?? 0) . "\n";
    return true;
});

// ─────────────────────────────────────────
echo "\n\033[33m15. Admin — chats supervision\033[0m\n";
// ─────────────────────────────────────────

test('GET /admin/chats', function () use ($BASE, $adminToken) {
    $r = req('GET', "$BASE/admin/chats", [], ['Authorization' => "Bearer $adminToken"]);
    $d = assertStatus($r, 200);
    $convs = $d['conversations']['data'] ?? [];
    echo "       " . count($convs) . " conversations\n";
    return $convs;
});

// ─────────────────────────────────────────
echo "\n\033[33m16. Security — role enforcement\033[0m\n";
// ─────────────────────────────────────────

$secTests = [
    ['fan cannot GET /admin/overview',         'GET', '/admin/overview',    $fanToken],
    ['fan cannot GET /admin/analytics',        'GET', '/admin/analytics',   $fanToken],
    ['fan cannot GET /admin/transactions',     'GET', '/admin/transactions', $fanToken],
    ['fan cannot GET /admin/audit',            'GET', '/admin/audit',       $fanToken],
    ['fan cannot GET /admin/celebrities',      'GET', '/admin/celebrities', $fanToken],
    ['fan cannot GET /admin/fans',             'GET', '/admin/fans',        $fanToken],
    ['celeb cannot GET /admin/overview',       'GET', '/admin/overview',    $celebToken],
    ['celeb cannot PUT /admin/pricing/defaults','PUT','/admin/pricing/defaults',$celebToken],
    ['unauth cannot GET /admin/overview',      'GET', '/admin/overview',    null],
];

foreach ($secTests as [$label, $method, $path, $tok]) {
    test($label, function () use ($BASE, $method, $path, $tok) {
        $headers = $tok ? ['Authorization' => "Bearer $tok"] : [];
        $r = req($method, "$BASE$path", [], $headers);
        if ($r['status'] === 403 || $r['status'] === 401) return true;
        throw new RuntimeException("Expected 401/403 but got {$r['status']}");
    });
}

// ─────────────────────────────────────────
echo "\n\033[33m17. Registration\033[0m\n";
// ─────────────────────────────────────────

$testEmail = 'testfan_' . time() . '@example.com';
test('POST /auth/register (fan)', function () use ($BASE, $testEmail) {
    $r = req('POST', "$BASE/auth/register", [
        'email'                 => $testEmail,
        'password'              => 'Test@12345',
        'password_confirmation' => 'Test@12345',
        'user_type'             => 'fan',
        'display_name'          => 'Test Fan User',
    ]);
    $d = assertStatus($r, 201);
    assertKey($d, 'access_token');
    echo "       registered: $testEmail\n";
    return true;
});

test('POST /auth/register — duplicate email rejected', function () use ($BASE, $testEmail) {
    $r = req('POST', "$BASE/auth/register", [
        'email'                 => $testEmail,
        'password'              => 'Test@12345',
        'password_confirmation' => 'Test@12345',
        'user_type'             => 'fan',
    ]);
    assertStatus($r, 422);
    return true;
});

test('POST /auth/login — wrong password rejected', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'fan@demo.com', 'password' => 'wrongpassword']);
    assertStatus($r, 422);
    return true;
});

// ─────────────────────────────────────────
echo "\n" . str_repeat('─', 46) . "\n";
$total = $passed + $failed;
echo "\033[1mResults: $passed/$total passed\033[0m";
if ($failed > 0) {
    echo " \033[31m($failed failed)\033[0m\n";
    echo "\nFailed tests:\n";
    foreach ($errors as $e) echo "  • $e\n";
} else {
    echo " \033[32m— all passed ✓\033[0m\n";
}
echo str_repeat('─', 46) . "\n\n";

exit($failed > 0 ? 1 : 0);
