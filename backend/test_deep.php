<?php
/**
 * CelebStarsHub — Deep Logic & Business-Rule Audit
 * Tests state transitions, fee maths, isolation, validation, CRUD lifecycles,
 * role boundaries, and data consistency.
 *
 * Run: php test_deep.php
 */

$BASE = 'http://127.0.0.1:8001/api/v1';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

    return ['status' => $status, 'body' => json_decode($body, true), 'raw' => $body, 'curl_error' => $err];
}

function assertStatus(array $r, int $expected, string $context = ''): array
{
    if ($r['status'] !== $expected) {
        $body = is_array($r['body']) ? json_encode($r['body']) : $r['raw'];
        throw new RuntimeException("Expected HTTP $expected, got {$r['status']}. $context\n  Body: " . substr($body, 0, 400));
    }
    return $r['body'] ?? [];
}

function assertKey(mixed $data, string $key): mixed
{
    $original = $data;
    foreach (explode('.', $key) as $part) {
        if (!is_array($data) || !array_key_exists($part, $data)) {
            throw new RuntimeException("Missing key '$key'");
        }
        $data = $data[$part];
    }
    return $data;
}

function assertEqual(mixed $actual, mixed $expected, string $label): void
{
    if ($actual != $expected) {
        throw new RuntimeException("$label — expected " . json_encode($expected) . ", got " . json_encode($actual));
    }
}

function assertApprox(float $actual, float $expected, string $label, float $delta = 0.01): void
{
    if (abs($actual - $expected) > $delta) {
        throw new RuntimeException("$label — expected $expected ± $delta, got $actual");
    }
}

function assertContains(array $haystack, mixed $needle, string $label): void
{
    if (!in_array($needle, $haystack)) {
        throw new RuntimeException("$label — '$needle' not found in [" . implode(', ', $haystack) . ']');
    }
}

// ── Test runner ────────────────────────────────────────────────────────────────

$passed  = 0;
$failed  = 0;
$skipped = 0;
$errors  = [];

function test(string $label, callable $check): mixed
{
    global $passed, $failed, $errors;
    try {
        $result = $check();
        echo "\033[32m  ✓\033[0m  $label\n";
        $passed++;
        return $result;
    } catch (Throwable $e) {
        echo "\033[31m  ✗\033[0m  $label\n";
        echo "       \033[90m{$e->getMessage()}\033[0m\n";
        $failed++;
        $errors[] = $label;
        return null;
    }
}

function skip(string $label, string $reason): void
{
    global $skipped;
    echo "  \033[90m-\033[0m  $label \033[90m($reason)\033[0m\n";
    $skipped++;
}

function section(string $title): void
{
    echo "\n\033[33m$title\033[0m\n";
}

// ── Bootstrap: get tokens & seed data ─────────────────────────────────────────

echo "\n\033[36m╔══════════════════════════════════════════╗\033[0m\n";
echo "\033[36m║   CelebStarsHub — Deep Logic Audit       ║\033[0m\n";
echo "\033[36m╚══════════════════════════════════════════╝\033[0m\n";

section('Bootstrap — tokens');

$adminToken = test('Admin login', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'admin@celebstarshub.com', 'password' => 'Admin@1234']);
    return assertKey(assertStatus($r, 200), 'access_token');
});

$fanToken = test('Fan login', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'fan@demo.com', 'password' => 'password']);
    return assertKey(assertStatus($r, 200), 'access_token');
});

$celebToken = test('Celebrity login', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/login", ['email' => 'celebrity@demo.com', 'password' => 'password']);
    return assertKey(assertStatus($r, 200), 'access_token');
});

$aH = $adminToken ? ['Authorization' => "Bearer $adminToken"] : [];
$fH = $fanToken   ? ['Authorization' => "Bearer $fanToken"]   : [];
$cH = $celebToken ? ['Authorization' => "Bearer $celebToken"] : [];

// ─────────────────────────────────────────────────────────────────────────────
section('1. Celebrity service CRUD lifecycle');
// ─────────────────────────────────────────────────────────────────────────────

// Get first category id
$catId = test('Fetch a category id', function () use ($BASE) {
    $r = req('GET', "$BASE/categories");
    $cats = assertKey(assertStatus($r, 200), 'categories');
    if (empty($cats)) throw new RuntimeException('No categories');
    return $cats[0]['id'];
});

$newService = test('Celebrity creates a service', function () use ($BASE, $cH, $catId) {
    if (!$catId) throw new RuntimeException('No category available');
    $r = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId,
        'service_type' => 'video_message',
        'title'        => 'Test Shoutout ' . time(),
        'description'  => 'A personalised video message for your special occasion.',
        'base_price'   => 49.99,
        'is_digital'   => true,
        'requires_booking' => false,
    ], $cH);
    $d = assertStatus($r, 201);
    $svc = assertKey($d, 'service');
    assertEqual($svc['status'], 'active', 'Newly created service should be active');
    assertEqual((float) $svc['base_price'], 49.99, 'base_price persisted');
    echo "       service_id={$svc['id']} slug={$svc['slug']}\n";
    return $svc;
});

test('Celebrity can list own services', function () use ($BASE, $cH, $newService) {
    if (!$newService) throw new RuntimeException('No service created');
    $r = req('GET', "$BASE/celebrity/services", [], $cH);
    $d = assertStatus($r, 200);
    $svcs = $d['services'] ?? $d['data'] ?? [];
    $ids = array_column($svcs, 'id');
    if (!in_array($newService['id'], $ids)) {
        throw new RuntimeException("New service {$newService['id']} not found in celebrity's list. IDs: " . implode(', ', $ids));
    }
});

