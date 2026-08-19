# Axon Capital

Investment platform with cryptocurrency deposits, strategy management, referral system, and Telegram integration.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (beta)
- **Styling**: Tailwind CSS
- **UI Animations**: Framer Motion
- **3D Graphics**: Three.js / React Three Fiber
- **Email**: Resend
- **File Storage**: Cloudinary
- **Rate Limiting**: Upstash Redis
- **Payments**: OxaPay (crypto deposits/withdrawals)
- **Notifications**: Telegram Bot
- **Hosting**: Vercel

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL database (Neon recommended)

### Installation

```bash
# Clone the repository
git clone git@gitlab.com:skilllzhello/axon.git
cd axon

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Environment Variables

Create a `.env.local` file in the root directory:

### Required Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://..."
# Or use Vercel's Neon integration:
# POSTGRES_PRISMA_URL="..."
# POSTGRES_URL="..."

# Authentication
AUTH_SECRET="your-secret-key-min-32-chars"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

### Optional Variables

```env
# App URL (auto-detected on Vercel)
AUTH_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Vercel Environment (auto-set by Vercel)
NEXT_PUBLIC_VERCEL_ENV="development" # development | preview | production

# Cloudinary (for avatars and file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_AVATAR_FOLDER="axon/avatars"

# Upstash Redis (for rate limiting and realtime)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# OxaPay (crypto payments)
OXAPAY_MERCHANT_API_KEY="your-merchant-key"      # For deposits
OXAPAY_PAYOUT_API_KEY="your-payout-key"          # For withdrawals
OXAPAY_BASE_URL="https://api.oxapay.com"
OXAPAY_CALLBACK_URL="https://your-domain.com/api/oxapay/webhook"

# Telegram Integration
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_BOT_USERNAME="your_bot_username"
TELEGRAM_LOGIN_BOT_USERNAME="your_bot_username"
TELEGRAM_WEBHOOK_SECRET="your-webhook-secret"
TELEGRAM_LOGIN_SECRET="your-login-secret"
TELEGRAM_MODULE_ENABLED="true"

# Cron Jobs (Vercel Cron)
CRON_SECRET="your-cron-secret"

# Profit Calculation (minutes)
PROFIT_PERIOD_MINUTES="1440"  # 1440 = daily (24h), 1 = every minute (test mode)

# Project Name (for emails)
PROJECT_NAME="Axon"
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin panel routes
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   ├── (terminal)/        # Main dashboard/terminal
│   ├── api/               # API routes
│   │   ├── admin/         # Admin API endpoints
│   │   ├── auth/          # NextAuth handlers
│   │   ├── cron/          # Cron job endpoints
│   │   ├── oxapay/        # Payment webhooks
│   │   ├── telegram/      # Telegram bot webhooks
│   │   └── wallet/        # Wallet operations
│   └── components/        # App-level components
│
├── modules/               # Feature modules
│   ├── admin/            # Admin panel logic
│   ├── affiliate/        # Referral system
│   ├── identity/         # Authentication & user management
│   ├── knowledge-center/ # Educational content
│   ├── operations/       # Transaction history
│   ├── strategies/       # Investment strategies
│   ├── telegram/         # Telegram integration
│   └── wallet/           # Deposits & withdrawals
│
├── shared/               # Shared utilities
│   ├── hooks/           # React hooks
│   ├── lib/             # Utility functions
│   └── ui/              # UI components
│
└── types/               # TypeScript declarations
```

---

## NPM Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript check

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Utilities
npm run telegram:setup-webhook    # Set up Telegram webhook
```

---

## Integrations

### 1. Database (Neon PostgreSQL)

The app uses Neon serverless PostgreSQL with Prisma ORM.

**Setup:**
1. Create a Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Set `DATABASE_URL` or use Vercel Neon integration

**Prisma Commands:**
```bash
npm run db:generate    # After schema changes
npm run db:migrate     # Apply migrations
npm run db:studio      # Visual database browser
```

### 2. Authentication (NextAuth.js v5)

Supports multiple auth methods:
- **Credentials**: Email + password with OTP verification
- **Google OAuth**: Social login
- **Telegram**: Login via Telegram widget

**Configuration:** `src/modules/identity/lib/auth.ts`

**Session Strategy:** JWT-based sessions

### 3. Email (Resend)

Used for:
- OTP verification codes
- Password reset links
- Notification emails

**Configuration:** `src/modules/identity/lib/email.ts`

### 4. File Storage (Cloudinary)

Used for:
- User avatars
- Knowledge center PDFs
- Uploaded images

**Configuration:** `src/shared/lib/cloudinary-storage.ts`

### 5. Payments (OxaPay)

