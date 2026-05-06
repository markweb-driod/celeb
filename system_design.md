# CelebStarsHub - Laravel + Modern Frontend
## Complete Technical Specification

**Version:** 1.0  
**Last Updated:** January 15, 2025  
**Stack:** Laravel 11 + Vue 3/React + MySQL 8  
**Status:** Ready for Development

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Database Schema (MySQL)](#database-schema)
4. [Laravel Backend Architecture](#laravel-backend)
5. [Frontend Architecture](#frontend-architecture)
6. [API Endpoints](#api-endpoints)
7. [UI/UX Design System](#design-system)
8. [Security & Deployment](#security-deployment)

---

## 1. Executive Summary

A marketplace platform connecting celebrities with fans for personalized services including:
- Digital fan cards & collectibles
- Personalized video messages  
- Private events (virtual/in-person)
- Birthday performances
- Meet & greets
- Exclusive content
- Merchandise
- Membership subscriptions

**Business Model:** 10-20% platform commission on transactions

---

## 2. Technology Stack

### Backend: Laravel 11
```json
{
  "php": "^8.2",
  "laravel/framework": "^11.0",
  "laravel/sanctum": "^4.0",
  "laravel/horizon": "^5.0",
  "laravel/scout": "^10.0",
  "spatie/laravel-permission": "^6.0",
  "spatie/laravel-media-library": "^11.0",
  "stripe/stripe-php": "^13.0",
  "pusher/pusher-php-server": "^7.0"
}
```

### Frontend Options

**Option 1: Vue 3 + TypeScript (Recommended)**
- Vue 3.4, Pinia, Vue Router 4
- Tailwind CSS, PrimeVue
- Vite 5, TypeScript 5.3

**Option 2: React + TypeScript**
- React 18, Zustand, React Router 6
- Tailwind CSS, Radix UI  
- TanStack Query, Vite 5

**Option 3: Inertia.js** 
- Seamless Laravel integration
- No separate API needed
- Server-side routing

### Database & Services
- **MySQL 8.0+** - Primary database
- **Redis 7.0+** - Cache, queues, sessions
- **Meilisearch** - Full-text search (or Algolia)
- **Stripe** - Payments
- **Pusher** - Real-time features
- **AWS S3** - File storage
- **Cloudflare** - CDN

---

## 3. Database Schema (MySQL)

### Users & Authentication

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('celebrity', 'fan', 'admin') NOT NULL,
    status ENUM('active', 'suspended', 'banned') DEFAULT 'active',
    email_verified_at TIMESTAMP NULL,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_user_type (user_type)
) ENGINE=InnoDB;

CREATE TABLE celebrity_profiles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED UNIQUE NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    bio TEXT,
    category VARCHAR(50) NOT NULL,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    profile_image_url TEXT,
    cover_image_url TEXT,
    social_links JSON,
    total_followers INT DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FULLTEXT idx_search (stage_name, bio)
) ENGINE=InnoDB;

CREATE TABLE fan_profiles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    total_bookings INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### Services

```sql
CREATE TABLE service_categories (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE services (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    celebrity_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED,
    service_type ENUM('fan_card', 'video_message', 'private_event', 
                      'birthday_performance', 'meet_greet', 'merchandise', 
                      'exclusive_content', 'membership') NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    images JSON,
    base_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    pricing_type ENUM('fixed', 'hourly', 'tiered') DEFAULT 'fixed',
    is_digital BOOLEAN DEFAULT FALSE,
    requires_booking BOOLEAN DEFAULT FALSE,
    max_delivery_days INT,
    duration_minutes INT,
    status ENUM('draft', 'active', 'paused') DEFAULT 'draft',
    total_sold INT DEFAULT 0,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (celebrity_id) REFERENCES celebrity_profiles(id) ON DELETE CASCADE,
    FULLTEXT idx_search (title, description)
) ENGINE=InnoDB;
```

### Orders & Bookings

```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    fan_id BIGINT UNSIGNED NOT NULL,
    celebrity_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    customization_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fan_id) REFERENCES fan_profiles(id),
    FOREIGN KEY (celebrity_id) REFERENCES celebrity_profiles(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status)
) ENGINE=InnoDB;

CREATE TABLE bookings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT UNSIGNED UNIQUE NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME,
    duration_minutes INT,
    location_type ENUM('virtual', 'in_person') NOT NULL,
    location_details JSON,
    video_call_url TEXT,
    booking_status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### Payments

```sql
CREATE TABLE transactions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    order_id BIGINT UNSIGNED,
    user_id BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM('payment', 'refund', 'payout') NOT NULL,
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE payouts (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    payout_number VARCHAR(50) NOT NULL UNIQUE,
    celebrity_id BIGINT UNSIGNED NOT NULL,
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_fees DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'completed') DEFAULT 'pending',
    stripe_payout_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (celebrity_id) REFERENCES celebrity_profiles(id)
) ENGINE=InnoDB;
```

### Reviews & Messaging

```sql
CREATE TABLE reviews (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT UNSIGNED UNIQUE NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    celebrity_id BIGINT UNSIGNED NOT NULL,
    reviewer_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    comment TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (celebrity_id) REFERENCES celebrity_profiles(id),
    FOREIGN KEY (reviewer_id) REFERENCES fan_profiles(id)
) ENGINE=InnoDB;

CREATE TABLE conversations (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT UNSIGNED,
    status ENUM('active', 'archived') DEFAULT 'active',
    last_message_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;

CREATE TABLE messages (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    content TEXT,
    attachments JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB;
```

---

## 4. Laravel Backend Architecture

### Directory Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── API/V1/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginController.php
│   │   │   │   ├── RegisterController.php
│   │   │   │   └── PasswordResetController.php
│   │   │   ├── Celebrity/
│   │   │   │   ├── ProfileController.php
│   │   │   │   ├── ServiceController.php
│   │   │   │   └── AnalyticsController.php
│   │   │   ├── ServiceController.php
│   │   │   ├── OrderController.php
│   │   │   ├── PaymentController.php
│   │   │   ├── MessageController.php
│   │   │   └── ReviewController.php
│   ├── Middleware/
│   │   ├── IsCelebrity.php
│   │   ├── IsFan.php
│   │   └── CheckServiceOwnership.php
│   ├── Requests/
│   │   ├── Service/CreateServiceRequest.php
│   │   └── Order/CreateOrderRequest.php
│   └── Resources/
│       ├── UserResource.php
│       ├── CelebrityResource.php
│       ├── ServiceResource.php
│       └── OrderResource.php
├── Models/
│   ├── User.php
│   ├── CelebrityProfile.php
│   ├── FanProfile.php
│   ├── Service.php
│   ├── Order.php
│   ├── Booking.php
│   ├── Transaction.php
│   └── Review.php
├── Services/
│   ├── AuthService.php
│   ├── CelebrityService.php
│   ├── ServiceManagementService.php
│   ├── OrderService.php
│   ├── PaymentService.php
│   ├── StripeService.php
│   └── SearchService.php
├── Repositories/
│   ├── UserRepository.php
│   ├── ServiceRepository.php
│   └── OrderRepository.php
├── Jobs/
│   ├── ProcessPayment.php
│   ├── SendBookingReminder.php
│   └── ProcessPayout.php
├── Events/
│   ├── OrderCreated.php
│   └── BookingConfirmed.php
└── Listeners/
    ├── SendOrderConfirmationEmail.php
    └── NotifyCelebrityOfNewOrder.php
```

### Key Laravel Patterns

**Repository Pattern**
```php
interface ServiceRepositoryInterface {
    public function find(int $id): ?Service;
    public function create(array $data): Service;
    public function search(array $filters): Collection;
}

class ServiceRepository implements ServiceRepositoryInterface {
    public function search(array $filters): Collection {
        return Service::query()
            ->when($filters['category'] ?? null, fn($q, $cat) => 
                $q->where('category_id', $cat))
            ->when($filters['min_price'] ?? null, fn($q, $price) => 
                $q->where('base_price', '>=', $price))
            ->get();
    }
}
```

**Service Layer**
```php
class OrderService {
    public function createOrder(FanProfile $fan, array $data): Order {
        $service = Service::findOrFail($data['service_id']);
        
        $subtotal = $this->calculateSubtotal($service, $data);
        $platformFee = $subtotal * ($service->celebrity->commission_rate / 100);
        $total = $subtotal + $platformFee;
        
        $order = Order::create([
            'order_number' => $this->generateOrderNumber(),
            'fan_id' => $fan->id,
            'celebrity_id' => $service->celebrity_id,
            'service_id' => $service->id,
            'subtotal' => $subtotal,
            'platform_fee' => $platformFee,
            'total_amount' => $total,
            'customization_data' => $data['customization_data'] ?? null,
        ]);
        
        event(new OrderCreated($order));
        ProcessPayment::dispatch($order, $data['payment_method_id']);
        
        return $order;
    }
}
```

---

## 5. Frontend Architecture (Vue 3)

### Directory Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button.vue
│   │   ├── Input.vue
│   │   └── Modal.vue
│   ├── celebrity/
│   │   ├── CelebrityCard.vue
│   │   └── CelebrityProfile.vue
│   └── service/
│       ├── ServiceCard.vue
│       └── ServiceDetail.vue
├── composables/
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── useNotifications.ts
├── layouts/
│   ├── DefaultLayout.vue
│   └── DashboardLayout.vue
├── pages/
│   ├── Home.vue
│   ├── Login.vue
│   ├── Celebrities/
│   │   ├── Index.vue
│   │   └── Show.vue
│   ├── Dashboard/
│   │   ├── Celebrity/
│   │   │   ├── Overview.vue
│   │   │   └── Services.vue
│   │   └── Fan/
│   │       └── Bookings.vue
│   └── Checkout/
│       ├── Details.vue
│       └── Payment.vue
├── stores/
│   ├── auth.ts
│   ├── services.ts
│   └── cart.ts
├── services/
│   ├── api.ts
│   ├── auth.service.ts
│   └── service.service.ts
├── router/
│   └── index.ts
└── types/
    └── index.ts
```

### Key Components

**Composable Example**
```typescript
// composables/useAuth.ts
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const authStore = useAuthStore()
  const loading = ref(false)
  
  const login = async (credentials) => {
    loading.value = true
    try {
      const response = await authService.login(credentials)
      authStore.setUser(response.data.user)
      authStore.setToken(response.data.access_token)
      return response
    } finally {
      loading.value = false
    }
  }
  
  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isCelebrity: computed(() => authStore.isCelebrity),
    login,
    loading
  }
}
```

**Pinia Store**
```typescript
// stores/auth.ts
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token')
  }),
  
  getters: {
    isCelebrity: (state) => state.user?.user_type === 'celebrity',
    isFan: (state) => state.user?.user_type === 'fan'
  },
  
  actions: {
    setUser(user) {
      this.user = user
      this.isAuthenticated = true
    },
    
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },
    
    clearAuth() {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      localStorage.removeItem('token')
    }
  }
})
```

---

## 6. API Endpoints

**Base URL:** `/api/v1`

### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/reset-password
```