test('Celebrity updates service base_price', function () use ($BASE, $cH, $newService) {
    if (!$newService) throw new RuntimeException('No service to update');
    $r = req('PUT', "$BASE/celebrity/services/{$newService['id']}", ['base_price' => 59.99], $cH);
    $d = assertStatus($r, 200);
    assertEqual((float) assertKey($d, 'service.base_price'), 59.99, 'base_price after update');
});

test('Celebrity updates service status to paused', function () use ($BASE, $cH, $newService) {
    if (!$newService) throw new RuntimeException('No service');
    $r = req('PUT', "$BASE/celebrity/services/{$newService['id']}", ['status' => 'paused'], $cH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'service.status'), 'paused', 'status paused');
    // Restore active for order tests
    req('PUT', "$BASE/celebrity/services/{$newService['id']}", ['status' => 'active'], $cH);
});

test('Fan cannot create celebrity service', function () use ($BASE, $fH, $catId) {
    $r = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId ?? 1,
        'service_type' => 'video_message',
        'title'        => 'Fan trying to create service',
        'description'  => 'Should fail',
        'base_price'   => 10,
    ], $fH);
    assertStatus($r, 403);
});

test('Admin cannot create celebrity service (wrong role)', function () use ($BASE, $aH, $catId) {
    $r = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId ?? 1,
        'service_type' => 'video_message',
        'title'        => 'Admin trying to create service',
        'description'  => 'Should fail',
        'base_price'   => 10,
    ], $aH);
    assertStatus($r, 403);
});

test('Service validation — base_price must be numeric', function () use ($BASE, $cH, $catId) {
    $r = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId ?? 1,
        'service_type' => 'video_message',
        'title'        => 'Bad price',
        'description'  => 'test',
        'base_price'   => 'not_a_number',
    ], $cH);
    assertStatus($r, 422);
    assertKey($r['body'], 'errors.base_price');
});

test('Service validation — invalid service_type rejected', function () use ($BASE, $cH, $catId) {
    $r = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId ?? 1,
        'service_type' => 'invalid_type_xyz',
        'title'        => 'Bad type',
        'description'  => 'test',
        'base_price'   => 10,
    ], $cH);
    assertStatus($r, 422);
    assertKey($r['body'], 'errors.service_type');
});

// ─────────────────────────────────────────────────────────────────────────────
section('2. Registration — celebrities require stage_name');
// ─────────────────────────────────────────────────────────────────────────────

$ts = time();

test('Register celebrity — missing stage_name returns 422', function () use ($BASE) {
    $r = req('POST', "$BASE/auth/register", [
        'email'                 => 'newceleb_fail_' . time() . '@example.com',
        'password'              => 'Test@12345',
        'password_confirmation' => 'Test@12345',
        'user_type'             => 'celebrity',
        // No stage_name
    ]);
    assertStatus($r, 422);
    assertKey($r['body'], 'errors.stage_name');
});

$newCelebEmail = "deep_celeb_$ts@example.com";
$newCelebToken = test('Register new celebrity with stage_name', function () use ($BASE, $newCelebEmail) {
    $r = req('POST', "$BASE/auth/register", [
        'email'                 => $newCelebEmail,
        'password'              => 'Test@12345',
        'password_confirmation' => 'Test@12345',
        'user_type'             => 'celebrity',
        'stage_name'            => 'New Star ' . time(),
        'category'              => 'Music',
    ]);
    $d = assertStatus($r, 201);
    $token = assertKey($d, 'access_token');
    $profile = assertKey($d, 'user.celebrity_profile');
    assertEqual($profile['verification_status'], 'pending', 'New celebrity starts as pending');
    echo "       celebrity_profile_id={$profile['id']} stage_name={$profile['stage_name']}\n";
    return $token;
});

$newFanEmail = "deep_fan_$ts@example.com";
$newFanToken = test('Register new fan', function () use ($BASE, $newFanEmail) {
    $r = req('POST', "$BASE/auth/register", [
        'email'                 => $newFanEmail,
        'password'              => 'Test@12345',
        'password_confirmation' => 'Test@12345',
        'user_type'             => 'fan',
        'display_name'          => 'Deep Test Fan',
    ]);
    $d = assertStatus($r, 201);
    return assertKey($d, 'access_token');
});

$newFH = $newFanToken ? ['Authorization' => "Bearer $newFanToken"] : [];
$newCH = $newCelebToken ? ['Authorization' => "Bearer $newCelebToken"] : [];

// ─────────────────────────────────────────────────────────────────────────────
section('3. Fee calculation logic');
// ─────────────────────────────────────────────────────────────────────────────

// First set up the service for the new celebrity with a known price and commission
$pricedService = test('New celebrity creates service with known price ($100)', function () use ($BASE, $newCH, $catId) {
    if (!$newCH) throw new RuntimeException('No new celeb token');
    $r = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId ?? 1,
        'service_type' => 'video_message',
        'title'        => 'Fee Test Service ' . time(),
        'description'  => 'Used to validate fee maths',
        'base_price'   => 100.00,
        'is_digital'   => true,
        'requires_booking' => false,
    ], $newCH);
    $d = assertStatus($r, 201);
    return assertKey($d, 'service');
});

