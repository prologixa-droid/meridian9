# Meridian Operations Workbench

Meridian is a static, browser-based training environment for product taxonomy annotation, catalog issue management, and checkout regression QA. The trainee profile shown in the workspace is `trainee11`.

## Assignment at a glance

- **Batch:** PT-100, with exactly 100 product records across 15 cosmetic families.
- **Catalog evidence:** product name and variant, brand, packaging, net contents, GTIN, lot, description, ingredients, suitability, claims, directions, proposed taxonomy, and synthetic reference taxonomy.
- **Product imagery:** 100 offline SVG packshots across ten distinct color and graphic art directions, with varied cosmetics packaging, family-specific product colors, studio backdrops, and detailed front labels. No image API key or remote image host is required.
- **Learning goals:** complete 100 decisions/escalations, achieve at least 95% practice accuracy on scored labels, self-attest evidence review for every submission, provide a 20-character evidence rationale for changes/escalations, and resolve and verify the 8-check checkout exercise.
- **Ticket goal:** create tickets for actionable catalog issues and carry them through assignment, investigation, resolution, and closure with evidence and a correct product link.

## Product review workflow

1. Open **Product taxonomy v3** / **Label review** and select an item in Batch PT-100.
2. Inspect the whole packshot and every relevant catalog field. Use zoom when required.
3. Check **Evidence reviewed** only after inspecting the image and record.
4. Confirm the proposal, choose a better taxonomy path, or escalate an unresolved conflict.
5. Set your own confidence. Category changes and escalations require an evidence rationale of at least 20 characters.
6. Submit. The decision, confidence, inspected flag, and rationale are saved in browser local storage. A category mismatch to the bundled synthetic reference gives practice feedback.
7. Use **Outstanding** for pending and skipped items, and **Reviewed** for submitted decisions and escalations. Skipped records do not count as complete.

## Assignment goals and quality checks

The Overview goal board tracks submitted coverage, the sample accuracy target, exception documentation, and the most recent QA-run result. Coverage treats submitted category decisions and documented escalations as completed; skipped items remain outstanding. The accuracy value counts scored category decisions only and excludes escalations. All reference answers and scoring feedback are available in the client-side demo, so these measurements are practice feedback, not blind assessment scores.

## Ticket workflow

Create a ticket from a product review or from **Work tickets**. A ticket captures type, linked SKU, affected work area, business impact, priority, owner, optional due date and evidence reference, a 12-character summary, 40-character evidence description, and 20-character expected outcome. Active past-due work is marked overdue. The lifecycle is gated: **Open → In progress → Resolved → Closed**. Resolution requires a 20-character summary; closure is a separate review action; reopening requires a 20-character reason and returns the ticket to In progress. Internal notes require 20 characters. The list supports Active, Open, In progress, Resolved, Closed, and Overdue filters. Ticket changes and activity history are stored in this browser.

## Checkout QA workflow

**Test runs** hosts a self-contained storefront fixture and executes eight browser-DOM assertions covering product detail, cart, SAVE10 discount, delivery selection, guest checkout, order confirmation, notification state, and cart clearing. Build 184 has two intentional defects: SAVE10 leaves a $48.00 subtotal unchanged instead of reducing it to $43.20, and the confirmation view does not wait for the order-created event. Inspect the failures, select one or both scoped patch choices, apply the patch set, rerun the checks, and review the assertion results. Restore build 184 to repeat the exercise.

This runs in the browser against an embedded training fixture. It does not edit source code, connect to a staging/production shop, process payment, place a live order, send a real email, run Playwright, or invoke GitHub Actions.


## Written mock interview

The **Mock interview** workspace presents trainee11 with a fixed 30-question English assessment. The trainee reads one prompt, writes an answer, submits it, and continues to the next question. After the thirtieth answer, the complete question-and-answer transcript is sent to the authenticated Supabase Edge Function for server-side scoring. The report shows an overall percentage, rubric scores, evidence-based notes, strengths, and practice priorities. The trainee can download the answers and score; recent session history is kept in this browser. There is no microphone or voice-interview path in the main application.

The Supabase project URL and publishable key in `interview-config.js` are browser-safe project configuration. The OpenAI key and Supabase service-role key must only be stored as Supabase server secrets. The final score requires the server function and its configured OpenAI API key; the browser does not invent a local score. To configure the backend, enable anonymous sign-ins, apply the quota migration, set `OPENAI_API_KEY` as a Supabase secret, and deploy `mock-interview`:

```powershell
supabase link --project-ref mweohabshlexvbtuoldq
supabase db push
supabase secrets set OPENAI_API_KEY=your-server-side-key OPENAI_MODEL=gpt-6-astra
supabase functions deploy mock-interview
```

The function validates Supabase anonymous sessions, limits each practice profile to 60 model requests per rolling 24-hour period, and sends the written transcript to OpenAI Responses with `store: false`. The assessment is practice feedback, not a hiring decision system.
## Run and deploy

Open `index.html` in a current browser, or publish the files from the repository root with GitHub Pages (`Settings → Pages → Deploy from a branch → main → /(root)`). Product illustrations are embedded as SVG data URLs and therefore do not depend on relative asset paths or project-subpath configuration. To regenerate optional standalone copies under `assets/products/`, run:

```powershell
node work/generate-product-packshots.cjs
```

The generator creates the 100 current packshots and removes obsolete generated SKU assets beyond this batch.

## Data and assessment limits

The profile is not authenticated. Annotation progress, tickets, and QA history are stored locally in the browser and are not synchronized to reviewers. The `supabase/` directory contains a not-yet-integrated server-side review scaffold. This browser build must not be used for blind assessment because the reference labels and immediate feedback are shipped to the browser. A real assessed deployment requires the frontend to be wired to authenticated server submissions, private reference data, server scoring, and reviewer reporting.