### Celebrities
```
GET    /celebrities
GET    /celebrities/{id}
GET    /celebrities/search?q={query}
POST   /celebrities/{id}/follow
DELETE /celebrities/{id}/follow
```

### Services
```
GET    /services
GET    /services/{id}
GET    /services/search
POST   /celebrity/services
PUT    /celebrity/services/{id}
DELETE /celebrity/services/{id}
```

### Orders & Bookings
```
GET    /orders
POST   /orders
GET    /orders/{id}
DELETE /orders/{id}/cancel
POST   /bookings
GET    /bookings/{id}
```

### Payments
```
POST   /payments/create-intent
POST   /payments/confirm
GET    /payments/methods
POST   /payments/methods
```

### Example Request/Response

```json
POST /api/v1/orders
{
  "service_id": 123,
  "customization_data": {
    "recipient_name": "Jane",
    "occasion": "Birthday"
  }
}

Response 201:
{
  "success": true,
  "data": {
    "id": 456,
    "order_number": "ORD-2025-000456",
    "status": "pending",
    "total_amount": 99.99,
    "payment_intent_id": "pi_xxx"
  }
}
```

---

## 7. UI/UX Design System

### Color Palette
```css
--primary: #6366F1;
--primary-dark: #4F46E5;
--secondary: #EC4899;
--success: #10B981;
--error: #EF4444;
--gray-900: #111827;
--gray-100: #F3F4F6;
```