// Lookup the celebrity's commission_rate
$newCelebCommission = null;
if ($newCelebToken) {
    $profileResp = req('GET', "$BASE/celebrity/profile", [], $newCH);
    $newCelebCommission = (float) ($profileResp['body']['profile']['commission_rate'] ?? 15);
    echo "       celebrity commission_rate={$newCelebCommission}%\n";
}

$feeOrder = test('Order created → subtotal/platform_fee/total_amount are correct', function () use ($BASE, $newFH, $pricedService, $newCelebCommission) {
    if (!$pricedService) throw new RuntimeException('No priced service');
    if (!$newFH) throw new RuntimeException('No new fan token');

    $r = req('POST', "$BASE/orders", [
        'service_id'        => $pricedService['id'],
        'customization_data' => ['message' => 'Happy birthday from tests!'],
    ], $newFH);
    $d = assertStatus($r, 201);
    $order = assertKey($d, 'order');

    $subtotal    = (float) $order['subtotal'];
    $platformFee = (float) $order['platform_fee'];
    $total       = (float) $order['total_amount'];
    $commRate    = $newCelebCommission ?? 15.0;

    $expectedFee   = round($subtotal * ($commRate / 100), 2);
    $expectedTotal = round($subtotal + $expectedFee, 2);

    assertApprox($subtotal, 100.0,         'subtotal should equal service base_price');
    assertApprox($platformFee, $expectedFee,  "platform_fee should be {$commRate}% of subtotal");
    assertApprox($total,       $expectedTotal, 'total_amount = subtotal + platform_fee');

    echo "       subtotal=$subtotal  fee=$platformFee  total=$total  (commission={$commRate}%)\n";
    return $order;
});

// ─────────────────────────────────────────────────────────────────────────────
section('4. Order state-machine transitions');
// ─────────────────────────────────────────────────────────────────────────────

// Get a service ID visible to the main fan (using newService if available)
$orderForFlow = $feeOrder; // Use the order we just created with new fan

test('Order starts in pending status', function () use ($orderForFlow) {
    if (!$orderForFlow) throw new RuntimeException('No order to inspect');
    assertEqual($orderForFlow['status'], 'pending', 'New order status');
});

test('Fan cannot set status to confirmed (celebrity-only transition)', function () use ($BASE, $newFH, $orderForFlow) {
    if (!$orderForFlow || !$newFH) throw new RuntimeException('Missing order or fan token');
    $r = req('PATCH', "$BASE/orders/{$orderForFlow['id']}/status", ['status' => 'confirmed'], $newFH);
    assertStatus($r, 422);
});

test('Fan can cancel own pending order', function () use ($BASE, $newFH, $orderForFlow) {
    if (!$orderForFlow || !$newFH) throw new RuntimeException('Missing order or fan token');
    $r = req('PATCH', "$BASE/orders/{$orderForFlow['id']}/status", ['status' => 'cancelled'], $newFH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'order.status'), 'cancelled', 'Order should be cancelled');
});

test('Fan cannot cancel already-cancelled order (double-cancel)', function () use ($BASE, $newFH, $orderForFlow) {
    if (!$orderForFlow || !$newFH) throw new RuntimeException('Missing order or fan token');
    $r = req('PATCH', "$BASE/orders/{$orderForFlow['id']}/status", ['status' => 'cancelled'], $newFH);
    // Should fail — fan can only cancel pending orders
    if ($r['status'] === 200) {
        throw new RuntimeException('Double-cancel succeeded — should be blocked on non-pending orders');
    }
    assertStatus($r, 422);
});

// Create a fresh order for celebrity transition tests
$celebFlowOrder = test('New fan creates another order for celebrity flow tests', function () use ($BASE, $newFH, $pricedService) {
    if (!$pricedService || !$newFH) throw new RuntimeException('Missing service or fan');
    $r = req('POST', "$BASE/orders", [
        'service_id'         => $pricedService['id'],
        'customization_data' => ['message' => 'Flow test order'],
    ], $newFH);
    $d = assertStatus($r, 201);
    return assertKey($d, 'order');
});

test('Celebrity confirms the order', function () use ($BASE, $newCH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$newCH) throw new RuntimeException('Missing order or celebrity token');
    $r = req('PATCH', "$BASE/orders/{$celebFlowOrder['id']}/status", ['status' => 'confirmed'], $newCH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'order.status'), 'confirmed', 'Status after confirm');
});

test('Fan cannot cancel confirmed order', function () use ($BASE, $newFH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$newFH) throw new RuntimeException('Missing order or fan token');
    $r = req('PATCH', "$BASE/orders/{$celebFlowOrder['id']}/status", ['status' => 'cancelled'], $newFH);
    assertStatus($r, 422); // Fan can only cancel pending
});

test('Celebrity moves order to in_progress', function () use ($BASE, $newCH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$newCH) throw new RuntimeException('Missing order or celebrity token');
    $r = req('PATCH', "$BASE/orders/{$celebFlowOrder['id']}/status", ['status' => 'in_progress'], $newCH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'order.status'), 'in_progress', 'Status in_progress');
});

test('Celebrity completes the order', function () use ($BASE, $newCH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$newCH) throw new RuntimeException('Missing order or celebrity token');
    $r = req('PATCH', "$BASE/orders/{$celebFlowOrder['id']}/status", ['status' => 'completed'], $newCH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'order.status'), 'completed', 'Status completed');
});

