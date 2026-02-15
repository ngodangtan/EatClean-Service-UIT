  Issues Found

  1. Global error handler is unreachable

  File: src/index.js:32-33
  Risk: High
  Description: The 404 handler at line 32 is (req, res) — a 2-argument function. Express treats this as a regular middleware, not error middleware. It
  catches ALL unmatched requests and sends a response. Because a response was already sent, the error handler on line 33 (4-arg middleware) will never
  execute for unmatched routes. More critically: no route or middleware currently calls next(err), so the error handler is unreachable for actual errors too.
   Every controller catches its own errors with try/catch and responds directly, making the errorHandler + AppError dead code.

  Fix: Either:
  - (a) Refactor controllers to throw AppError and use next(err) via async wrapper, or
  - (b) Accept that errorHandler is a safety net for uncaught throws in future code. At minimum, move the 404 handler to only apply after the errorHandler
  can still intercept errors:

  // 404 must also call next for the error handler to be reachable
  app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
  });
  app.use(errorHandler);

  This ordering is actually fine as-is for 404s, but the issue remains that no controller uses next(err).

  2. Refresh token query has a cross-document matching bug

  File: src/controllers/auth.controller.js:95-98
  Risk: High
  Description: The MongoDB query { 'refreshTokens.token': token, 'refreshTokens.expiresAt': { $gt: new Date() } } uses two separate conditions on an array.
  MongoDB matches if any element satisfies .token AND any element (possibly different) satisfies .expiresAt > now. This means an expired refresh token could
  still work if the user has any other non-expired refresh token in the array.

  Fix: Use $elemMatch to ensure both conditions match the same array element:
  const user = await User.findOne({
    refreshTokens: { $elemMatch: { token, expiresAt: { $gt: new Date() } } }
  });

  3. Refresh tokens accumulate unboundedly

  File: src/models/User.js:16-20, src/controllers/auth.controller.js:27,51
  Risk: Medium
  Description: Every login/register pushes a new refresh token. There's no cleanup of expired tokens and no cap. A user logging in 1000 times will have 1000
  subdocuments in their User record. This bloats the User document and slows all User queries.

  Fix: Either:
  - Cap the array (e.g., keep last 10) by slicing after push, or
  - Clean expired tokens on each login: user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date()); before pushing the new one.

  4. Token blacklist DB hit on every authenticated request

  File: src/middleware/auth.js:11
  Risk: Medium
  Description: Every single authenticated request now does TokenBlacklist.findOne({ token }). With short-lived access tokens (15min), most tokens will never
  be blacklisted. This adds a DB round-trip to every request.

  Fix: Add an index on token field (already implicit from unique: true — this is fine). For higher scale, consider an in-memory cache (e.g., LRU with 15min
  TTL matching access token lifespan). Acceptable for current scale, but note the latency impact.

  5. validate middleware doesn't strip unknown fields

  File: src/middleware/validate.js:3
  Risk: Medium
  Description: schema.validate(req.body, { abortEarly: false }) does not use { stripUnknown: true } or { allowUnknown: false }. Joi defaults to allowUnknown:
   false, which is correct (rejects unknowns). But the validated value is never assigned back to req.body, so even if Joi transforms/trims values, the
  original untrimmed req.body is what reaches the controller.

  Fix:
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) { ... }
  req.body = value; // Use the validated/trimmed value
  next();

  6. swapMeal spreads Mongoose subdocument incorrectly

  File: src/controllers/mealplan.controller.js:508-514
  Risk: Medium
  Description: dayObj.meals[mealIndex] is a Mongoose subdocument (not a plain object). Spreading it with { ...dayObj.meals[mealIndex] } creates a plain
  object and loses the Mongoose document context. While markModified('days') compensates, the spread also copies internal Mongoose properties (_id, $__,
  etc.), which is messy. More importantly, the destructured result becomes a plain object that replaces the subdocument in the array.

  Fix: Directly mutate the subdocument fields instead:
  const target = dayObj.meals[mealIndex];
  target.name = newMealContent.name;
  target.description = newMealContent.description;
  target.ingredients = newMealContent.ingredients;
  target.benefits = newMealContent.benefits;

  7. endDay query param defaults to Infinity — non-serializable

  File: src/controllers/mealplan.controller.js:547
  Risk: Low
  Description: parseInt(req.query.endDay) || Infinity — when user passes endDay=0, parseInt returns 0, which is falsy, so it becomes Infinity. Also,
  parseInt('abc') returns NaN, which is falsy, so it also becomes Infinity. The logic is functionally correct but the intent is unclear for endDay=0.

  Fix: Minor. Could use req.query.endDay != null ? parseInt(req.query.endDay) : Infinity for clarity, but not critical.

  8. pagination limit not capped

  File: src/controllers/mealplan.controller.js:365, src/controllers/favorite.controller.js:26
  Risk: Low
  Description: parseInt(req.query.limit) || 10 allows unbounded values. A client sending ?limit=100000 could trigger massive query results. Same in
  favorites.

  Fix: const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  9. Shopping list pepper keyword collision

  File: src/services/shoppingListService.js:28
  Risk: Low
  Description: 'pepper' appears in both Produce (bell pepper) and Pantry (black pepper). Because Produce is checked first, "black pepper" gets categorized as
   Produce. Similarly, 'oil' matches "olive oil" but also any ingredient containing "oil" like "toil" (unlikely but sloppy).

  Fix: Acceptable for v1. Could fix with more specific keywords or a priority override, but ingredient categorization from free-text names is inherently
  fuzzy.

  10. Logger file transport crashes if logs/ directory doesn't exist

  File: src/utils/logger.js:23-24
  Risk: Medium
  Description: Winston file transports write to logs/error.log and logs/combined.log. If the logs/ directory doesn't exist on first run, Winston will throw
  ENOENT. This directory is not created by any setup script.

  Fix: Either create the directory in bootstrap, or add { mkdir: true } option (Winston 3.x doesn't support this natively). Simplest:
  import { mkdirSync } from 'node:fs';
  mkdirSync('logs', { recursive: true });
  at the top of logger.js before creating transports.

  11. loginLimiter uses in-memory store — resets on restart, doesn't work across instances

  File: src/middleware/loginLimiter.js
  Risk: Low (single-instance deployment)
  Description: express-rate-limit defaults to MemoryStore. If the server restarts, all rate limits reset. If running multiple instances behind a load
  balancer, the limits are per-process not per-user.

  Fix: Acceptable for current single-instance setup. For production multi-instance: use rate-limit-redis or rate-limit-mongo as the store.

  12. register schema allows password with only 6 chars and no complexity

  File: src/validators/auth.validator.js:4
  Risk: Low
  Description: Joi.string().min(6) is the only password constraint. No uppercase/number/special char requirements.

  Fix: Depending on product requirements. Consider adding .pattern() for basic complexity, but this is a product decision, not a bug.

  ---
  Architectural Advice

  - Consider async error wrapper. All controllers repeat the same try { ... } catch (e) { return res.status(500).json(...) } pattern. A small wrapper
  (asyncHandler) that catches thrown errors and forwards to next(err) would let the global errorHandler do its job and remove ~100 lines of duplicated catch
  blocks. This would also make AppError actually useful.
  - Refresh token rotation. Current implementation reuses the same refresh token indefinitely until expiry. Industry standard is to rotate: when a refresh
  token is used, invalidate it and issue a new one. This limits the window for a stolen refresh token.
  - The swapMeal function duplicates ~30 lines of meal generation config from generateMealPlan. Extract a helper like
  buildMealGenerationParams(healthProfile, dist, ingredientLists) to keep them in sync.
  - Favorite targetId is not validated against existence. A user can favorite a non-existent meal plan or recipe. Whether this matters depends on UX
  requirements — orphaned favorites could confuse the client. Consider a lean existence check or handling gracefully in the UI.
  - No .gitignore entry for logs/. The Winston log files will be committed to git unless logs/ is gitignored.

  ---
  Want me to fix any of these issues?