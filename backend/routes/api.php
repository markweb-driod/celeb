<?php

use App\Http\Controllers\API\V1\Auth\LoginController;
use App\Http\Controllers\API\V1\Auth\RegisterController;
use App\Http\Controllers\API\V1\Admin\AnalyticsController;
use App\Http\Controllers\API\V1\Admin\AuditController;
use App\Http\Controllers\API\V1\Admin\CelebrityManagementController;
use App\Http\Controllers\API\V1\Admin\ChatSupervisionController;
use App\Http\Controllers\API\V1\CategoryController;
use App\Http\Controllers\API\V1\Admin\CmsController as AdminCmsController;
use App\Http\Controllers\API\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\API\V1\Admin\FanManagementController;
use App\Http\Controllers\API\V1\Admin\PaymentConfigController;
use App\Http\Controllers\API\V1\Admin\PricingController;
use App\Http\Controllers\API\V1\Admin\TransactionController;
use App\Http\Controllers\API\V1\CelebrityController;
use App\Http\Controllers\API\V1\Admin\UserManagementController;
use App\Http\Controllers\API\V1\Chat\ConversationController;
use App\Http\Controllers\API\V1\PaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Auth Routes
    Route::prefix('auth')->group(function () {
        Route::middleware('throttle:10,1')->group(function () {
            Route::post('register', RegisterController::class);
            Route::post('login', [LoginController::class, 'login']);
        });
        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [LoginController::class, 'logout']);
            Route::get('me', [LoginController::class, 'user']);
        });
    });

    // Public Routes
    Route::get('services', [\App\Http\Controllers\API\V1\ServiceController::class, 'index']);
    Route::get('services/{service}', [\App\Http\Controllers\API\V1\ServiceController::class, 'show']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('celebrities', [CelebrityController::class, 'index']);
    Route::get('celebrities/{celebrity}', [CelebrityController::class, 'show']);
    Route::get('payment-methods', [PaymentController::class, 'methods']);

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        
        Route::middleware('is_celebrity')->prefix('celebrity')->group(function () {
            Route::get('profile', [\App\Http\Controllers\API\V1\Celebrity\ProfileController::class, 'show']);
            Route::put('profile', [\App\Http\Controllers\API\V1\Celebrity\ProfileController::class, 'update']);
            
            Route::apiResource('services', \App\Http\Controllers\API\V1\Celebrity\ServiceController::class);
        });

        Route::middleware('is_fan')->prefix('fan')->group(function () {
            Route::get('profile', [\App\Http\Controllers\API\V1\Fan\ProfileController::class, 'show']);
            Route::put('profile', [\App\Http\Controllers\API\V1\Fan\ProfileController::class, 'update']);
        });

        Route::prefix('chat')->group(function () {
            Route::get('subscriptions', [ConversationController::class, 'subscriptions']);
            Route::get('conversations', [ConversationController::class, 'index']);
            Route::post('conversations', [ConversationController::class, 'store']);
            Route::get('conversations/{conversation}/messages', [ConversationController::class, 'messages']);
            Route::post('conversations/{conversation}/messages', [ConversationController::class, 'sendMessage']);
        });

        Route::middleware('is_admin')->prefix('admin')->group(function () {
            Route::get('overview', [AdminDashboardController::class, 'overview']);
            Route::get('monitoring', [AdminDashboardController::class, 'monitoring']);

            Route::get('users', [UserManagementController::class, 'index']);
            Route::patch('users/{user}/status', [UserManagementController::class, 'updateStatus']);
            Route::patch('users/{user}/commission', [UserManagementController::class, 'updateCommission']);

            Route::get('pricing', [PricingController::class, 'index']);
            Route::put('pricing/defaults', [PricingController::class, 'updateDefaults']);
            Route::patch('pricing/services/{service}', [PricingController::class, 'updateServicePrice']);

            Route::get('payments/config', [PaymentConfigController::class, 'show']);
            Route::put('payments/config', [PaymentConfigController::class, 'update']);

            Route::get('cms/content', [AdminCmsController::class, 'show']);
            Route::put('cms/content', [AdminCmsController::class, 'update']);

            // Chat supervision
            Route::get('chats', [ChatSupervisionController::class, 'index']);
            Route::get('chats/{conversation}/messages', [ChatSupervisionController::class, 'messages']);
            Route::patch('chats/{conversation}/status', [ChatSupervisionController::class, 'updateStatus']);
            Route::delete('chats/{conversation}/messages/{message}', [ChatSupervisionController::class, 'deleteMessage']);

            // Pricing rules engine
            Route::get('pricing/rules', [PricingController::class, 'rules']);
            Route::post('pricing/rules', [PricingController::class, 'storeRule']);
            Route::put('pricing/rules/{rule}', [PricingController::class, 'updateRule']);
            Route::delete('pricing/rules/{rule}', [PricingController::class, 'deleteRule']);

            // Celebrity management
            Route::get('celebrities', [CelebrityManagementController::class, 'index']);
            Route::post('celebrities', [CelebrityManagementController::class, 'store']);
            Route::get('celebrities/{celebrity}', [CelebrityManagementController::class, 'show']);
            Route::patch('celebrities/{celebrity}', [CelebrityManagementController::class, 'update']);
            Route::patch('celebrities/{celebrity}/user-status', [CelebrityManagementController::class, 'updateUserStatus']);
            Route::delete('celebrities/{celebrity}', [CelebrityManagementController::class, 'destroy']);
            // Celebrity services (payment items)
            Route::get('celebrities/{celebrity}/services', [CelebrityManagementController::class, 'services']);
            Route::post('celebrities/{celebrity}/services', [CelebrityManagementController::class, 'storeService']);
            Route::patch('celebrities/{celebrity}/services/{service}', [CelebrityManagementController::class, 'updateService']);
            Route::delete('celebrities/{celebrity}/services/{service}', [CelebrityManagementController::class, 'destroyService']);

            // Fan management
            Route::get('fans', [FanManagementController::class, 'index']);
            Route::get('fans/{fan}', [FanManagementController::class, 'show']);
            Route::patch('fans/{fan}/user-status', [FanManagementController::class, 'updateUserStatus']);

            // Transactions & payouts
            Route::get('transactions', [TransactionController::class, 'index']);
            Route::get('transactions/{transaction}', [TransactionController::class, 'show']);
            Route::post('transactions/{transaction}/confirm', [TransactionController::class, 'confirm']);
            Route::post('transactions/{transaction}/reject', [TransactionController::class, 'reject']);
            Route::get('payouts', [TransactionController::class, 'payouts']);

            // Payment methods admin config
            Route::get('payments/methods', [PaymentConfigController::class, 'showMethods']);
            Route::put('payments/methods', [PaymentConfigController::class, 'updateMethods']);

            // Analytics
            Route::get('analytics', [AnalyticsController::class, 'index']);

            // Audit log
            Route::get('audit', [AuditController::class, 'index']);
        });

        // Shared Protected Routes
        Route::apiResource('orders', \App\Http\Controllers\API\V1\OrderController::class)->only(['index', 'store', 'show']);
        Route::patch('orders/{order}/status', [\App\Http\Controllers\API\V1\OrderController::class, 'updateStatus']);
        // Payment submission (replaces Stripe payment-intent flow)
        Route::post('payments/upload-proof', [PaymentController::class, 'uploadProof']);
        Route::post('orders/{order}/payment/submit', [PaymentController::class, 'submit']);


    });
});
