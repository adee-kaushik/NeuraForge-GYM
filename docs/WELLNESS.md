# Member workout and diet options

Reviewed 13 November 2026. The generator uses deterministic, conservative templates for adults 18–64. It adapts equipment, starting training volume, weekly availability, meal ingredients, food exclusions and portion guidance. It does not prescribe calories from BMI or claim clinical individualisation.

## Sources and interpretation

- ICMR–NIN, Dietary Guidelines for Indians (2024): https://www.nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf — variety across food groups, vegetables/legumes, whole grains, food-first protein, moderated oils/sugar/salt. Menus use dal, chana, rajma, rice/roti, local produce and optional eggs/chicken/fish. They are our meal combinations, not NIN-issued prescriptions.
- WHO guidelines on physical activity and sedentary behaviour: https://www.who.int/publications/i/item/9789240015128 — work gradually toward 150–300 moderate minutes weekly plus strength activity on at least two days. Work and transport activity count.
- NHS strength exercises: https://www.nhs.uk/live-well/exercise/strength-exercises/ — stable-chair sit-to-stand, wall press-ups and gradual progression support a low-equipment starting point. The generated schedules and exercise swaps are implementation choices, not quoted NHS routines.
- CDC BMI overview: https://www.cdc.gov/bmi/about/index.html — BMI is screening information and cannot distinguish muscle from fat. No BMI diagnostic label is shown. Underweight or very high BMI values prompt individual review rather than automated restriction.

## Safeguards and limitations

Users with health restrictions, pregnancy/postpartum needs, injuries, eating disorders, unlisted allergies, or ages outside scope are directed to qualified help. Food substitutions exclude selected ingredients, but food labels and cross-contact still need checking. Portions are illustrative cooked servings; there are no guaranteed prices, macro calculations, supplement recommendations, crash diets or guaranteed outcomes. Members choose one routine, not all four. W raises are explicitly not a substitute for loaded pulling.

Assigned workout/diet plans are immutable text snapshots delivered through the existing `GymReminder` table with WORKOUT_PLAN / DIET_PLAN types. These appear in the dedicated plan section and member inbox. Personal template snapshots use SELF_PLANS and are excluded from the general inbox. Regeneration replaces the member's previous generated snapshots in a transaction. Raw questionnaire answers are not persisted; the result contains BMI and a brief explanation of adaptation. All reads/writes are scoped to both gym and member. No database migration is needed.

The existing owner-editable template catalogue is preserved. Owner-assigned plans are authored by the gym and are not automatically reviewed by this generator.

## Validation and rollout

Run `npm test`, `npm run typecheck`, `npm run build`. Additional integration testing should use an owner/staff and two member test accounts across different gyms: deliver a campaign, assign each plan type, verify the correct member receives it and another gym does not, regenerate options, check server-save errors and mobile outside-click dismissal.

PWA caching includes only public hashed Next static assets; it never caches authenticated HTML, server actions or API responses. Initial startup still requires network and database availability. Member screens refresh on return to foreground and every 30 seconds while visible. WhatsApp opens a prepared message; the user still confirms sending in WhatsApp.
