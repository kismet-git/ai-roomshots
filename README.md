# AI Roomshots

Production-focused Next.js application that stages user-supplied product photos in photorealistic interior scenes. The app offers a guided flow for uploading a rug or decor image, choosing room configuration, generating a preview via Nano Bana services, and exporting a high-resolution composite with credit enforcement and watermarking rules.

## Tech Stack
- Next.js 14 (App Router, TypeScript)
- React 18, Tailwind CSS
- Vercel serverless API routes for preview/export/checkouts
- Stripe Checkout for purchasing credit packs
- `@napi-rs/canvas` watermark rendering on exports

## Getting Started
1. Install dependencies (requires access to npm registry):
   ```bash
   npm install
   ```
2. Create a `.env.local` file with the required environment variables:
   ```bash
   NANO_BANA_API_KEY=[NANO_BANA_API_KEY]
   GENERATION_API_ENDPOINT=https://nano-bana.example.com/generate
   EDIT_API_ENDPOINT=https://nano-bana.example.com/edit
   STRIPE_SECRET_KEY=[STRIPE_SECRET_KEY]
   STRIPE_PRICE_CREDIT_PACK=[STRIPE_PRICE_ID]
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY]
   NEXTAUTH_SECRET=[NEXTAUTH_SECRET]
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to use the interface.

## Key Features
- **Upload & Validation** – Drag-and-drop or browse for PNG/JPG/WEBP files (≤15 MB). Client converts files to base64 data URLs before sending to the preview API.
- **Configuration Controls** – Dropdown selections for room type/style automatically generate the AI prompt displayed to the user.
- **Preview Pipeline** – `/api/preview` validates payloads, enforces a 15 MB limit server-side, calls Nano Bana scene generation + edit endpoints at 1024×1024, and returns a base64 preview string for immediate rendering.
- **Export Pipeline** – `/api/export` re-runs the AI pipeline at 2048×2048, enforces anonymous free usage, debits credits, applies watermark via canvas when required, and streams binary responses by default.
- **Credits & Paywall** – Lightweight in-memory credit evaluator with `/api/credits` endpoint and client-side modal prompting login/purchase.
- **Stripe Checkout** – `/api/create-checkout-session` serverless function creates Checkout Sessions using the configured price ID.

## Testing & Linting
- `npm run lint` – ESLint via `next lint`
- `npm run build` – Next.js production build (includes type-check)

> Note: Serverless routes rely on environment variables for external services. Keep API keys private and configure them in Vercel for production deployments.
