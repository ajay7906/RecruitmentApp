# Recruitro Frontend (JavaScript)

A feature-based React + Vite starter for a multi-role recruitment platform. This project uses plain JavaScript/JSX — no TypeScript.

## Included

- React + Vite
- React Router
- TanStack Query for backend/server state
- Zustand for lightweight client/UI state
- Axios API client
- React Hook Form + Zod validation
- Tailwind CSS
- Lucide icons and Sonner toast notifications
- Candidate, Recruiter, and Admin dashboard shells
- Centralized API client and example feature API modules
- `.env.example` and ESLint

## Run locally

Requirements: Node.js 20.19+ or 22.12+ recommended for current Vite.

1. Extract the ZIP.
2. Open a terminal inside the `recruitro-frontend` folder.
3. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your actual backend URL.
4. Run:

```bash
npm install
npm run dev
```

5. Open the URL Vite prints (usually http://localhost:5173).

Other commands:

```bash
npm run lint
npm run build
npm run preview
```

## Important: connect your existing backend

The login, register, and profile endpoints are deliberately not guessed. Update these files to match your real backend contracts:

- `src/features/auth/api/authApi.js`
- `src/features/candidate-profile/api/profileApi.js`
- `src/lib/apiClient.js`
- `src/app/router.jsx`

The example login API expects `POST /auth/login`, registration expects `POST /auth/register`, and profile expects `GET /candidate/profile` only as placeholders. Change the paths, request fields, response parsing, and role names to your actual API. A request returning a different response shape will need adjustment.

Security notes:
- Frontend route guards improve navigation UX; they are not authorization. Enforce every permission on the backend.
- If your backend uses HTTP-only cookies, enable `withCredentials` and configure CORS on the backend. Do not put HTTP-only session cookies in JavaScript.
- Do not add secrets to `VITE_*` variables; Vite exposes them to the browser.
- The Zustand auth store is an in-memory UI convenience. On page refresh, use your backend's session endpoint/cookie flow to restore the user rather than assuming a stored role is trusted.
- Add CSRF protections appropriate to your cookie/session design.

## Folder architecture

```text
src/
├── app/
│   ├── layouts/
│   ├── providers.jsx
│   └── router.jsx
├── components/
│   ├── feedback/
│   ├── shared/
│   └── ui/
├── features/
│   ├── admin/
│   ├── applications/
│   ├── auth/
│   ├── candidate-profile/
│   ├── interviews/
│   ├── jobs/
│   └── recruiter/
├── hooks/
├── lib/
├── stores/
├── styles/
├── utils/
├── App.jsx
└── main.jsx
```

This is a starter architecture, not a claim that the frontend is already integrated with your backend. Verify the API contracts before wiring live data.
