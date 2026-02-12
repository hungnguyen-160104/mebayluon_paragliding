# MBL Paragliding - Developer Guide

A full-stack Next.js application for paragliding spot management, bookings, and knowledge sharing.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ with pnpm
- MongoDB instance (local or Atlas)
- Docker & Docker Compose (optional)

### Local Development

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Start development server
pnpm dev
```

Visit `http://localhost:8080`

### Environment Variables

See `.env.example` for all required variables. Key ones:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `CLOUDINARY_URL` - Image hosting service
- `TELEGRAM_BOT_TOKEN` - For telegram notifications

## 📁 Project Structure

```
app/                 # Next.js App Router pages & layouts
components/          # Reusable React components
contexts/            # React context providers
controllers/         # API route handlers (business logic)
services/            # Business logic & external service integration
lib/                 # Utilities, configs, validators
- errors.ts         # Custom error classes
- logger.ts         # Structured logging
- env-validation.ts # Environment validation
- validation-schemas.ts # Zod schemas for validation
- api-response.ts   # Standard API response wrapper
middlewares/        # Express/Next middleware
models/             # MongoDB schemas/models
types/              # TypeScript type definitions
utils/              # Helper functions
```

## 🔧 Development

### Available Scripts

```bash
pnpm dev            # Start dev server
pnpm build          # Build for production
pnpm start          # Start production server
pnpm lint           # Run ESLint
pnpm typecheck      # Check TypeScript types
pnpm test           # Run tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Generate coverage report
```

### Code Quality

**TypeScript**: Strict type checking enabled

```bash
pnpm typecheck
```

**Linting**: ESLint for code style

```bash
pnpm lint
```

**Testing**: Jest for unit tests

```bash
pnpm test
```

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
pnpm docker:build

# Start with Docker Compose (includes MongoDB)
pnpm docker:up

# Stop containers
pnpm docker:down
```

## 🔐 Security Features

- ✅ Environment variable validation at startup
- ✅ JWT authentication middleware
- ✅ Input validation with Zod schemas
- ✅ Error handling with custom AppError class
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ HTTPS enforcement in production

## 📊 API Response Format

All API endpoints return a standardized response:

**Success (200-299)**:

```json
{
  "success": true,
  "data": {
    /* ... */
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

**Error (400+)**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      /* ... */
    }
  },
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## 🧪 Testing

### Run Tests

```bash
pnpm test
```

### Write Tests

Tests go in `__tests__/unit/` following the pattern:

- Filename: `*.test.ts` or `*.spec.ts`
- Use Jest matchers and assertions
- Mock external services

Example:

```typescript
describe("Auth Service", () => {
  it("should validate correct password", async () => {
    const result = await validateAdmin("admin", "password123");
    expect(result).toBe(true);
  });
});
```

## 📝 Logging

Use the structured logger for consistent logging:

```typescript
import { createLogger } from "@/lib/logger";

const logger = createLogger("ComponentName");

logger.debug("Debug message", { data: "value" });
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message", error);
```

## ❌ Error Handling

Use custom error classes for consistent error handling:

```typescript
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors";

// Validation error
throw new ValidationError("Invalid email", { field: "email" });

// Not found error
throw new NotFoundError("User");

// Unauthorized error
throw new UnauthorizedError("Invalid credentials");
```

## ✅ Input Validation

Use Zod schemas from `lib/validation-schemas.ts`:

```typescript
import { LoginSchema, formatValidationErrors } from "@/lib/validation-schemas";

const result = LoginSchema.safeParse(requestBody);
if (!result.success) {
  throw new ValidationError(
    "Invalid input",
    formatValidationErrors(result.error)
  );
}
```

## 🚀 Deployment

### Build

```bash
pnpm build
```

### Start

```bash
pnpm start
```

### Environment

Set environment variables in your hosting platform (Vercel, Railway, etc.)

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev)
- [MongoDB Documentation](https://docs.mongodb.com)

## 👥 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Check types: `pnpm typecheck`
6. Submit PR

## 📄 License

Private project - All rights reserved
