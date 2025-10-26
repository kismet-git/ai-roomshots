# AI Roomshots Planning Deliverable

## 1. High-Level Architecture Outline
### Client Flow
- Next.js App Router page manages state for `uploadedFile`, `roomType`, `roomStyle`, `previewImage`, `isGenerating`, and `creditsStatus`.
- Upload widget accepts PNG/JPG/WEBP files up to 15 MB and converts them to base64 data URLs before sending to server.
- `/api/preview` is invoked with multipart form data containing the base64-encoded file and configuration choices. The response returns a preview data URL for immediate rendering.
- Users can regenerate by re-calling `/api/preview`. Proceeding to export stores selected options and fingerprint/session identifiers for `/api/export`.

### Preview Pipeline (`/api/preview`)
- Validate multipart payload: file presence, size ≤ 15 MB, mime type, `roomType`, and `roomStyle`.
- Compose `prompt` from room metadata; request body to `[GENERATION_API_ENDPOINT]` (`POST`) contains:
  ```json
  {
    "prompt": "[PROMPT_TEXT]",
    "roomType": "[ROOM_TYPE]",
    "roomStyle": "[ROOM_STYLE]",
    "targetResolution": { "width": 2048, "height": 2048 }
  }
  ```
- Receive `{ "status": "ok", "imageBase64": "data:image/jpeg;base64,..." }` and pass `imageBase64` with the uploaded product image (converted to base64) to `[EDIT_API_ENDPOINT]`:
  ```json
  {
    "baseImage": "data:image/jpeg;base64,...",
    "productImage": "data:image/jpeg;base64,...",
    "transform": {
      "perspectiveCorrect": true,
      "lightingMatch": true,
      "shadow": true
    }
  }
  ```
- Return `{ previewImage: "data:image/jpeg;base64,...", previewMimeType: "image/jpeg", expiresAt: ISO8601 }`. Entire pipeline uses in-memory buffers only; no filesystem writes.

### Export Pipeline (`/api/export`)
- Authenticate via NextAuth credentials session or anonymous fingerprint (`ai-roomshots-fp` UUID in localStorage).
- Enforce credit policy:
  - Anonymous fingerprint allowed one high-res export without login; tracked via `[ANON_FPRINT_TABLE]` in-memory map (`fingerprint -> freeExportUsed: boolean`).
  - Authenticated users require available credits loaded from `[USER_CREDITS_TABLE]` (schema: `user_id | credits_remaining | last_modified`).
- Invoke generation + edit APIs again targeting 2048×2048 output. Responses identical to preview but with full-resolution buffers.
- If watermark required (anonymous free export), overlay text "AI Roomshots Preview" (sans-serif, white, 30% opacity, thin black shadow) positioned bottom-right, offset 24 px, width ≈ 20% of image width, before encoding final bytes.
- Send binary response with `Content-Type` of requested format (`image/jpeg` default, or `image/png`). Fallback dev mode allows JSON with base64 when `Accept: application/json`.

### Payment & Credits
- `/api/create-checkout-session` creates Stripe Checkout Session using `STRIPE_PRICE_CREDIT_PACK`; frontend redirects user to returned URL.
- Future webhook `/api/stripe/webhook` increments credits upon `checkout.session.completed`.

### Infrastructure Considerations
- Vercel serverless functions remain stateless; all temporary data stored in request scope or ephemeral tokens embedded in responses.
- Request logging includes UUID `requestId`, route name, status, room configuration, fingerprint/user id, and latency. No image data or prompts logged.
- Secrets configured via Vercel environment variables:
  - `NANO_BANA_API_KEY`
  - `PHOTO_EDITOR_API_KEY`
  - `NEXTAUTH_SECRET`
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_PRICE_CREDIT_PACK`

## 2. Data Contracts
### `/api/preview`
- **Request** `multipart/form-data`
  - `file`: base64 data URL for PNG/JPG/WEBP product image (required, ≤15 MB).
  - `roomType`: enum `living_room | bedroom | dining_room | patio | entryway | nursery` (required).
  - `roomStyle`: enum `modern | contemporary | boho | coastal | industrial | farmhouse | luxury` (required).
  - `clientSession`: opaque string for anonymous tracking/rate limiting (optional).
- **Success Response** `200 application/json`
  ```json
  {
    "previewImage": "data:image/jpeg;base64,...",
    "previewMimeType": "image/jpeg",
    "expiresAt": "[PREVIEW_EXPIRY_ISO]",
    "metadata": {
      "roomType": "[ROOM_TYPE]",
      "roomStyle": "[ROOM_STYLE]",
      "prompt": "[PROMPT_TEXT]"
    }
  }
  ```
- **Errors**
  - `400 validation_error` – field-level validation details.
  - `413 file_too_large` – includes `maxMb: 15`.
  - `429 rate_limited` – includes `retryAfterSeconds`.
  - `500 generation_failed` – includes opaque `requestId`.

### `/api/export`
- **Request** `application/json`
  ```json
  {
    "roomType": "[ROOM_TYPE]",
    "roomStyle": "[ROOM_STYLE]",
    "sourcePreviewToken": "[PREVIEW_TOKEN]",
    "clientSession": "[ANON_FINGERPRINT]",
    "format": "jpg" // or "png"
  }
  ```
- **Success Response**
  - Default: binary payload with `Content-Type: image/jpeg` (or `image/png`) and `Content-Disposition: attachment; filename="ai-roomshot.[ext]"`.
  - Development fallback (only when negotiated via header):
    ```json
    {
      "finalImage": "data:image/jpeg;base64,...",
      "finalMimeType": "image/jpeg",
      "resolution": { "width": 2048, "height": 2048 },
      "watermarked": true,
      "creditsRemaining": 0,
      "expiresAt": "[FINAL_EXPIRY_ISO]"
    }
    ```
- **Errors**
  - `400 validation_error` – invalid payload or unsupported format.
  - `401 auth_required` – login required (free export already used).
  - `402 payment_required` – insufficient credits, returns `creditsRemaining`.
  - `404 preview_not_found` – stale or missing `sourcePreviewToken` if re-use attempted.
  - `429 rate_limited` – quota or abuse mitigation.
  - `500 export_failed` – includes `requestId`.

### `/api/create-checkout-session`
- **Request** `application/json`
  ```json
  {
    "successUrl": "[SUCCESS_URL]",
    "cancelUrl": "[CANCEL_URL]"
  }
  ```
- **Success Response** `200`
  ```json
  { "checkoutUrl": "https://checkout.stripe.com/..." }
  ```
- **Errors** – `400 validation_error`, `500 stripe_error` with `requestId`.

## 3. Open Questions
1. Should preview responses include reusable tokens to avoid re-uploading product data for export, or is re-upload acceptable within current latency budget?
2. How should the in-memory `[ANON_FPRINT_TABLE]` be implemented for multi-region Vercel deployments where functions do not share state (e.g., edge caching, KV store)?
3. Is there a preferred library for server-side watermark rendering (e.g., Sharp vs. Canvas) given Vercel runtime constraints and bundle size?
4. Do we require configurable retry/backoff policy if either Nano Bana endpoint intermittently fails within the 30 s SLA?
5. Should Stripe webhooks be included in MVP scope or deferred until after manual credit grants for testing?
6. What monitoring/alerting solution (e.g., Sentry, Vercel Log Drains) should be integrated first for production readiness?
