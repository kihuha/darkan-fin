# Darkan Finance

A modern family financial management application built with cutting-edge web technologies. Darkan Finance empowers families to collaborate on budgeting, track spending, manage categories, and maintain transparency in shared financial goals.

**Portfolio Project** | Developed by [Darius Kihuha](#developer)

---

## Features

- **Family Budget Management**: Create and manage budgets with real-time collaboration
- **Transaction Tracking**: Log, filter, and analyze spending with detailed transaction records
- **Category Management**: Organize transactions with customizable categories
- **Family Invitations**: Invite family members to collaborate with seamless onboarding
- **Dashboard Analytics**: Visualize financial data with interactive charts and reports
- **M-Pesa Integration**: Import transactions from M-Pesa payments (M-Pesa CSV import dialog)
- **User Authentication**: Secure authentication with email/password support via Better Auth
- **Responsive Design**: Mobile-friendly interface that works across all devices
- **Dark Mode Support**: Built-in theme switching with next-themes

---

## Tech Stack

### Frontend

- **Next.js 16**: React framework with App Router and server-side rendering
- **React 19**: Latest React version with improved rendering performance
- **TypeScript**: Type-safe development with full type coverage
- **Tailwind CSS 4**: Utility-first CSS framework with advanced features
- **Radix UI**: Headless component library for building accessible UIs
- **React Hook Form**: Efficient form handling with minimal re-renders
- **Recharts**: Composable charting library for data visualization
- **Zod**: TypeScript-first schema validation

### Backend

- **Next.js API Routes**: Serverless API endpoints
- **PostgreSQL**: Robust relational database
- **Better Auth**: Modern authentication framework for Next.js
- **pg & pg-promise**: Database client libraries for PostgreSQL

### Development & Testing

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **ESLint**: Code quality and linting
- **TypeScript Compiler**: Strict type checking

### Additional Libraries

- **Recharts**: Charts and data visualization
- **Sonner**: Toast notifications
- **Vaul**: Drawer/off-canvas components
- **Embla Carousel**: Carousel/slider component
- **XLSX**: Excel file parsing for data imports
- **Lucide React & Huge Icons**: Icon libraries
- **Date-fns**: Date manipulation and formatting

---

## Project Structure

```
darkan-fin/
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints
│   │   ├── auth/                 # Authentication routes
│   │   ├── budget/               # Budget management endpoints
│   │   ├── category/             # Category endpoints
│   │   ├── family/               # Family management endpoints
│   │   └── transaction/          # Transaction endpoints
│   ├── dashboard/                # Main dashboard pages
│   │   ├── budget/               # Budget page
│   │   ├── categories/           # Categories page
│   │   ├── settings/             # Settings page
│   │   ├── transaction/          # Transactions page
│   │   └── layout.tsx            # Dashboard layout
│   ├── invite/                   # Family invite acceptance
│   ├── signup/                   # User registration
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── components/                   # React components
│   ├── budget/                   # Budget components
│   ├── category/                 # Category components
│   ├── forms/                    # Form components
│   ├── settings/                 # Settings components
│   ├── transaction/              # Transaction components
│   ├── ui/                       # Reusable UI components (Radix-based)
│   ├── header.tsx                # Header component
│   └── content-wrapper.tsx       # Layout wrapper
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries
│   ├── auth-client.ts            # Authentication client
│   └── utils.ts                  # General utilities
├── utils/                        # Backend utilities
│   ├── auth.ts                   # Auth utilities
│   ├── db.ts                     # Database utilities
│   ├── route.ts                  # Route utilities
│   └── services/                 # Business logic services
├── types/                        # TypeScript type definitions
│   ├── api.ts                    # API response types
│   └── domain.ts                 # Domain entity types
├── public/                       # Static assets
├── app_migrations/               # Database migration scripts
├── __tests__/                    # Test files
├── jest.config.ts                # Jest configuration
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── eslint.config.mjs             # ESLint configuration
└── package.json                  # Project dependencies
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- PostgreSQL 12+
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd darkan-fin
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the project root:

   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/darkan_fin
   ```

4. **Run database migrations**

   ```bash
   npm run migrate
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

```bash
# Development
npm run dev              # Start development server

# Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking

# Testing
npm test                 # Run Jest tests
npm run test:ci          # Run tests in CI mode
npm run test:coverage    # Generate coverage report
```

---

## Key Features Deep Dive

### 1. Budget Management

- Create multiple budgets with spending limits
- Real-time budget vs. actual spending visualization
- Category-level budget allocation
- Budget tracking dashboard with charts

### 2. Transaction Management

- Add transactions manually or via M-Pesa import
- Filter transactions by date range, category, and type
- Detailed transaction table with sorting capabilities
- Transaction history and analytics

### 3. Family Collaboration

- Invite family members via email
- Role-based access control
- Shared budget views and analytics
- Family settings management

### 4. Authentication & Security

- Email-based authentication
- Session management with Better Auth
- Secure API endpoints with authentication middleware
- Password-protected accounts

### 5. User Interface

- Modern, responsive design with Tailwind CSS
- Accessible components built with Radix UI
- Interactive charts for financial insights
- Toast notifications for user feedback
- Dark mode support

---

## Database Schema

The application uses PostgreSQL with the following primary entities:

- **Users**: User accounts and authentication
- **Families**: Family units for grouping
- **FamilyMembers**: User memberships in families
- **Budgets**: Budget configurations and allocations
- **Categories**: Transaction categorization
- **Transactions**: Financial transaction records
- **Invitations**: Family member invitations

Database migrations are versioned in:

- `app_migrations/`: Application-specific migrations
- `better-auth_migrations/`: Authentication schema migrations

---

## Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm test -- --watch
```

Test files are located in the `__tests__/` directory and follow the same structure as the source code.

---

## Code Quality

### ESLint

Ensures code consistency and catches potential errors:

```bash
npm run lint
```

### TypeScript

Strict type checking throughout the project:

```bash
npm run typecheck
```

---

## Performance Optimizations

- **Next.js Optimization**: Server-side rendering and static generation where applicable
- **Code Splitting**: Automatic code splitting for faster page loads
- **Image Optimization**: Optimized image serving via Next.js Image component
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Component Memoization**: Optimized React component rendering

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Developer

**Darius Kihuha**

This portfolio project showcases:

- Full-stack web development with Next.js
- Modern React patterns and best practices
- TypeScript for type-safe development
- Database design and SQL
- Component architecture and reusability
- Testing and code quality practices
- UI/UX implementation with accessibility in mind

---

## License

This project is licensed under the terms specified in the LICENSE file.

---

## Acknowledgments

Built with:

- [Next.js](https://nextjs.org) - React Framework
- [Tailwind CSS](https://tailwindcss.com) - Utility CSS Framework
- [Radix UI](https://radix-ui.com) - Accessible Component Primitives
- [Better Auth](https://better-auth.js.org) - Authentication Framework
- [PostgreSQL](https://www.postgresql.org) - Database

---

## Getting Help

For issues, questions, or suggestions, please check the project's issue tracker.

---

**Last Updated**: February 2026