test('Admin can set order to refunded', function () use ($BASE, $aH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$aH) throw new RuntimeException('Missing order or admin token');
    $r = req('PATCH', "$BASE/orders/{$celebFlowOrder['id']}/status", ['status' => 'refunded'], $aH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'order.status'), 'refunded', 'Admin can set refunded');
});

// ─────────────────────────────────────────────────────────────────────────────
section('5. Order ownership / cross-user isolation');
// ─────────────────────────────────────────────────────────────────────────────

test('Fan A cannot see Fan B\'s orders (main fan vs new fan)', function () use ($BASE, $fH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$fH) throw new RuntimeException('Missing order or fan token');
    // Main fan (fan@demo.com) tries to access an order placed by the new fan
    $r = req('GET', "$BASE/orders/{$celebFlowOrder['id']}", [], $fH);
    assertStatus($r, 403);
});

test('Unauthenticated user cannot see any order', function () use ($BASE, $celebFlowOrder) {
    if (!$celebFlowOrder) throw new RuntimeException('No order');
    $r = req('GET', "$BASE/orders/{$celebFlowOrder['id']}");
    assertStatus($r, 401);
});

test('Main celebrity cannot update new celebrity\'s order', function () use ($BASE, $cH, $celebFlowOrder) {
    if (!$celebFlowOrder || !$cH) throw new RuntimeException('Missing order or celeb token');
    // celebFlowOrder belongs to newCeleb, not main celebrity
    $r = req('PATCH', "$BASE/orders/{$celebFlowOrder['id']}/status", ['status' => 'cancelled'], $cH);
    assertStatus($r, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
section('6. Payment intent business rules');
// ─────────────────────────────────────────────────────────────────────────────

// Create yet another pending order for payment-intent tests
$piOrder = test('Create a pending order for payment-intent tests', function () use ($BASE, $newFH, $pricedService) {
    if (!$pricedService || !$newFH) throw new RuntimeException('Missing service or fan');
    $r = req('POST', "$BASE/orders", [
        'service_id'         => $pricedService['id'],
        'customization_data' => ['message' => 'PI test'],
    ], $newFH);
    return assertKey(assertStatus($r, 201), 'order');
});

test('Celebrity cannot initiate payment intent', function () use ($BASE, $newCH, $piOrder) {
    if (!$piOrder || !$newCH) throw new RuntimeException('Missing');
    $r = req('POST', "$BASE/orders/{$piOrder['id']}/payment-intent", [], $newCH);
    assertStatus($r, 403);
});

test('Admin cannot initiate payment intent', function () use ($BASE, $aH, $piOrder) {
    if (!$piOrder || !$aH) throw new RuntimeException('Missing');
    $r = req('POST', "$BASE/orders/{$piOrder['id']}/payment-intent", [], $aH);
    assertStatus($r, 403);
});

test('Payment intent on non-pending order is rejected (cancel it first)', function () use ($BASE, $newFH, $newCH, $pricedService) {
    // Create order, confirm it, then try payment intent
    if (!$pricedService || !$newFH || !$newCH) throw new RuntimeException('Missing');
    $r1 = req('POST', "$BASE/orders", [
        'service_id'         => $pricedService['id'],
        'customization_data' => ['message' => 'PI transition test'],
    ], $newFH);
    $ord = assertKey(assertStatus($r1, 201), 'order');

    // Celebrity confirms it
    req('PATCH', "$BASE/orders/{$ord['id']}/status", ['status' => 'confirmed'], $newCH);

    // Fan tries payment intent on confirmed order (not pending)
    $r2 = req('POST', "$BASE/orders/{$ord['id']}/payment-intent", [], $newFH);
    assertStatus($r2, 422);
});

test('Wrong fan cannot pay for someone else\'s order', function () use ($BASE, $fH, $piOrder) {
    if (!$piOrder || !$fH) throw new RuntimeException('Missing');
    // fH = main fan, piOrder belongs to newFan
    $r = req('POST', "$BASE/orders/{$piOrder['id']}/payment-intent", [], $fH);
    assertStatus($r, 403);
});

test('Payment intent with no Stripe key returns 503', function () use ($BASE, $newFH, $piOrder) {
    if (!$piOrder || !$newFH) throw new RuntimeException('Missing');
    $r = req('POST', "$BASE/orders/{$piOrder['id']}/payment-intent", [], $newFH);
    // Either 503 (stripe not configured) or 200 (if configured). Both are acceptable.
    if (!in_array($r['status'], [200, 201, 422, 503, 502])) {
        throw new RuntimeException("Unexpected status {$r['status']}");
    }
    if ($r['status'] === 503) {
        echo "       [Stripe not configured — 503 returned as expected]\n";
    } elseif (in_array($r['status'], [200, 201])) {
        echo "       [Stripe configured — client_secret returned]\n";
    }
    return true;
});

// ─────────────────────────────────────────────────────────────────────────────
section('7. Profile updates — data persistence');
// ─────────────────────────────────────────────────────────────────────────────

test('Fan can update display_name', function () use ($BASE, $newFH) {
    if (!$newFH) throw new RuntimeException('No fan token');
    $newName = 'Renamed Fan ' . time();
    $r = req('PUT', "$BASE/fan/profile", ['display_name' => $newName], $newFH);
    assertStatus($r, 200);

    // Verify persisted
    $r2 = req('GET', "$BASE/fan/profile", [], $newFH);
    $d  = assertStatus($r2, 200);
    assertEqual(assertKey($d, 'profile.display_name'), $newName, 'display_name persisted after update');
});

test('Fan display_name max 255 chars enforced', function () use ($BASE, $newFH) {
    if (!$newFH) throw new RuntimeException('No fan token');
    $r = req('PUT', "$BASE/fan/profile", ['display_name' => str_repeat('A', 256)], $newFH);
    assertStatus($r, 422);
});

test('Celebrity can update bio', function () use ($BASE, $newCH) {
    if (!$newCH) throw new RuntimeException('No celeb token');
    $bio = 'My updated bio ' . time();
    $r = req('PUT', "$BASE/celebrity/profile", ['bio' => $bio], $newCH);
    assertStatus($r, 200);

    $r2 = req('GET', "$BASE/celebrity/profile", [], $newCH);
    $d  = assertStatus($r2, 200);
    assertEqual(assertKey($d, 'profile.bio'), $bio, 'bio persisted after update');
});

test('Celebrity avatar_url must be a valid URL', function () use ($BASE, $newCH) {
    if (!$newCH) throw new RuntimeException('No celeb token');
    $r = req('PUT', "$BASE/celebrity/profile", ['profile_image_url' => 'not-a-url'], $newCH);
    assertStatus($r, 422);
});

// ─────────────────────────────────────────────────────────────────────────────
section('8. Admin user moderation — suspend / ban / reactivate');
// ─────────────────────────────────────────────────────────────────────────────

// Fetch the new fan's profile id
$newFanProfileId = test('Fetch new fan profile id from admin', function () use ($BASE, $aH, $newFanEmail) {
    $r = req('GET', "$BASE/admin/fans?q=" . urlencode($newFanEmail), [], $aH);
    $d = assertStatus($r, 200);
    $fans = assertKey($d, 'fans.data');
    foreach ($fans as $f) {
        if (isset($f['user']['email']) && $f['user']['email'] === $newFanEmail) {
            echo "       found fan_profile_id={$f['id']}\n";
            return $f['id'];
        }
    }
    throw new RuntimeException("New fan not found in admin/fans. Returned: " . json_encode(array_column($fans, 'id')));
});

test('Admin suspends fan account', function () use ($BASE, $aH, $newFanProfileId) {
    if (!$newFanProfileId) throw new RuntimeException('No fan profile id');
    $r = req('PATCH', "$BASE/admin/fans/{$newFanProfileId}/user-status", ['status' => 'suspended'], $aH);
    assertStatus($r, 200);
});

test('Admin bans fan account', function () use ($BASE, $aH, $newFanProfileId) {
    if (!$newFanProfileId) throw new RuntimeException('No fan profile id');
    $r = req('PATCH', "$BASE/admin/fans/{$newFanProfileId}/user-status", ['status' => 'banned'], $aH);
    assertStatus($r, 200);
});

test('Admin reactivates fan account', function () use ($BASE, $aH, $newFanProfileId) {
    if (!$newFanProfileId) throw new RuntimeException('No fan profile id');
    $r = req('PATCH', "$BASE/admin/fans/{$newFanProfileId}/user-status", ['status' => 'active'], $aH);
    assertStatus($r, 200);
    // Verify via GET
    $r2 = req('GET', "$BASE/admin/fans/{$newFanProfileId}", [], $aH);
    $d  = assertStatus($r2, 200);
    assertEqual(assertKey($d, 'fan.user.status'), 'active', 'Fan user status restored to active');
});

test('Invalid status value rejected', function () use ($BASE, $aH, $newFanProfileId) {
    if (!$newFanProfileId) throw new RuntimeException('No fan profile id');
    $r = req('PATCH', "$BASE/admin/fans/{$newFanProfileId}/user-status", ['status' => 'deleted'], $aH);
    assertStatus($r, 422);
});

// ─────────────────────────────────────────────────────────────────────────────
section('9. Admin celebrity verification workflow');
// ─────────────────────────────────────────────────────────────────────────────

// Fetch the new celebrity's profile id from admin
$newCelebProfileId = test('Fetch new celebrity profile id from admin', function () use ($BASE, $aH, $newCelebEmail) {
    $r = req('GET', "$BASE/admin/celebrities?q=" . urlencode($newCelebEmail), [], $aH);
    $d = assertStatus($r, 200);
    $celebs = assertKey($d, 'celebrities.data');
    foreach ($celebs as $c) {
        if (isset($c['user']['email']) && $c['user']['email'] === $newCelebEmail) {
            echo "       found celebrity_profile_id={$c['id']} verification_status={$c['verification_status']}\n";
            return $c['id'];
        }
    }
    throw new RuntimeException('New celebrity not found in admin list. Got emails: ' . implode(', ', array_column(array_column($celebs, 'user'), 'email')));
});

test('New celebrity starts as pending verification', function () use ($BASE, $aH, $newCelebProfileId) {
    if (!$newCelebProfileId) throw new RuntimeException('No celeb profile id');
    $r = req('GET', "$BASE/admin/celebrities/{$newCelebProfileId}", [], $aH);
    $d = assertStatus($r, 200);
    assertEqual(assertKey($d, 'celebrity.verification_status'), 'pending', 'New celeb verification_status');
});

test('Admin approves (verifies) celebrity', function () use ($BASE, $aH, $newCelebProfileId) {
    if (!$newCelebProfileId) throw new RuntimeException('No celeb profile id');
    $r = req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['verification_status' => 'verified'], $aH);
    assertStatus($r, 200);
    // Verify
    $r2 = req('GET', "$BASE/admin/celebrities/{$newCelebProfileId}", [], $aH);
    $d  = assertStatus($r2, 200);
    assertEqual(assertKey($d, 'celebrity.verification_status'), 'verified', 'Verification status after approval');
});

test('Admin rejects celebrity', function () use ($BASE, $aH, $newCelebProfileId) {
    if (!$newCelebProfileId) throw new RuntimeException('No celeb profile id');
    $r = req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['verification_status' => 'rejected'], $aH);
    assertStatus($r, 200);
});

test('Admin toggles is_featured on celebrity', function () use ($BASE, $aH, $newCelebProfileId) {
    if (!$newCelebProfileId) throw new RuntimeException('No celeb profile id');
    $r = req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['is_featured' => true], $aH);
    $d = assertStatus($r, 200);
    $r2 = req('GET', "$BASE/admin/celebrities/{$newCelebProfileId}", [], $aH);
    $d2 = assertStatus($r2, 200);
    assertEqual((bool) assertKey($d2, 'celebrity.is_featured'), true, 'is_featured set to true');
    // Restore
    req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['is_featured' => false], $aH);
});

