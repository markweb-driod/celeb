<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | In development: set FRONTEND_URL=http://localhost:3000 (default)
    | In production:  set FRONTEND_URL=https://celebstarshub.com
    |
    | Multiple origins can be comma-separated in FRONTEND_URL.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(
        array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:3000,http://127.0.0.1:3000')))
    ),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 86400,

    'supports_credentials' => false,

];
