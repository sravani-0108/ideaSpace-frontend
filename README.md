# IdeaSpace Frontend

A modern React frontend for the IdeaSpace application, built with TypeScript, React Router, and Tailwind CSS.

## Features

- **User Authentication**: Register, email verification, and login
- **Idea Management**: Create, view, and manage ideas
- **Social Features**: Like and comment on ideas
- **Admin Panel**: Review and approve/reject ideas (admin only)
- **Responsive Design**: Beautiful, modern UI that works on all devices

## Tech Stack

- React 18
- TypeScript
- React Router v6
- Axios (for API calls)
- Tailwind CSS (for styling)
- Vite (build tool)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

If not set, it defaults to `http://localhost:5000/api`.

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components (Navbar, ProtectedRoute)
├── contexts/         # React contexts (AuthContext)
├── pages/           # Page components
│   ├── Register.tsx
│   ├── VerifyEmail.tsx
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── CreateIdea.tsx
│   ├── IdeaDetails.tsx
│   ├── MyIdeas.tsx
│   └── AdminReview.tsx
├── services/        # API service functions
│   ├── api.ts
│   ├── auth.service.ts
│   ├── idea.service.ts
│   ├── comment.service.ts
│   ├── like.service.ts
│   └── admin.service.ts
├── types/           # TypeScript type definitions
│   └── index.ts
├── App.tsx          # Main app component with routing
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Features Overview

### Authentication
- User registration with email verification
- Secure login with JWT tokens
- Protected routes for authenticated users
- Admin-only routes

### Idea Management
- View all approved ideas on the dashboard
- Create new ideas (requires authentication)
- View idea details with comments and likes
- Track your own ideas with status indicators

### Social Features
- Like/unlike ideas
- Comment on ideas
- View like and comment counts

### Admin Features
- Review pending ideas
- Approve or reject ideas
- View all ideas awaiting review

## API Integration

The frontend communicates with the backend API at `/api`. All authenticated requests automatically include the JWT token in the Authorization header.

## Environment Variables

- `VITE_API_URL`: Backend API URL (default: `http://localhost:5000/api`)

