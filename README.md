# Dash Boat Tour

Production-oriented reservation and operations web application for luxury boat tours in Búzios, Cabo Frio and Arraial do Cabo, Rio de Janeiro.

**Live:** https://dashboat-production.up.railway.app

## Overview

Dash Boat combines a public booking experience with an authenticated administrative area for managing reservations and contacts. The project includes a Node.js/Express backend, server-side security controls, email delivery, automated tests, error monitoring and a Railway deployment pipeline.

## Engineering highlights

- Public reservation flow with validation and responsive UI.
- Administrative interface for reservation and contact operations.
- JWT authentication with password hashing, Helmet, CORS and rate limiting.
- Transactional email through Nodemailer/SMTP.
- Production error monitoring with Sentry.
- Automated unit/API and browser-level testing with Jest, Supertest, Playwright and Puppeteer.
- Webpack/Babel build tooling and Lighthouse-based performance auditing.
- Railway deployment with application health/restart configuration.

## Stack

| Area | Technologies |
| --- | --- |
| Runtime & API | Node.js, Express, JavaScript |
| Security | JWT, bcryptjs, Helmet, CORS, express-rate-limit |
| Delivery | Nodemailer, SMTP |
| Quality | Jest, Supertest, Playwright, Puppeteer, Lighthouse |
| Tooling | ESLint, Prettier, Husky, Webpack, Babel |
| Observability | Sentry |
| Infrastructure | Railway |

## Local development

Requirements: Node.js 16+ and npm.

```bash
git clone https://github.com/shivinhazen/dashboat.git
cd dashboat
npm install
cp .env.example .env
npm run dev
```

Configure the required environment variables in `.env` before exercising authenticated or email-dependent flows.

> Set `ADMIN_USER` and `ADMIN_PASSWORD` explicitly for every deployed environment. The source contains development fallbacks; do not rely on them outside isolated local development, and do not publish administrative credentials in documentation.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the application with Nodemon |
| `npm start` | Start the production server |
| `npm run build` | Produce the deployable build |
| `npm test` | Run the Jest test suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the repository with Prettier |
| `npm run bundle` | Create the production Webpack bundle |

## Architecture

The application is organized around an Express server, route/middleware layers, reusable services and a browser client. Authentication, email, logging and security concerns are isolated from the public UI, while automated tests exercise API and critical browser flows.

## License

MIT. See [`LICENSE`](./LICENSE).