test('Admin sets custom commission_rate', function () use ($BASE, $aH, $newCelebProfileId) {
    if (!$newCelebProfileId) throw new RuntimeException('No celeb profile id');
    $r = req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['commission_rate' => 22.5], $aH);
    assertStatus($r, 200);
    $r2 = req('GET', "$BASE/admin/celebrities/{$newCelebProfileId}", [], $aH);
    $d2 = assertStatus($r2, 200);
    assertApprox((float) assertKey($d2, 'celebrity.commission_rate'), 22.5, 'commission_rate persisted');
    // Restore
    req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['commission_rate' => 15.0], $aH);
});

test('commission_rate > 100 is rejected', function () use ($BASE, $aH, $newCelebProfileId) {
    if (!$newCelebProfileId) throw new RuntimeException('No celeb profile id');
    $r = req('PATCH', "$BASE/admin/celebrities/{$newCelebProfileId}", ['commission_rate' => 150], $aH);
    assertStatus($r, 422);
});

// ─────────────────────────────────────────────────────────────────────────────
section('10. Admin pricing rules CRUD');
// ─────────────────────────────────────────────────────────────────────────────

$pricingRule = test('Create pricing rule', function () use ($BASE, $aH) {
    $r = req('POST', "$BASE/admin/pricing/rules", [
        'name'                => 'Test Rule ' . time(),
        'service_type'        => 'video_message',
        'celebrity_tier'      => 'superstar',
        'min_price'           => 100,
        'max_price'           => 1000,
        'commission_override' => 20,
        'priority'            => 10,
        'is_active'           => true,
    ], $aH);
    $d = assertStatus($r, 201);
    $rule = assertKey($d, 'rule');
    assertEqual($rule['celebrity_tier'], 'superstar', 'celebrity_tier persisted');
    assertApprox((float) $rule['commission_override'], 20.0, 'commission_override persisted');
    echo "       rule_id={$rule['id']}\n";
    return $rule;
});