### Typography
```css
--font-primary: 'Inter', sans-serif;
--font-heading: 'Poppins', sans-serif;

--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
```

### Key Pages

**Homepage**
- Hero section with search
- Featured celebrities grid
- Service categories
- How it works
- Testimonials

**Celebrity Profile**
- Cover image & avatar
- Bio & verification badge
- Services grid
- Reviews section
- Follow button

**Service Detail**
- Image carousel
- Description
- Pricing
- Booking widget (sticky)
- Related services

**Dashboards**
- Celebrity: Revenue stats, services, bookings, analytics
- Fan: Bookings, orders, following, messages

---

## 8. Security & Deployment

### Security
- JWT authentication (Laravel Sanctum)
- CSRF protection
- Rate limiting
- Input validation
- XSS protection
- SQL injection prevention
- PCI DSS compliance (via Stripe)

### Deployment

**Development**
```bash
Laravel Sail (Docker)
./vendor/bin/sail up
```

**Production (Laravel Forge Recommended)**
- Automated deployments
- Zero-downtime releases
- SSL certificates
- Queue workers
- Scheduled jobs
- Server monitoring

**Performance**
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
composer install --optimize-autoloader --no-dev
```

---

## Implementation Roadmap

### Phase 1 (Months 1-2): Foundation
- Database setup
- Authentication system
- User profiles
- Basic API endpoints

### Phase 2 (Months 3-4): Core Features
- Service CRUD
- Booking system
- Payment integration
- Messaging

### Phase 3 (Months 5-6): Enhancement
- Search & discovery
- Analytics dashboard
- Reviews
- Admin panel

### Phase 4 (Month 7): Launch
- Testing
- Performance optimization
- Beta launch
- Marketing
