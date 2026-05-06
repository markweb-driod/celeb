<?php

namespace App\Http\Controllers\API\V1\Celebrity;

use App\Http\Controllers\Controller;
use App\Http\Requests\Service\CreateServiceRequest;
use App\Http\Requests\Service\UpdateServiceRequest;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $services = $request->user()->celebrityProfile->services;
        return response()->json(['services' => $services]);
    }

    public function store(CreateServiceRequest $request)
    {
        $data = $request->validated();
        $data['slug'] = Str::slug($data['title']) . '-' . Str::random(6);
        $data['celebrity_id'] = $request->user()->celebrityProfile->id;
        $data['status'] = 'active'; // Default to active for simplicity in MVP

        $service = Service::create($data);

        return response()->json([
            'message' => 'Service created successfully',
            'service' => $service
        ], 201);
    }

    public function show(Service $service)
    {
        // Ensure ownership
        if ($service->celebrity_id !== request()->user()->celebrityProfile->id) {
            abort(403);
        }
        return response()->json(['service' => $service]);
    }

    public function update(UpdateServiceRequest $request, Service $service)
    {
        if ($service->celebrity_id !== request()->user()->celebrityProfile->id) {
            abort(403);
        }

        $service->update($request->validated());

        return response()->json([
            'message' => 'Service updated successfully',
            'service' => $service
        ]);
    }

    public function destroy(Service $service)
    {
        if ($service->celebrity_id !== request()->user()->celebrityProfile->id) {
            abort(403);
        }

        // Prevent deletion if orders exist referencing this service
        if ($service->orders()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a service that has orders. Set status to paused instead.',
            ], 422);
        }

        $service->delete();

        return response()->json(['message' => 'Service deleted successfully']);
    }
}