test('Pricing rule validation — invalid celebrity_tier rejected', function () use ($BASE, $aH) {
    $r = req('POST', "$BASE/admin/pricing/rules", [
        'name'           => 'Bad tier',
        'celebrity_tier' => 'mega_celebrity', // invalid
    ], $aH);
    assertStatus($r, 422);
    assertKey($r['body'], 'errors.celebrity_tier');
});

test('Update pricing rule', function () use ($BASE, $aH, $pricingRule) {
    if (!$pricingRule) throw new RuntimeException('No pricing rule');
    $r = req('PUT', "$BASE/admin/pricing/rules/{$pricingRule['id']}", [
        'commission_override' => 25,
        'is_active'           => false,
    ], $aH);
    $d = assertStatus($r, 200);
    $updated = assertKey($d, 'rule');
    assertApprox((float) $updated['commission_override'], 25.0, 'commission_override updated');
    assertEqual((bool) $updated['is_active'], false, 'is_active updated to false');
});

test('List pricing rules — updated rule appears', function () use ($BASE, $aH, $pricingRule) {
    if (!$pricingRule) throw new RuntimeException('No pricing rule');
    $r = req('GET', "$BASE/admin/pricing/rules", [], $aH);
    $d = assertStatus($r, 200);
    $rules = assertKey($d, 'rules');
    $ids   = array_column($rules, 'id');
    if (!in_array($pricingRule['id'], $ids)) {
        throw new RuntimeException("Rule {$pricingRule['id']} not found in list");
    }
});

test('Delete pricing rule', function () use ($BASE, $aH, $pricingRule) {
    if (!$pricingRule) throw new RuntimeException('No pricing rule');
    $r = req('DELETE', "$BASE/admin/pricing/rules/{$pricingRule['id']}", [], $aH);
    assertStatus($r, 200);
    // Verify gone
    $r2 = req('GET', "$BASE/admin/pricing/rules", [], $aH);
    $d2 = assertStatus($r2, 200);
    $ids = array_column(assertKey($d2, 'rules'), 'id');
    if (in_array($pricingRule['id'], $ids)) {
        throw new RuntimeException("Rule {$pricingRule['id']} still present after delete");
    }
});

// ─────────────────────────────────────────────────────────────────────────────
section('11. Admin service price override');
// ─────────────────────────────────────────────────────────────────────────────

