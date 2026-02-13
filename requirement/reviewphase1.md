You are a senior backend architect performing a production-level code review.

Context:
This project is an Express + ES Modules REST API for AI-generated meal plans.
We just implemented PHASE 1 – AI Hardening:

- AJV JSON schema validation
- Logical validation (macro & calorie consistency)
- Retry logic (MAX_RETRY = 2)
- Reduced LM Studio temperature
- Validation separated into services
- No database schema changes

Your task:

========================================
1️⃣ REVIEW FOR PRODUCTION READINESS
========================================

Evaluate:

- Correctness of JSON schema (AJV)
- Strictness of schema (rejectUnknownProperties)
- Validation logic math correctness
- Floating point tolerance logic (5% deviation)
- Retry logic safety
- Async error handling
- Edge cases (null, undefined, empty arrays)
- Memory leaks
- Unhandled promise rejections

========================================
2️⃣ CHECK ARCHITECTURE QUALITY
========================================

Analyze:

- Controller thickness
- Service separation
- Single Responsibility Principle
- Reusability
- Testability
- Scalability impact

========================================
3️⃣ CHECK FAILURE SCENARIOS
========================================

What happens if:

- LM Studio returns invalid JSON?
- AI returns partially correct structure?
- Validation service throws?
- HealthProfile is missing?
- mealsPerDay mismatch?
- Macros extremely off?

Are we safe from saving corrupted data?

========================================
4️⃣ CHECK SECURITY
========================================

Evaluate:

- Any injection risks from AI response?
- Logging sensitive data?
- Potential DoS via retry loop?
- Any missing try/catch blocks?

========================================
5️⃣ CHECK PERFORMANCE
========================================

- Any unnecessary deep clones?
- Repeated heavy validation?
- Any synchronous blocking logic?
- Any redundant recalculations?

========================================
6️⃣ SUGGEST IMPROVEMENTS
========================================

For each issue found:

- Explain the risk
- Explain severity (Low / Medium / High)
- Provide minimal safe fix
- Do NOT rewrite the whole project
- Do NOT suggest overengineering

========================================
7️⃣ OUTPUT FORMAT
========================================

Structure response like:

## ✅ What Is Good
- Bullet list

## ⚠ Issues Found
For each:
- Description
- Risk level
- Why it matters
- Suggested fix

## 🧠 Architectural Advice
- Optional improvements for long-term scalability

Be precise.
Be critical.
Think like production environment.
Do not be polite.
Do not repeat code unless necessary.
Do not summarize project.
Focus only on review.
