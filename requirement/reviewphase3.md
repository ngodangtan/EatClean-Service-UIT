You are a senior AI systems architect reviewing a production health-tech backend.

We just implemented PHASE 3 – AI Creative Layer Control.

System architecture:

- Phase 1: Strict validation layer
- Phase 2: Deterministic nutrition engine (backend controls macros/calories)
- Phase 3:
    - AI only generates creative content
    - AI forbidden from generating macros/calories
    - Strict prompt design
    - Response sanitization
    - Retry logic (max 2)
    - Guardrails (token limit, timeout, JSON validation)
    - Backend overrides all nutrition values

Your task is to perform a deep technical production-level review.

========================================
1️⃣ PROMPT ROBUSTNESS REVIEW
========================================

Analyze the prompt design:

- Is instruction explicit enough?
- Can the AI still sneak numeric nutrition values?
- Is JSON format strictly enforced?
- Is there risk of markdown output?
- Is system prompt strong enough?
- Are we overtrusting the model?

Suggest improvements if prompt still fragile.

========================================
2️⃣ RESPONSE SANITIZATION REVIEW
========================================

Evaluate:

- JSON parsing safety
- Unknown field stripping
- Detection of numeric nutrition values
- Handling of empty fields
- Handling of long responses
- Handling of invalid encoding
- Risk of partial valid JSON

Can malformed responses bypass validation?

========================================
3️⃣ RETRY LOGIC SAFETY
========================================

Check:

- Infinite loop risk?
- Retry escalation?
- Does error feedback improve prompt?
- Risk of retry storm under load?
- Timeout handling?
- Memory pressure risk?

========================================
4️⃣ SECURITY REVIEW
========================================

Evaluate risks:

- Prompt injection via healthProfile.cuisinePreference?
- Prompt injection via diseases?
- Malicious user input breaking AI behavior?
- Output injection into DB?
- Logging sensitive AI content?
- DoS risk if AI hangs?

Identify real-world attack vectors.

========================================
5️⃣ ARCHITECTURE QUALITY
========================================

Analyze:

- Separation between aiClient, promptBuilder, mealGenerator
- Reusability for future recipe endpoints
- Testability of AI layer
- Can we mock AI easily?
- Is controller clean enough?
- Coupling between AI layer and nutrition engine

========================================
6️⃣ FAILURE SCENARIOS
========================================

What happens if:

- AI returns text instead of JSON?
- AI returns extra commentary?
- AI returns partial JSON?
- AI returns empty string?
- LM Studio crashes?
- Response exceeds max tokens?
- JSON parse throws?

Will system:
- crash?
- save corrupted data?
- leak memory?

========================================
7️⃣ PERFORMANCE ANALYSIS
========================================

Check:

- Sequential vs parallel meal generation
- Should meals generate concurrently?
- Risk of overwhelming LM Studio?
- Potential bottlenecks?
- Token efficiency?

========================================
8️⃣ FUTURE SCALABILITY
========================================

Evaluate readiness for:

- Ingredient blacklist
- Cultural filtering
- Disease-aware content filtering
- Seasonal meal generation
- A/B prompt testing
- AI provider swap (OpenAI / Anthropic)

========================================
9️⃣ OUTPUT FORMAT
========================================

Structure response:

## ✅ What Is Strong
- Bullet list

## ⚠ Critical Risks (High Severity)
For each:
- Description
- Real-world impact
- Fix recommendation

## ⚠ Medium Risks

## ⚠ Minor Improvements

## 🧠 Strategic Architecture Advice

Be analytical.
Be critical.
Think like production at scale.
Do not rewrite code.
Do not summarize project.
Focus strictly on deep review.