Cryptocurrency payment provider for:
- **Deposits**: Create payment links, receive webhooks
- **Withdrawals**: Process crypto payouts

**Webhook URL:** `/api/oxapay/webhook`

**Configuration:** `src/modules/wallet/lib/oxapay-config.ts`

**Supported currencies:**
- USDT (Polygon, TRC20, ERC20)
- And others configured in OxaPay dashboard

### 6. Telegram Bot

Features:
- Login via Telegram
- Real-time notifications (deposits, profits, withdrawals)
- Account linking

**Webhook URL:** `/api/telegram/webhook`

**Setup Webhook:**
```bash
npm run telegram:setup-webhook
```

**Configuration:** `src/modules/telegram/lib/telegram-config.ts`

### 7. Rate Limiting (Upstash Redis)

Prevents abuse on sensitive endpoints:
- Login attempts
- OTP requests
- API calls

**Configuration:** `src/shared/lib/rate-limit-redis.ts`

### 8. Realtime Updates (Upstash Redis)

Server-Sent Events (SSE) for real-time dashboard updates:
- Deposit confirmations
- Strategy profits
- Referral payouts

**SSE Endpoint:** `/api/realtime/terminal`

---

## Cron Jobs

Cron jobs are triggered via Vercel Cron (or external scheduler):

| Endpoint | Purpose | Schedule |
|----------|---------|----------|
| `/api/cron/run-daily-strategy-profit` | Calculate daily profits | Every minute (test) / Daily (prod) |
| `/api/cron/referral-payouts` | Process referral payouts | Every minute (test) / Daily (prod) |
| `/api/cron/recalc-referral-levels` | Recalculate referral levels | Daily |
| `/api/cron/sync-withdrawals` | Sync withdrawal statuses | Every 5 minutes |

**Security:** Crons should include `CRON_SECRET` header for validation.

---

## Environment Modes

The app has two modes controlled by `NEXT_PUBLIC_VERCEL_ENV`:

| Mode | Env Value | Behavior |
|------|-----------|----------|
| **Test** | `development`, `preview` | Profits calculated every minute |
| **Production** | `production` | Profits calculated daily |

**Logic:** `src/shared/lib/env.ts`

---

## Feature Flags

Database-controlled feature toggles:

| Flag Key | Purpose |
|----------|---------|
| `telegram_integration` | Enable/disable Telegram features |

**Management:** Admin panel or database directly

---

## User Roles

| Role | Access |
|------|--------|
| `USER` | Standard user access |
| `ADMIN` | Admin panel access |
| `SUPERADMIN` | Full access + user management |

---

## Database Schema

Key models (see `prisma/schema.prisma`):

- **User**: User accounts with auth data
- **Wallet**: User balances
- **Deposit**: Crypto deposits
- **Withdrawal**: Withdrawal requests
- **Strategy**: Investment strategies
- **StrategyProfit**: Daily profit records
- **ReferralLevel**: Unlocked referral tiers
- **ReferralPayout**: Referral commissions
- **WebhookLog**: Idempotent webhook processing
- **AuditLog**: Security audit trail
- **FeatureFlag**: Feature toggles
- **KnowledgeItem**: Educational content

---

## Deployment (Vercel)

### Automatic Deployment

Push to `development` branch for preview, `main` for production.

### Environment Setup

1. Connect Neon database via Vercel integration
2. Set all environment variables in Vercel dashboard
3. Configure cron jobs in `vercel.json`

### Build Command

```json
{
  "buildCommand": "npm run db:generate && npm run build"
}
```

---

## Admin Panel

Access at `/admin` (requires ADMIN or SUPERADMIN role).

**Features:**
- User management
- Deposit confirmation
- Withdrawal approval
- Feature flag toggles
- Knowledge center management

---

## Security

- Password hashing: bcryptjs
- Rate limiting on auth endpoints
- HMAC validation for Telegram
- Webhook idempotency via `WebhookLog`
- Audit logging for sensitive operations
- JWT tokens with secure cookies

---

## Troubleshooting

### Database Connection Issues
```bash
# Check connection
npm run db:studio

# Regenerate client after schema changes
npm run db:generate
```

### Telegram Webhook Not Working
```bash
# Re-setup webhook
npm run telegram:setup-webhook

# Check bot token is correct
echo $TELEGRAM_BOT_TOKEN
```

### OxaPay Webhooks Not Received
1. Check `OXAPAY_CALLBACK_URL` is publicly accessible
2. Verify OxaPay dashboard callback settings
3. Check `WebhookLog` table for errors

### Email Not Sending
1. Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
2. Check Resend dashboard for errors
3. Ensure domain is verified in Resend

---

## License

Private repository. All rights reserved.
