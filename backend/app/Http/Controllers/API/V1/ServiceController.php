<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Service::with('celebrity')
            ->where('status', 'active');

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('q')) {
            $query->where(function($q) use ($request) {
                $q->where('title', 'like', "%{$request->q}%")
                  ->orWhere('description', 'like', "%{$request->q}%");
            });
        }

        return response()->json([
            'services' => $query->paginate(20)
        ]);
    }

    public function show(Service $service)
    {
        if ($service->status !== 'active') {
            abort(404);
        }

        return response()->json([
            'service' => $service->load('celebrity', 'category', 'reviews')
        ]);
    }
}