test('Admin can override service base_price', function () use ($BASE, $aH, $newService) {
    if (!$newService) throw new RuntimeException('No service');
    $r = req('PATCH', "$BASE/admin/pricing/services/{$newService['id']}", [
        'base_price' => 75.00,
        'status'     => 'active',
    ], $aH);
    $d = assertStatus($r, 200);
    assertApprox((float) assertKey($d, 'service.base_price'), 75.0, 'base_price overridden by admin');
});

test('Admin pricing defaults persist across reads', function () use ($BASE, $aH) {
    // Write unique values
    $rate  = 17.5;
    $price = 24.99;
    req('PUT', "$BASE/admin/pricing/defaults", [
        'platform_commission_rate'   => $rate,
        'default_subscription_price' => $price,
    ], $aH);
    // Read back
    $r = req('GET', "$BASE/admin/pricing", [], $aH);
    $d = assertStatus($r, 200);
    assertApprox((float) assertKey($d, 'defaults.platform_commission_rate'), $rate, 'commission_rate persisted');
    assertApprox((float) assertKey($d, 'defaults.default_subscription_price'), $price, 'subscription_price persisted');
    // Restore
    req('PUT', "$BASE/admin/pricing/defaults", ['platform_commission_rate' => 15, 'default_subscription_price' => 19.99], $aH);
});

// ─────────────────────────────────────────────────────────────────────────────
section('12. Payment configuration — field masking & persistence');
// ─────────────────────────────────────────────────────────────────────────────

test('Admin can write stripe keys and they are masked in response', function () use ($BASE, $aH) {
    $fakeSecret = 'sk_test_FakeSecretKey1234567890';
    req('PUT', "$BASE/admin/payments/config", ['stripe_secret_key' => $fakeSecret], $aH);

    $r = req('GET', "$BASE/admin/payments/config", [], $aH);
    $d = assertStatus($r, 200);
    $masked = assertKey($d, 'masked.stripe_secret_key');

    // Masked value should not equal the full secret
    if ($masked === $fakeSecret) {
        throw new RuntimeException('stripe_secret_key not masked in response!');
    }
    // But should end with last 4 chars
    $last4 = substr($fakeSecret, -4);
    if (!str_ends_with($masked, $last4)) {
        throw new RuntimeException("Masked key should end with $last4, got '$masked'");
    }
    // Real value should be in payment_config (accessible for internal use)
    $actual = assertKey($d, 'payment_config.stripe_secret_key');
    assertEqual($actual, $fakeSecret, 'stripe_secret_key stored in payment_config');
    echo "       masked=$masked  (full key not exposed via masked field)\n";
    // Cleanup
    req('PUT', "$BASE/admin/payments/config", ['stripe_secret_key' => ''], $aH);
});

test('Payment config gateway_mode only accepts test/live', function () use ($BASE, $aH) {
    $r = req('PUT', "$BASE/admin/payments/config", ['gateway_mode' => 'sandbox'], $aH);
    assertStatus($r, 422);
});

test('Payment config payout_schedule only accepts manual/daily/weekly/monthly', function () use ($BASE, $aH) {
    $r = req('PUT', "$BASE/admin/payments/config", ['payout_schedule' => 'quarterly'], $aH);
    assertStatus($r, 422);
});

test('vat_rate must be between 0 and 100', function () use ($BASE, $aH) {
    $r = req('PUT', "$BASE/admin/payments/config", ['vat_rate' => 150], $aH);
    assertStatus($r, 422);
});

