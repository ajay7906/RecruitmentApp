# Recruit API – Auth module (V1)

1. `cp .env.example .env` and fill values
2. `createdb recruit_db`
3. `npm install`
4. `npm run migrate`
5. `npm run dev`

Base URL: `/api/v1`. Access token: `Authorization: Bearer <jwt>`. Refresh token: httpOnly cookie (send with `credentials: 'include'`).
