<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\CelebrityProfile;
use Illuminate\Http\Request;

class CelebrityController extends Controller
{
    public function index(Request $request)
    {
        $perPage = max(1, min((int) $request->integer('per_page', 12), 50));
        $search = trim((string) $request->query('search', ''));
        $category = trim((string) $request->query('category', ''));
        $sort = (string) $request->query('sort', 'popular');

        $query = CelebrityProfile::query()
            ->with('user:id,email')
            ->withMin([
                'services as min_price' => static function ($q) {
                    $q->where('status', 'active');
                },
            ], 'base_price')
            ->whereHas('services', static function ($q) {
                $q->where('status', 'active');
            });

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('stage_name', 'like', "%{$search}%")
                    ->orWhere('bio', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category !== '' && strcasecmp($category, 'all') !== 0) {
            $query->where('category', $category);
        }

        switch ($sort) {
            case 'rating':
                $query->orderByDesc('rating_average')->orderByDesc('rating_count');
                break;
            case 'price_asc':
                $query->orderBy('min_price');
                break;
            case 'price_desc':
                $query->orderByDesc('min_price');
                break;
            case 'popular':
            default:
                $query->orderByDesc('total_followers')->orderByDesc('rating_count');
                break;
        }

        $paginator = $query->paginate($perPage)->through(static function (CelebrityProfile $profile) {
            return [
                'id' => $profile->id,
                'stage_name' => $profile->stage_name,
                'category' => $profile->category,
                'bio' => $profile->bio,
                'is_verified' => $profile->verification_status === 'verified',
                'min_price' => $profile->min_price,
                'average_rating' => $profile->rating_average,
                'total_reviews' => (int) $profile->rating_count,
                'avatar_url' => $profile->profile_image_url,
                'user' => [
                    'email' => $profile->user?->email,
                ],
            ];
        });

        return response()->json([
            'celebrities' => $paginator,
        ]);
    }

    public function show(CelebrityProfile $celebrity)
    {
        $celebrity->load([
            'services' => static function ($q) {
                $q->where('status', 'active')->orderBy('base_price');
            },
        ]);

        return response()->json([
            'celebrity' => [
                'id' => $celebrity->id,
                'stage_name' => $celebrity->stage_name,
                'category' => $celebrity->category,
                'bio' => $celebrity->bio,
                'is_verified' => $celebrity->verification_status === 'verified',
                'min_price' => $celebrity->services->min('base_price'),
                'avatar_url' => $celebrity->profile_image_url,
                'total_reviews' => (int) $celebrity->rating_count,
                'average_rating' => $celebrity->rating_average,
                'services' => $celebrity->services->map(static function ($service) {
                    return [
                        'id' => $service->id,
                        'title' => $service->title,
                        'description' => $service->description,
                        'service_type' => $service->service_type,
                        'base_price' => $service->base_price,
                        'currency' => $service->currency,
                        'delivery_days' => $service->max_delivery_days,
                        'images' => $service->images,
                        'short_video_url' => $service->short_video_url,
                        'status' => $service->status,
                        'total_sold' => $service->total_sold,
                    ];
                })->values(),
            ],
        ]);
    }
}