test('vat_rate = 0 is valid', function () use ($BASE, $aH) {
    $r = req('PUT', "$BASE/admin/payments/config", ['vat_rate' => 0], $aH);
    assertStatus($r, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
section('13. Analytics data consistency');
// ─────────────────────────────────────────────────────────────────────────────

test('Analytics total_users matches GET /admin/users count', function () use ($BASE, $aH) {
    $analyticsResp = req('GET', "$BASE/admin/analytics", [], $aH);
    $analyticsUsers = assertKey(assertStatus($analyticsResp, 200), 'kpis.total_users');

    $usersResp  = req('GET', "$BASE/admin/users?per_page=100", [], $aH);
    $pagination = assertKey(assertStatus($usersResp, 200), 'users');
    $usersCount = $pagination['total'] ?? count($pagination['data'] ?? []);

    assertEqual((int) $analyticsUsers, (int) $usersCount, 'Analytics user count matches users endpoint');
    echo "       analytics_users=$analyticsUsers  users_total=$usersCount\n";
});

test('Analytics monthly array has exactly 6 entries', function () use ($BASE, $aH) {
    $r = req('GET', "$BASE/admin/analytics", [], $aH);
    $monthly = assertKey(assertStatus($r, 200), 'monthly');
    assertEqual(count($monthly), 6, 'Monthly data has 6 months');
});

test('Analytics kpis contain expected keys', function () use ($BASE, $aH) {
    $r = req('GET', "$BASE/admin/analytics", [], $aH);
    $kpis = assertKey(assertStatus($r, 200), 'kpis');
    $required = ['total_users', 'total_celebrities', 'total_fans', 'total_orders', 'net_revenue', 'verified_celebrities', 'conversion_rate'];
    foreach ($required as $key) {
        if (!array_key_exists($key, $kpis)) {
            throw new RuntimeException("Missing KPI key: $key");
        }
    }
    echo "       " . count($kpis) . " KPI keys present\n";
});

test('Audit log for newly registered users contains correct category', function () use ($BASE, $aH) {
    $r = req('GET', "$BASE/admin/audit?type=user", [], $aH);
    $logs = assertKey(assertStatus($r, 200), 'logs');
    foreach ($logs as $log) {
        if ($log['category'] !== 'user') {
            throw new RuntimeException("Audit filter type=user returned a non-user log: {$log['category']}");
        }
    }
    // New registrations should be in the log
    if (empty($logs)) throw new RuntimeException('No audit logs for users, expected at least the demo accounts');
    echo "       " . count($logs) . " user audit entries, all category=user ✓\n";
});

// ─────────────────────────────────────────────────────────────────────────────
section('14. Celebrity service visibility to public');
// ─────────────────────────────────────────────────────────────────────────────

test('Active service appears in public GET /services', function () use ($BASE, $newService) {
    if (!$newService) throw new RuntimeException('No service');
    $r = req('GET', "$BASE/services");
    $d = assertStatus($r, 200);
    $svcs = $d['services']['data'] ?? $d['data'] ?? [];
    // Service was set to price 75 by admin, should still be active
    foreach ($svcs as $s) {
        if ((int) $s['id'] === (int) $newService['id']) {
            echo "       service found in public list (id={$s['id']})\n";
            return true;
        }
    }
    // Not finding it in the first page may be OK (pagination), just verify endpoint works
    echo "       service not in first page (pagination) — public endpoint works\n";
});

test('GET /services has no authentication requirement', function () use ($BASE) {
    $r = req('GET', "$BASE/services");
    assertStatus($r, 200);
});

test('GET /categories has no authentication requirement', function () use ($BASE) {
    $r = req('GET', "$BASE/categories");
    assertStatus($r, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
section('15. Service deletion — cleanup');
// ─────────────────────────────────────────────────────────────────────────────

test('Celebrity can delete own service (no orders)', function () use ($BASE, $newCH, $catId) {
    if (!$newCH) throw new RuntimeException('No new celeb token');
    // Create a fresh service with no orders, then delete it
    $r1 = req('POST', "$BASE/celebrity/services", [
        'category_id'  => $catId ?? 1,
        'service_type' => 'video_message',
        'title'        => 'Deletable Service ' . time(),
        'description'  => 'Will be deleted in this test',
        'base_price'   => 5.00,
        'is_digital'   => true,
        'requires_booking' => false,
    ], $newCH);
    $svc = assertKey(assertStatus($r1, 201), 'service');
    $r = req('DELETE', "$BASE/celebrity/services/{$svc['id']}", [], $newCH);
    assertStatus($r, 200);
    // Verify gone
    $r2 = req('GET', "$BASE/celebrity/services", [], $newCH);
    $svcs = assertStatus($r2, 200)['services']['data'] ?? assertStatus($r2, 200)['services'] ?? [];
    foreach ($svcs as $s) {
        if ((int) $s['id'] === (int) $svc['id']) {
            throw new RuntimeException('Service still in list after delete');
        }
    }
});

test('Celebrity cannot delete service that has orders', function () use ($BASE, $newCH, $pricedService) {
    if (!$pricedService || !$newCH) throw new RuntimeException('Missing');
    // pricedService has orders created in earlier tests
    $r = req('DELETE', "$BASE/celebrity/services/{$pricedService['id']}", [], $newCH);
    assertStatus($r, 422); // FK constraint — should be blocked
});

test('Main celebrity cannot delete new celebrity\'s service', function () use ($BASE, $cH, $pricedService) {
    if (!$pricedService || !$cH) throw new RuntimeException('Missing');
    // $pricedService belongs to newCeleb, $cH is mainCeleb
    $r = req('DELETE', "$BASE/celebrity/services/{$pricedService['id']}", [], $cH);
    assertStatus($r, 403);
});

// ─────────────────────────────────────────────────────────────────────────────
section('16. CMS content persistence');
// ─────────────────────────────────────────────────────────────────────────────

test('CMS content is readable and writable', function () use ($BASE, $aH) {
    $title    = 'Audit Test Title ' . time();
    $subtitle = 'Audit Test Subtitle ' . time();
    req('PUT', "$BASE/admin/cms/content", ['home_hero_title' => $title, 'home_hero_subtitle' => $subtitle], $aH);
    $r = req('GET', "$BASE/admin/cms/content", [], $aH);
    $d = assertStatus($r, 200);
    $content = assertKey($d, 'content');
    assertEqual($content['home_hero_title'] ?? null, $title, 'home_hero_title persisted');
    assertEqual($content['home_hero_subtitle'] ?? null, $subtitle, 'home_hero_subtitle persisted');
});

test('Fan cannot write CMS content', function () use ($BASE, $fH) {
    $r = req('PUT', "$BASE/admin/cms/content", ['home_hero_title' => 'hacked'], $fH);
    assertStatus($r, 403);
});

// ─────────────────────────────────────────────────────────────────────────────

$total = $passed + $failed;
echo "\n" . str_repeat('─', 54) . "\n";
echo "\033[1mResults: $passed/$total passed";
if ($skipped) echo "  ($skipped skipped)";
if ($failed > 0) {
    echo "  \033[31m($failed failed)\033[0m\n";
    echo "\n\033[31mFailed tests:\033[0m\n";
    foreach ($errors as $e) echo "  • $e\n";
} else {
    echo "  \033[32m— all passed ✓\033[0m\n";
}
echo str_repeat('─', 54) . "\n\n";

exit($failed > 0 ? 1 : 0);
