# Eat Clean API — Tổng Quan Kỹ Thuật Toàn Diện

> Ngày tạo: 2026-03-12 | Cập nhật lần cuối: 2026-04-27 | Dựa trên tất cả tài liệu yêu cầu và phân tích toàn bộ mã nguồn
>
> **Cập nhật 2026-04-21:** Danh mục bệnh mở rộng từ 10 lên 11 — thêm `insomnia` (`supported: false`). Cập nhật đếm bệnh trong `diseaseGuidelines.json`, `recipes.json`, `ingredients.json`. Sửa params chat LM Studio (`temperature: 0.7 → 0.2`, `max_tokens: 800 → 2000`, thêm system message). Sửa kích thước vector embedding (`768 → 1024 chiều`). Sửa mô tả regex ingredient filter (`\b` → Unicode-aware lookaround). Xóa dòng inconsistency `temperature: 0.2` (đã được fix). Thêm section triết lý thiết kế DISEASE_RULES vs DISEASE_CATALOG vào §10.2.
>
> **Cập nhật 2026-04-26:** Xóa `favoriteMeal`, `averageDay`, `workSchedule` khỏi `HealthProfile` — model, Joi validator, controller, Swagger spec đều đã cập nhật. `buildMealPrompt()` không còn nhận hoặc chèn `favoriteMeal` (xóa dòng "Favorite food:" khỏi prompt). `retrieveRelevantMeals()` không còn nhận `favoriteMeal` làm tham số hay ghép vào chuỗi truy vấn. Bổ sung tài liệu cho trường `stage` (integer 1–5, phân giai đoạn CKD) trong `diseaseEntrySchema`. Sửa số bệnh `10 → 11` trong ràng buộc hồ sơ sức khỏe. Cập nhật bảng model MongoDB và ràng buộc hồ sơ sức khỏe cho khớp với code hiện tại.
>
> **Cập nhật 2026-04-27:** Cơ sở kiến thức chia thành thư mục con — `recipes/` giờ chứa 4 file theo mealType (`breakfast.json`, `lunch.json`, `dinner.json`, `snack.json`); `ingredients/` giờ chứa 5 file theo danh mục (`dairy.json`, `grains.json`, `pantry.json`, `produce.json`, `protein.json`). Tổng số công thức tăng từ 40 lên 96 (thêm 11 món `lose-weight` mới). Số nguyên liệu tăng từ 52 lên 85. Cập nhật cấu trúc thư mục ở §2 và mô tả `indexer.js` ở §5 và §11.3.
>
> **Cập nhật 2026-04-12 (v2):** **Xóa hoàn toàn `goal` khỏi HealthProfile** — `goal` không còn lưu trên profile, Mongoose schema, Joi validator, Swagger spec, hay controller. Nutrition engine mặc định `'improve-health'` khi không có `goalOverride` (trước đó dùng `healthProfile.goal`). `goalOverride` chỉ được dùng bởi `weight_management` để inject `weightGoal` theo từng request. `swapMeal` controller hardcode `goal: 'improve-health'` thay vì đọc từ profile. **RAG indexer giờ xóa collection trước khi re-index** để đảm bảo clean re-index (export `deleteCollection()` mới trong `vectorStore.js`). ChromaDB `embeddingFunction` đổi từ no-op wrapper sang `null`. Sửa `getEmbeddingBatch` default model từ `nomic-embed-text` sang `bge-m3`.

---

## 1. Tổng Quan Dự Án

### Dự Án Làm Gì

Eat Clean API là một REST API Node.js/Express cung cấp **lập kế hoạch bữa ăn được hỗ trợ bởi AI, có nhận thức y tế** cho người dùng quan tâm đến sức khỏe. Hệ thống giải quyết vấn đề tạo kế hoạch bữa ăn cá nhân hóa đồng thời đáp ứng:

- Mục tiêu dinh dưỡng cá nhân (calories, protein, carbs, fat) được tính từ chỉ số cơ thể và mục tiêu thể hình
- Hạn chế chế độ ăn y tế cho các bệnh mãn tính (tiểu đường, bệnh thận, acid uric cao, tăng huyết áp)
- Sở thích ẩm thực của người dùng (phong cách ẩm thực, món ăn yêu thích, chế độ ăn kiêng)
- Tính thực tiễn (danh sách mua sắm, hoán đổi bữa ăn, đánh dấu công thức)
- **Tạo nội dung AI có cơ sở** — các bữa ăn được lấy cảm hứng từ cơ sở kiến thức được tuyển chọn gồm công thức thực tế và hướng dẫn chế độ ăn theo bệnh, thay vì tạo hoàn toàn từ đầu

### Vấn Đề Chính Được Giải Quyết

Các công cụ lập kế hoạch bữa ăn thông thường hoặc bỏ qua hoàn toàn các hạn chế y tế, hoặc dựa vào các mẫu tĩnh. Hệ thống này kết hợp độc đáo:

1. Một **bộ máy dinh dưỡng tất định** — tính toán macro chính xác, có thể lặp lại ở mức y tế
2. Một **bộ máy hạn chế bệnh lý** — danh sách đen nguyên liệu và giới hạn macro theo từng tình trạng bệnh
3. Một **lớp RAG (Retrieval-Augmented Generation)** — công thức tham khảo thực tế và hướng dẫn chế độ ăn được truy xuất từ cơ sở dữ liệu vector và đưa vào prompt AI làm ngữ cảnh nền tảng
4. Một **lớp AI sinh nội dung** — đặt tên và mô tả bữa ăn sáng tạo, được hỗ trợ bởi ngữ cảnh truy xuất
5. Một **rào chắn an toàn** — không nguyên liệu bị cấm y tế nào có thể xuất hiện trong kế hoạch được tạo

Lớp RAG giải quyết điểm yếu của hệ thống gốc: các bữa ăn AI được "bịa đặt" hoàn toàn từ đầu, dẫn đến các món ăn không chính xác về văn hóa, kết hợp nguyên liệu không hợp lý, và nhận thức bệnh lý hời hợt. Với RAG, LLM giờ đây hoạt động dựa trên các ví dụ thực tế.

### Luồng Hoạt Động Tổng Thể

```
Đăng ký người dùng (tùy chọn nhập height + currentWeight) → Thiết lập Health Profile
     ↓
Nutrition Engine (tất định: BMR → TDEE → calories → macros → phân phối bữa ăn)
     ↓
Disease Engine (giới hạn macros theo bệnh, xây dựng danh sách hạn chế nguyên liệu)
     ↓
RAG Retriever (truy vấn ChromaDB tìm bữa ăn tham khảo tương tự + hướng dẫn bệnh lý theo mealType)
     ↓
Prompt Builder (đưa vào mục tiêu dinh dưỡng + hạn chế + ngữ cảnh truy xuất)
     ↓
LM Studio / LLM (tạo name, description, ingredients, benefits — được hỗ trợ bởi ngữ cảnh)
     ↓
Safety Validator (quét nguyên liệu theo word-boundary, từ chối item bị cấm, thử lại tối đa 2 lần)
     ↓
Schema + Logical Validator (AJV schema, kiểm tra tính nhất quán calorie/macro)
     ↓
MongoDB Persistence (MealPlan được lưu với đầy đủ dữ liệu)
     ↓
Phản hồi người dùng (kế hoạch + tóm tắt dinh dưỡng + tuyên bố miễn trừ y tế nếu có bệnh)
```

---

## 2. Cấu Trúc Dự Án

### Bố Cục Thư Mục

```
eat-clean-api/
├── src/
│   ├── index.js                            # Điểm vào ứng dụng Express
│   ├── config/
│   │   ├── db.js                           # Kết nối MongoDB
│   │   └── swagger.js                      # Đặc tả OpenAPI 3.0
│   ├── controllers/                        # Lớp logic nghiệp vụ
│   │   ├── auth.controller.js
│   │   ├── health.controller.js            # CRUD hồ sơ sức khỏe
│   │   ├── mealplan.controller.js          # Điều phối tạo kế hoạch bữa ăn (purpose-aware)
│   │   ├── disease.controller.js           # Tra cứu danh mục bệnh
│   │   └── favorite.controller.js
│   ├── routes/                             # Express routers
│   │   ├── index.js                        # Tổng hợp route (gắn tất cả dưới /api)
│   │   ├── auth.routes.js
│   │   ├── health.routes.js
│   │   ├── mealplan.routes.js
│   │   ├── disease.routes.js
│   │   └── favorite.routes.js
│   ├── models/                             # Mongoose schemas
│   │   ├── User.js
│   │   ├── HealthProfile.js
│   │   ├── MealPlan.js                     # Có trường `purpose` (daily/weight/disease)
│   │   ├── Favorite.js
│   │   └── TokenBlacklist.js
│   ├── middleware/
│   │   ├── auth.js                         # Xác minh JWT + kiểm tra blacklist
│   │   ├── errorHandler.js                 # Xử lý lỗi toàn cục
│   │   ├── loginLimiter.js                 # Giới hạn tần suất: 5 lần / 15 phút
│   │   ├── requestLogger.js                # Ghi log request ID + thời gian bằng Winston
│   │   └── validate.js                     # Middleware xác thực schema Joi
│   ├── validators/                         # Định nghĩa schema đầu vào
│   │   ├── auth.validator.js
│   │   ├── healthProfile.validator.js
│   │   ├── mealPlanGenerate.validator.js   # Joi schema purpose-aware cho POST /generate
│   │   └── mealPlan.schema.js              # AJV JSON schema cho đầu ra AI
│   ├── data/
│   │   ├── diseaseCatalog.js               # Danh mục 11 bệnh (4 hỗ trợ macro + 7 chưa hỗ trợ), indicators, cờ supported
│   │   └── knowledgeBase/                  # Dữ liệu tham khảo được tuyển chọn (quản lý phiên bản)
│   │       ├── recipes/                    # 96 công thức tham khảo Việt Nam chia theo mealType (breakfast, lunch, dinner, snack)
│   │       ├── diseaseGuidelines.json      # 11 hướng dẫn chế độ ăn theo bệnh (tiếng Việt)
│   │       └── ingredients/                # 85 nguyên liệu chia theo danh mục (dairy, grains, pantry, produce, protein)
│   ├── services/
│   │   ├── mealPlanPurposeService.js       # Bảo vệ purpose: chống chỉ định, ánh xạ goal, TDEE từ HealthKit
│   │   ├── nutrition/                      # Tính toán dinh dưỡng tất định
│   │   │   ├── bmrCalculator.js
│   │   │   ├── tdeeCalculator.js
│   │   │   ├── calorieTargetCalculator.js
│   │   │   ├── macroCalculator.js
│   │   │   ├── mealMacroDistributor.js
│   │   │   ├── durationCalculator.js       # Hỗ trợ requestedWeeks (1/2/4)
│   │   │   └── nutritionEngine.js          # Điều phối — nhận { goalOverride, tdeeOverride }
│   │   ├── disease/                        # Bộ máy hạn chế y tế
│   │   │   ├── diseaseRules.js             # Cấu hình bệnh (quy tắc, nguyên liệu)
│   │   │   ├── macroAdjuster.js            # Điều chỉnh macro theo nguyên tắc giới hạn nghiêm ngặt nhất
│   │   │   ├── ingredientFilter.js         # Quét nguyên liệu với Unicode-aware lookaround regex
│   │   │   ├── safetyValidator.js          # Cổng an toàn cho từng bữa ăn
│   │   │   └── diseaseEngine.js            # Điều phối
│   │   ├── ai/                             # Lớp tích hợp LLM
│   │   │   ├── aiClient.js                 # HTTP client cho LM Studio
│   │   │   ├── promptBuilder.js            # Xây dựng prompt + sanitizePromptInput (được export)
│   │   │   ├── mealGenerator.js            # Tạo với retry + làm sạch dữ liệu
│   │   │   └── concurrency.js              # Giới hạn sinh đồng thời
│   │   ├── rag/                            # Lớp RAG (Retrieval-Augmented Generation)
│   │   │   ├── embeddingClient.js          # Client API embedding LM Studio
│   │   │   ├── vectorStore.js              # Wrapper client ChromaDB (export deleteCollection)
│   │   │   ├── retriever.js                # Logic truy xuất cấp cao
│   │   │   ├── ragContextBuilder.js        # Định dạng + làm sạch nội dung truy xuất
│   │   │   └── indexer.js                  # Đánh chỉ mục cơ sở kiến thức vào ChromaDB
│   │   ├── mealValidationService.js        # Xác thực logic sau khi tạo
│   │   └── shoppingListService.js          # Tổng hợp danh sách mua sắm
│   └── utils/
│       ├── AppError.js                     # Lớp lỗi tùy chỉnh + hàm factory
│       └── logger.js                       # Winston logger
├── scripts/
│   └── indexKnowledgeBase.js               # CLI: đánh chỉ mục cơ sở kiến thức vào ChromaDB
├── tests/                                  # Bộ test Vitest
│   ├── unit/
│   │   ├── services/
│   │   │   ├── nutrition/                  # Test bộ máy dinh dưỡng
│   │   │   ├── disease/                    # Test bộ máy bệnh lý
│   │   │   ├── rag/                        # Test lớp RAG (ragContextBuilder, retriever)
│   │   │   └── mealPlanPurposeService.test.js  # Quy tắc purpose (chống chỉ định, ánh xạ goal)
│   │   ├── validators/
│   │   │   ├── auth.validator.test.js      # Chính sách mật khẩu, schema register/login/updateProfile
│   │   │   ├── mealPlan.schema.test.js     # Xác thực schema AJV cho đầu ra AI
│   │   │   └── mealPlanGenerate.validator.test.js  # Joi schema purpose-aware cho /generate
│   │   └── data/
│   │       └── knowledgeBase.test.js       # Xác thực tính toàn vẹn JSON cơ sở kiến thức
│   └── integration/
│       └── healthMealPlanFlow.test.js      # Luồng end-to-end health profile → meal plan
├── requirement/                            # Tài liệu review yêu cầu
├── docker-compose.rag.yml                  # Cài đặt Docker cho ChromaDB
├── package.json
└── CLAUDE.md
```

### Sơ Đồ Tương Tác Giữa Các Module

```
[HTTP Request]
     │
     ▼
[Middleware Stack: helmet → cors → rate-limiter → requestLogger → JSON parser]
     │
     ▼
[Route] → [validate middleware (Joi)] → [auth middleware (JWT)]
     │
     ▼
[mealplan.controller.js]
     │
     ├─→ [Nutrition Engine]    — hàm thuần túy, không có side effects
     ├─→ [Disease Engine]      — giới hạn macros, xây dựng danh sách nguyên liệu
     ├─→ [RAG Retriever]       — truy vấn ChromaDB tìm bữa ăn tương tự + hướng dẫn
     │       │
     │       ├─→ [embeddingClient] — LM Studio /v1/embeddings
     │       └─→ [vectorStore]    — Truy vấn ChromaDB
     │
     ├─→ [ragContextBuilder]   — định dạng tài liệu truy xuất thành chuỗi prompt
     ├─→ [AI Layer]            — gửi prompt với ngữ cảnh cho LLM, làm sạch phản hồi
     │       │
     │       ├─→ [promptBuilder]  — đưa vào dinh dưỡng + hạn chế + ngữ cảnh RAG
     │       └─→ [aiClient]      — LM Studio /v1/chat/completions
     │
     ├─→ [Validators]          — AJV schema + kiểm tra tính nhất quán logic
     └─→ [Mongoose Models]     — lưu trữ vào MongoDB
     │
     ▼
[errorHandler middleware] ← bắt tất cả AppError / lỗi không mong đợi
```

**Quan trọng:** Lỗi RAG tại bất kỳ điểm nào KHÔNG chặn quá trình tạo. `ragContextByMealType` sẽ fallback về `{}` một cách im lặng và bữa ăn được tạo mà không có ngữ cảnh truy xuất.

---

## 3. Các Mẫu Thiết Kế (Design Patterns)

Dự án áp dụng nhiều mẫu thiết kế phần mềm nổi tiếng xuyên suốt các tầng kiến trúc, dịch vụ và middleware.

### Mẫu Kiến Trúc (Architectural Patterns)

| Mẫu | Vị trí | Biểu hiện |
|---|---|---|
| **Layered (N-Tier) Architecture** | Toàn bộ dự án | Phân tách rõ ràng thành Routes → Controllers → Services → Models, mỗi tầng có trách nhiệm riêng biệt |
| **MVC (Model-View-Controller)** | `controllers/`, `models/`, `routes/` | MVC Express chuẩn không có views — Models định nghĩa cấu trúc dữ liệu, Controllers xử lý request/response, Routes định nghĩa endpoint |
| **Service Layer** | `src/services/` | Logic nghiệp vụ được đóng gói trong các module dịch vụ chuyên biệt (`nutrition/`, `disease/`, `ai/`, `rag/`), có thể tái sử dụng và test độc lập |
| **Pipeline** | `mealplan.controller.js` | Dữ liệu tạo meal plan chảy tuần tự qua: Validation → Nutrition → Disease → RAG → AI → Safety → Save |

### Mẫu Hành Vi (Behavioral Patterns)

| Mẫu | Vị trí | Biểu hiện |
|---|---|---|
| **Chain of Responsibility** | `src/index.js`, middleware stack | Pipeline middleware tuần tự: `helmet → cors → requestLogger → JSON parser → rate limiter → routes → errorHandler`, mỗi middleware gọi `next()` |
| **Strategy** | `src/services/nutrition/` | Các thuật toán tính toán có thể hoán đổi được chọn theo goal/activity level — BMR (Mifflin-St Jeor), TDEE (hệ số vận động), calorie target (điều chỉnh theo mục tiêu), phân phối macro (tỷ lệ theo mục tiêu) |
| **Template Method** | `generateMealPlan()` trong controller | Khung thuật toán cố định với các bước cụ thể được ủy quyền cho các dịch vụ (nutrition engine, disease engine, RAG retriever, meal generator) |

### Mẫu Cấu Trúc (Structural Patterns)

| Mẫu | Vị trí | Biểu hiện |
|---|---|---|
| **Facade** | `diseaseEngine.js`, `nutritionEngine.js` | Một hàm điểm vào duy nhất che giấu việc điều phối nhiều dịch vụ con (vd: `applyDiseaseAdjustments()` gọi nội bộ macro adjuster, safety validator, feasibility check, meal distributor) |
| **Adapter** | `ragContextBuilder.js` | Chuyển đổi kết quả tìm kiếm vector ChromaDB thô thành chuỗi đã sanitize, có thể inject vào prompt — kết nối các định dạng dữ liệu không tương thích |
| **Middleware Guard / Decorator** | `auth.js`, `validate.js` | Các concern xuyên suốt (xác thực JWT, validation Joi) được áp dụng khai báo trên định nghĩa route mà không chạm vào logic nghiệp vụ |

### Mẫu Khởi Tạo (Creational Patterns)

| Mẫu | Vị trí | Biểu hiện |
|---|---|---|
| **Singleton** | `db.js`, `logger.js` | Một kết nối MongoDB và một instance Winston logger duy nhất được chia sẻ trong toàn bộ ứng dụng |
| **Factory** | `AppError.js`, `diseaseRules.js` | Các hàm helper `badRequest()`, `unauthorized()`, `notFound()` tạo ra đối tượng lỗi có kiểu; `getDiseaseRules(key)` trả về đối tượng quy tắc theo bệnh khi cần |

### Mẫu Chuyên Biệt / Khác

| Mẫu | Vị trí | Biểu hiện |
|---|---|---|
| **Concurrency Control** | `concurrency.js` | `runWithConcurrency(tasks, limit)` — mẫu worker pool có giới hạn, hạn chế số lượng cuộc gọi AI song song để tránh quá tải LM Studio |
| **Constraint Satisfaction** | `macroAdjuster.js` | Thu thập giới hạn macro nghiêm ngặt nhất qua nhiều bệnh, phân phối lại calo dư, kẹp lại sau phân phối, kiểm tra tính khả thi (drift < 10%) |
| **Input Sanitization** | `promptBuilder.js`, `ragContextBuilder.js` | `sanitizePromptInput()` escape dữ liệu từ người dùng; `stripAdversarial()` loại bỏ các từ khóa prompt-injection (`ignore`, `override`, `system`) trước khi inject vào prompt AI |
| **RAG (Retrieval-Augmented Generation)** | `src/services/rag/` | Tìm kiếm tương đồng vector truy xuất công thức và hướng dẫn bệnh lý liên quan từ ChromaDB, inject làm ngữ cảnh nền tảng vào prompt AI — kết hợp truy xuất thông tin với AI sinh |
| **Module / Namespace** | Thư mục dịch vụ | Chức năng liên quan được nhóm thành các module gắn kết: `nutrition/` (5 bộ tính + orchestrator), `disease/` (rules + adjuster + validator + engine), `ai/` (client + prompt + generator + concurrency), `rag/` (embedding + vector store + retriever + context builder) |

---

## 4. Sử Dụng Mô Hình AI

### Hai Endpoint AI — Một Server LM Studio

Hệ thống sử dụng LM Studio cho **cả** tạo nội dung sáng tạo và nhúng ngữ nghĩa (embedding):

| Mục đích | Endpoint | Mô hình | Ghi chú |
|----------|----------|---------|---------|
| Tạo bữa ăn (văn bản sáng tạo) | `LM_STUDIO_URL` (`/v1/chat/completions`) | Bất kỳ chat model nào | Tạo name, description, ingredients, benefits |
| Embedding (tìm kiếm ngữ nghĩa) | `LM_STUDIO_EMBEDDING_URL` (`/v1/embeddings`) | `bge-m3` (đa ngôn ngữ) | Chuyển đổi văn bản truy vấn thành vector 1024 chiều cho ChromaDB |

Cả hai chạy cục bộ qua LM Studio. Không sử dụng API AI đám mây.

### Không Huấn Luyện — Thuần Prompt Engineering + Truy Xuất

Dự án **không huấn luyện, fine-tune, hay điều chỉnh** bất kỳ mô hình AI nào. Tất cả trí thông minh đến từ:
1. Các mẫu prompt có cấu trúc với ràng buộc rõ ràng
2. Cơ sở kiến thức được tuyển chọn (file JSON được quản lý phiên bản trong `src/data/knowledgeBase/`)
3. Truy xuất ngữ nghĩa qua embeddings + tìm kiếm vector ChromaDB

### AI Tạo Những Gì

LLM được sử dụng độc quyền như một **bộ tạo văn bản sáng tạo** cho nội dung bữa ăn:
- Tên bữa ăn
- Mô tả
- Danh sách nguyên liệu (chỉ tên, không có số lượng)
- Lợi ích sức khỏe

Tất cả giá trị dinh dưỡng dạng số (calories, protein, carbs, fat) được **tính toán tất định bởi backend** và đưa vào kế hoạch đã lưu. AI không thể xuất dữ liệu dinh dưỡng dạng số — bất kỳ trường số nào trong phản hồi AI đều bị loại bỏ bởi bộ làm sạch trước khi sử dụng.

### Tích Hợp Chat LM Studio

```javascript
// src/services/ai/aiClient.js
POST http://localhost:1234/v1/chat/completions
{
  model: "local-model",
  messages: [
    { role: "system", content: "You are a JSON-only meal content generator..." },
    { role: "user", content: <prompt đã xây dựng> }
  ],
  temperature: 0.2,
  max_tokens: 2000,
  top_p: 0.9
}
```

- **Timeout:** 30 giây mỗi lần gọi
- **Kích thước phản hồi tối đa:** Giới hạn 50 KB
- **Phân tích phản hồi:** Loại bỏ markdown fences, trích xuất đối tượng JSON cân bằng

### Tích Hợp Embedding LM Studio

```javascript
// src/services/rag/embeddingClient.js
POST http://localhost:1234/v1/embeddings
{
  model: "bge-m3",
  input: "lunch meal for lose-weight goal vietnamese cuisine"
}
// Phản hồi: { data: [{ embedding: [0.021, -0.192, 0.040, ...] }] }  // vector 1024 chiều
```

- **Timeout:** 10 giây mỗi lần gọi (ngắn hơn — embeddings xử lý nhanh)
- **Chuẩn hóa văn bản:** trim → lowercase → gộp khoảng trắng (trước khi embedding)

### Tại Sao Dùng `bge-m3` Cho Embeddings

Lớp RAG yêu cầu một **mô hình embedding** — một mô hình chuyển đổi văn bản thành các vector số có độ dài cố định (mảng số) để tìm kiếm tương đồng ngữ nghĩa. Điều này khác biệt cơ bản với một **chat model** (như Llama hoặc Mistral) chỉ tạo ra phản hồi dạng văn bản.

**Tại sao cần mô hình embedding:**
- Khi đánh chỉ mục (`npm run rag:index`), mỗi công thức, hướng dẫn bệnh lý và nguyên liệu từ cơ sở kiến thức được chuyển thành vector 1024 chiều và lưu vào ChromaDB
- Tại thời điểm truy vấn, yêu cầu bữa ăn của người dùng được chuyển thành vector bằng cùng mô hình, và ChromaDB tìm các vector đã lưu có ngữ nghĩa tương tự nhất
- Chat model không thể làm điều này — nó tạo ra văn bản, không phải vector phù hợp cho tìm kiếm tương đồng

**Tại sao chọn `bge-m3` cụ thể:**
1. **Tương thích LM Studio** — đây là một trong những mô hình embedding được hỗ trợ rộng rãi nhất trong thư viện mô hình của LM Studio, dễ tải về và chạy cục bộ
2. **Nhẹ** — khoảng 274MB, đủ nhỏ để chạy song song với chat model trên phần cứng tiêu dùng mà không tranh giành bộ nhớ GPU
3. **Chất lượng truy xuất tốt** — tạo ra vector 1024 chiều với hiệu suất cạnh tranh trên các benchmark truy xuất (MTEB), cung cấp khớp ngữ nghĩa chính xác cho tìm kiếm công thức và hướng dẫn
4. **Mã nguồn mở & ưu tiên cục bộ** — không cần API key hay dịch vụ đám mây bên ngoài, nhất quán với triết lý thiết kế của dự án là chạy mọi thứ cục bộ qua LM Studio
5. **Định dạng API ổn định** — tuân theo định dạng endpoint `/v1/embeddings` tương thích OpenAI mà LM Studio cung cấp, không cần mã tích hợp tùy chỉnh
- **Suy thoái nhẹ nhàng:** trả về `null` khi lỗi; caller bỏ qua truy xuất

---

## 5. Lớp RAG

### Tại Sao Cần RAG?

Nếu không có RAG, LLM tạo bữa ăn hoàn toàn từ đầu mà không có cơ sở từ công thức thực tế. Điều này dẫn đến:
- **Kết hợp nguyên liệu bịa đặt** (ví dụ: cá hồi với sốt chocolate)
- **Món ăn không chính xác về văn hóa** (ví dụ: món "Việt Nam" không có nguyên liệu Việt Nam)
- **Nhận thức bệnh lý hời hợt** — LLM thường gợi ý nguyên liệu gần ranh giới ngay cả khi đã đề cập đến tình trạng bệnh

Giải pháp: trước khi xây dựng prompt AI, **truy xuất 3 bữa ăn tham khảo có ngữ nghĩa tương tự nhất** và **hướng dẫn bệnh lý liên quan** từ ChromaDB và đưa vào làm ngữ cảnh cảm hứng.

### Kiến Trúc

```
Pipeline RAG theo từng MealType:

"breakfast meal for diabetes goal vietnamese cuisine"
     │
     ▼ embeddingClient.getEmbedding()
[vector truy vấn 1024 chiều]
     │
     ▼ vectorStore.queryDocuments(RECIPES, vector, { nResults: 3, where: { mealType: 'breakfast' } })
[Top 3 công thức tương tự từ ChromaDB]
     │
     ▼ (song song)
"dietary guidelines for diabetes"
     │
     ▼ vectorStore.queryDocuments(GUIDELINES, vector, { where: { disease: 'diabetes' } })
[Tài liệu hướng dẫn tiểu đường]
     │
     ▼ ragContextBuilder.buildMealContext(meals, guidelines)
[Chuỗi đã làm sạch, giới hạn ≤1500 ký tự]
     │
     ▼ được đưa vào buildMealPrompt() dưới dạng `retrievedContext`
[Prompt gửi đến LLM với ngữ cảnh nền tảng]
```

### File Cơ Sở Kiến Thức (`src/data/knowledgeBase/`)

Đây là các **file JSON được quản lý phiên bản** — nguồn sự thật cho cơ sở kiến thức. Bất kỳ cập nhật nào cũng yêu cầu chạy lại `npm run rag:index` để đồng bộ ChromaDB.

#### `recipes/` — 96 công thức tham khảo (chia theo mealType)

Mỗi công thức có (toàn bộ nội dung bằng **tiếng Việt**; khóa metadata giữ nguyên tiếng Anh):
```json
{
  "id": "rec_001",
  "name": "Cháo yến mạch với quả mọng và hạt chia",
  "mealType": "breakfast",            // breakfast | lunch | dinner | snack
  "cuisine": "western",               // western | vietnamese | asian | mediterranean
  "goal": ["lose-weight", "improve-health"],
  "diseaseCompatible": ["diabetes", "hypertension", "fatty-liver", "high-cholesterol", "heart-disease", "obesity"],
  "ingredients": ["yến mạch cán dẹt", "việt quất", "dâu tây", "hạt chia", "sữa hạnh nhân", "quế"],
  "description": "Bữa sáng giàu chất xơ, chỉ số đường huyết thấp với quả mọng giàu chất chống oxy hóa...",
  "tags": ["high-fiber", "low-glycemic", "dairy-free"]
}
```

Phạm vi bao phủ: tất cả 4 mealTypes, tất cả 3 goals (`lose-weight`, `gain-weight`, `improve-health`), tất cả 11 bệnh trong catalog, 4 phong cách ẩm thực (western, vietnamese, asian, mediterranean).

#### `diseaseGuidelines.json` — 11 hướng dẫn bệnh lý

Mỗi tài liệu:
```json
{
  "id": "guide_diabetes",
  "disease": "diabetes",
  "summary": "Focus on low glycemic index foods...",
  "recommendedFoods": ["brown rice", "quinoa", "leafy greens", "berries", ...],
  "avoidFoods": ["white bread", "sugary drinks", "candy", ...],
  "mealTips": [
    "Pair carbs with protein to slow glucose absorption",
    "Choose whole grains over refined grains",
    ...
  ]
}
```

Bao phủ tất cả 11 bệnh trong catalog: `diabetes`, `kidney-disease`, `high-uric-acid`, `hypertension`, `fatty-liver`, `high-cholesterol`, `heart-disease`, `obesity`, `anemia`, `gastritis`, `insomnia`.

#### `ingredients/` — 85 mục nguyên liệu tham khảo (chia theo danh mục)

Mỗi nguyên liệu (tên và mô tả bằng tiếng Việt; khóa metadata giữ nguyên tiếng Anh):
```json
{
  "id": "ing_001",
  "name": "diêm mạch",
  "category": "grains",              // produce | protein | dairy | grains | pantry | other
  "aliases": ["quinoa"],
  "safeFor": ["diabetes", "hypertension", "high-uric-acid", "fatty-liver", "high-cholesterol", "heart-disease", "obesity", "anemia"],
  "avoidFor": [],
  "nutritionProfile": "ngũ cốc cung cấp đạm hoàn chỉnh với đầy đủ axit amin thiết yếu, giàu chất xơ, chỉ số đường huyết thấp",
  "substitutes": ["gạo lứt", "kiều mạch", "lúa mì bulgur"]
}
```

Bao phủ tất cả danh mục thực phẩm. Tất cả giá trị `safeFor`/`avoidFor` tham chiếu đến tên bệnh từ catalog đầy đủ 11 bệnh.

### File Dịch Vụ RAG (`src/services/rag/`)

#### `embeddingClient.js`

Trách nhiệm: chuyển đổi văn bản thành vector embedding qua LM Studio.

```javascript
// Exports:
getEmbedding(text)           // một văn bản → float[] | null
getEmbeddingBatch(texts)     // string[] → float[][] | null

// Hành vi:
// - Chuẩn hóa văn bản: trim → lowercase → gộp khoảng trắng
// - Timeout 10 giây AbortController
// - Trả về null khi có bất kỳ lỗi nào (lỗi mạng, timeout, phản hồi sai)
// - Ghi log cảnh báo khi lỗi; không bao giờ throw
```

#### `vectorStore.js`

Trách nhiệm: bọc client ChromaDB cho các thao tác upsert và query.

```javascript
// Exports:
initializeCollection(name)                          // getOrCreateCollection
upsertDocuments(name, [{ id, embedding, metadata, document }])
queryDocuments(name, queryEmbedding, { nResults, where })  // trả về null khi lỗi
deleteCollection(name)
healthCheck()                                       // trả về boolean

// Ghi chú triển khai quan trọng:
// - Sử dụng constructor host/port/ssl (không dùng 'path' đã deprecated)
// - Truyền embeddingFunction: null để ChromaDB bỏ qua DefaultEmbeddingFunction
//   (chúng ta luôn cung cấp embeddings riêng qua LM Studio)
// - ChromaDB v1.0.0 (v2 API) — triển khai qua docker-compose.rag.yml
// - Hằng số COLLECTIONS: { RECIPES: 'recipes', GUIDELINES: 'guidelines', INGREDIENTS: 'ingredients' }
```

#### `retriever.js`

Trách nhiệm: truy xuất cấp cao — kết hợp embeddingClient + vectorStore.

```javascript
// Exports:
retrieveRelevantMeals({ mealType, goal, diseases, cuisine, nResults })
// → xây dựng chuỗi truy vấn từ các tham số khác null, embed, truy vấn RECIPES với bộ lọc mealType
// → trả về kết quả ChromaDB thô | null

retrieveDiseaseGuidelines(diseases)
// → một truy vấn cho mỗi bệnh duy nhất, lọc theo { disease: name }
// → trả về mảng kết quả ChromaDB thô (một cho mỗi bệnh)

retrieveIngredientInfo(ingredientNames)
// → embed tên nguyên liệu đã nối, truy vấn INGREDIENTS
// → trả về kết quả ChromaDB thô | null

// Kiểm tra RAG_ENABLED: nếu process.env.RAG_ENABLED === 'false', tất cả hàm trả về [] hoặc null ngay lập tức
```

> **Ghi chú về bộ lọc bệnh:** ChromaDB không hỗ trợ toán tử `$in` trên trường metadata mảng chuỗi. Vì vậy truy vấn công thức chỉ lọc theo `mealType` (bằng nhau). Lọc tương thích bệnh được để cho prompt ("dùng làm cảm hứng"), không được thực thi lập trình.

#### `ragContextBuilder.js`

Trách nhiệm: định dạng kết quả ChromaDB đã truy xuất thành chuỗi an toàn, có thể đưa vào prompt.

```javascript
// Exports:
buildMealContext(retrievedMeals, retrievedGuidelines)
// → trả về chuỗi (tối đa 1500 ký tự) | chuỗi rỗng nếu không truy xuất được gì

// Ví dụ định dạng đầu ra:
// "Reference meals (use as inspiration, do NOT copy exactly):
//  1. Grilled Salmon: salmon fillet, broccoli, lemon. A light protein meal.
//  2. Oatmeal Bowl: rolled oats, berries, chia seeds. High-fiber breakfast.
//  Dietary guidelines to follow:
//  - diabetes: Pair carbs with protein to slow glucose absorption.
//  - diabetes: Choose whole grains over refined grains."

// Biện pháp bảo mật:
// - sanitizePromptInput() áp dụng cho mọi trường chuỗi (import từ promptBuilder.js — KHÔNG sao chép)
// - Phát hiện từ khóa tấn công: loại bỏ mọi văn bản chứa
//   "ignore", "forget", "system", "assistant", "human", "instruction", "override" (không phân biệt hoa thường)
// - Giới hạn mỗi mục bữa ăn: 200 ký tự
// - Giới hạn mỗi mẹo hướng dẫn: 150 ký tự
// - Giới hạn cứng tổng đầu ra: 1500 ký tự (cắt tại dòng hoàn chỉnh cuối cùng)
```

#### `indexer.js`

Trách nhiệm: đánh chỉ mục một lần và gia tăng các file JSON vào ChromaDB.

```javascript
// Exports:
indexAllCollections()    // đánh chỉ mục cả ba collection đồng thời, trả về { recipes, guidelines, ingredients, errors }
indexRecipes()           // xóa collection RECIPES, đọc thư mục recipes/ (tất cả file JSON), batch 10, upsert
indexGuidelines()        // xóa collection GUIDELINES, đọc diseaseGuidelines.json, upsert
indexIngredients()       // xóa collection INGREDIENTS, đọc thư mục ingredients/ (tất cả file JSON), batch 10, upsert

// Định dạng chuỗi tài liệu (cái được embed + lưu trữ):
// Recipe:    "{name}. {mealType} for {goal}. Ingredients: {ingredients}. {description}"
// Guideline: "{disease}: {summary}. Tips: {mealTips}"
// Ingredient: "{name} ({aliases}). {nutritionProfile}. Safe for: {safeFor}."

// Metadata được lưu (phẳng, yêu cầu của ChromaDB — không có object hay array lồng nhau):
// Recipe:    { name, mealType, cuisine, goal: "lose-weight,improve-health", diseaseCompatible: "diabetes,hypertension", tags: "..." }
// Guideline: { disease, type: 'guideline' }
// Ingredient:{ name, category, safeFor: "diabetes,hypertension", avoidFor: "" }
```

### Ngữ Cảnh RAG Xuất Hiện Trong Prompt Như Thế Nào

`promptBuilder.js` đưa ngữ cảnh RAG vào **giữa** khối sở thích người dùng và khối QUY TẮC NGHIÊM NGẶT:

```
You are a professional nutritionist. Generate ONE creative breakfast meal...

User Preferences:
- Goal: lose-weight
- Diet: balanced
...

REFERENCE CONTEXT (inspiration only — do not copy):         ← Ngữ cảnh RAG bắt đầu ở đây
Reference meals (use as inspiration, do NOT copy exactly):
1. Oatmeal with Mixed Berries: rolled oats, blueberries, chia seeds. Fiber-rich breakfast.
2. Tofu Scramble: firm tofu, bell pepper, spinach, turmeric. Plant-based scramble.
Dietary guidelines to follow:
- diabetes: Pair carbs with protein to slow glucose absorption.
                                                             ← Ngữ cảnh RAG kết thúc ở đây
STRICT RULES:
1. Return JSON ONLY — no code blocks, no markdown...
```

Ngữ cảnh được bỏ qua hoàn toàn nếu `retrievedContext` rỗng hoặc null (ví dụ: ChromaDB bị ngừng).

### Chain-of-Thought Có Chọn Lọc (Chỉ Bữa Ăn Có Bệnh Lý)

Khi người dùng có bệnh lý, `buildMealPrompt()` đưa thêm một **khối suy luận từng bước** trước phần QUY TẮC NGHIÊM NGẶT. Khối này yêu cầu mô hình liệt kê rõ ràng nguyên liệu cấm/hạn chế/ưu tiên và xác minh an toàn trước khi sinh JSON. Phần text suy luận CoT được bỏ qua bởi `parseAIResponse()` sử dụng `extractBalancedJSON()` (đếm ngoặc) để chỉ trích xuất đối tượng JSON.

Với bữa ăn không có bệnh lý, prompt bỏ qua CoT hoàn toàn và dùng định dạng phẳng nhanh hơn (nguyên liệu cấm/hạn chế/ưu tiên thêm vào sau QUY TẮC NGHIÊM NGẶT). Cách tiếp cận có chọn lọc này giữ tốc độ cho trường hợp thông thường trong khi cải thiện tuân thủ ràng buộc ở nơi quan trọng nhất — bữa ăn có hạn chế y tế.

### Hạ Tầng

```yaml
# docker-compose.rag.yml
services:
  chromadb:
    image: chromadb/chroma:latest   # v1.0.0, sử dụng endpoint /api/v2
    ports: ["8000:8000"]
    volumes: [chroma_data:/chroma/chroma]
    environment:
      IS_PERSISTENT: "TRUE"         # dữ liệu tồn tại qua lần khởi động lại container
      PERSIST_DIRECTORY: /chroma/chroma
    restart: unless-stopped
```

Các script:
```bash
npm run rag:start   # docker-compose up -d
npm run rag:stop    # docker-compose down
npm run rag:index   # node scripts/indexKnowledgeBase.js
```

---

## 6. Lớp API

### 5.1 API Xác Thực

#### POST `/api/auth/register`
- **Đầu vào:** `{ email, password, username?, fullName?, phone?, birthday?, gender?, height?, currentWeight? }`
- **Chính sách mật khẩu:** tối thiểu 8 ký tự, phải chứa ít nhất một chữ hoa, một chữ thường, và một chữ số
- **Hành động:** Tạo user, hash mật khẩu bằng bcrypt, cấp JWT access token (15 phút) + refresh token (30 ngày). `height` và `currentWeight` được lưu trên tài liệu User và tự động điền sẵn các trường đó khi người dùng tạo hồ sơ sức khỏe sau này.
- **Phản hồi:** `{ user: { id, email, username, role, height, currentWeight }, accessToken, refreshToken }`
- **JWT payload:** `{ id, email, role }` — `role` được bao gồm để route handlers có thể kiểm tra quyền dựa trên vai trò mà không cần truy vấn DB thêm

#### POST `/api/auth/login`
- **Đầu vào:** `{ email, password }`
- **Hành động:** Xác minh mật khẩu bằng bcrypt, luân chuyển refresh token, cấp token mới
- **Giới hạn tần suất:** 5 lần trong 15 phút qua `loginLimiter`

#### POST `/api/auth/logout`
- **Đầu vào:** `{ refreshToken }` + `Authorization: Bearer <accessToken>`
- **Hành động:** Đưa access token vào blacklist trong `TokenBlacklist` (tự động hết hạn qua TTL index), xóa refresh token khỏi bản ghi user

#### GET `/api/auth/profile`
- **Phản hồi:** `{ id, email, username, fullName, phone, birthday, gender, height, currentWeight, role, createdAt }`

#### PUT `/api/auth/profile`
- **Đầu vào:** Bất kỳ tập con nào của `{ username, fullName, phone, birthday, gender }`

#### POST `/api/auth/refresh-token`
- **Đầu vào:** `{ refreshToken }`
- **Phản hồi:** `{ accessToken }`

#### POST `/api/auth/revoke-token`
- **Đầu vào:** `{ refreshToken }`
- **Hành động:** Xóa refresh token cụ thể khỏi danh sách token của user

#### DELETE `/api/auth/:id`
- **Đầu vào:** User ID trong path + Bearer token (admin hoặc chính tài khoản)

---

### 5.2 API Hồ Sơ Sức Khỏe

#### POST `/api/health-profile`
- **Đầu vào:** `{ activityLevel?, sleepDuration?, diseases?, dietPreference?, mealsPerDay?, cuisinePreference? }`
- **Hành động:** Upsert (tạo hoặc cập nhật) hồ sơ sức khỏe cho người dùng đã xác thực. Mỗi người dùng một hồ sơ được đảm bảo bởi unique index trên `userId`. `gender`, `age` (suy ra từ `birthday`), `height`, `currentWeight` được lấy tự động từ tài khoản User và không thể chỉnh sửa qua endpoint này.
- **Lưu ý:** `desiredWeight` **không** thuộc resource này — nó được chuyển thành trường theo từng request trên `POST /api/meal-plans/generate` (purpose=weight_management).
- **Cách dùng:** Hồ sơ là nền tảng cho mọi quá trình tạo kế hoạch bữa ăn

#### GET `/api/health-profile`
- **Phản hồi:** Tài liệu hồ sơ sức khỏe đầy đủ

#### DELETE `/api/health-profile`

---

### 5.3 API Kế Hoạch Bữa Ăn

#### POST `/api/meal-plans/generate` (Endpoint cốt lõi)
- **Đầu vào:** Bearer token + `{ purpose, ... }` (hồ sơ sức khỏe được tự động lấy)
- **Tham số `purpose`** (bắt buộc, enum):

| Purpose | Trường bắt buộc kèm theo | Hành vi |
|---------|--------------------------|---------|
| `daily_health_based` | `healthSnapshot?` (Apple Watch / HealthKit) | Tạo kế hoạch **1 ngày** dựa trên hồ sơ + tín hiệu sức khỏe trong ngày. Nếu cung cấp cả `restingEnergyKcal` lẫn `activeEnergyKcal`, dùng tổng hai giá trị làm `tdeeOverride` (bỏ qua tính BMR). |
| `weight_management` | `weightGoal` (`lose-weight`/`gain-weight`/`muscle-gain`), `desiredWeight` (kg), `durationWeeks` (1\|2\|4) | Tạo kế hoạch 1/2/4 tuần. Trả **HTTP 400 + `reason: weight_goal_contraindication`** nếu `weightGoal` chống chỉ định với bệnh đã ghi nhận. `muscle-gain` ánh xạ nội bộ thành goal `gain-weight` (macro calculator đã ưu tiên protein đủ để tăng cơ). |
| `disease_based` | `durationWeeks` (1\|2\|4) | Yêu cầu hồ sơ có ≥ 1 bệnh, nếu không trả 400. Buộc goal nội bộ thành `improve-health` để pipeline tập trung vào quản lý bệnh. |

- **Hành động:** Pipeline tạo đầy đủ (xem Mục 8 để biết luồng chi tiết)
- **Phản hồi:**
```json
{
  "ok": true,
  "mealPlan": {
    "_id": "...",
    "title": "4-Week Meal Plan",
    "duration": { "weeks": 4, "totalDays": 28 },
    "days": [
      {
        "day": 1,
        "totalCalories": 1800,
        "macros": { "protein": 140, "carbs": 180, "fat": 50 },
        "meals": [
          {
            "mealType": "breakfast",
            "calories": 450,
            "macros": { "protein": 35, "carbs": 45, "fat": 12 },
            "name": "Grilled Chicken Quinoa Bowl",
            "description": "...",
            "ingredients": ["chicken breast", "quinoa", "spinach"],
            "benefits": ["High protein", "Complex carbs"]
          }
        ]
      }
    ]
  },
  "disclaimer": "This meal plan is generated by AI..."  // chỉ khi có bệnh
}
```

#### GET `/api/meal-plans`
- **Hành động:** Trả về kế hoạch bữa ăn hiện tại của người dùng. Mỗi người dùng chỉ có tối đa một kế hoạch — tạo mới sẽ thay thế kế hoạch cũ.
- **Phản hồi:** Object `MealPlan`

#### GET `/api/meal-plans/:planId/shopping-list`
- **Đầu vào:** Tùy chọn `?startDay=1&endDay=7`
- **Phản hồi:**
```json
{
  "ok": true,
  "shoppingList": {
    "totalItems": 42,
    "dayRange": { "start": 1, "end": 7 },
    "categories": {
      "Produce": ["spinach", "broccoli"],
      "Protein": ["chicken breast", "salmon"],
      "Dairy": ["greek yogurt"],
      "Grains": ["quinoa", "brown rice"],
      "Pantry": ["olive oil", "garlic"],
      "Other": [...]
    }
  }
}
```

#### DELETE `/api/meal-plans/:id`
#### DELETE `/api/meal-plans` (xóa kế hoạch bữa ăn hiện tại của người dùng)

---

### 5.4 API Công Thức — ĐÃ XÓA

Resource `/api/recipes` mồ côi (model, controller, routes, validator, tests) đã bị xóa vào tháng 04/2026. Nó không có dữ liệu production, không được frontend sử dụng và không có roadmap. Các "recipe" được tham chiếu ở nơi khác trong tài liệu này (cơ sở kiến thức, collection của RAG indexer, v.v.) đề cập đến `src/data/knowledgeBase/recipes.json`, một mối quan tâm tách biệt.

---

### 5.5 API Yêu Thích

#### POST `/api/favorites` — `{ targetType: "meal-plan", targetId, note? }`
#### GET `/api/favorites` — `?targetType=&page=&limit=`
#### GET `/api/favorites/check` — `?targetType=&targetId=` → `{ isFavorited: true|false }`
#### DELETE `/api/favorites/:id`

---

### 5.6 Kiểm Tra Sức Khỏe Hệ Thống

#### GET `/api/health` → `{ status: "ok", timestamp: "..." }`

---

## 7. Xử Lý Dữ Liệu

### Kiến Trúc Lưu Trữ MongoDB

| Model | Trường chính | Indexes |
|-------|-------------|---------|
| `User` | email, password (bcrypt), gender, birthday, height, currentWeight, refreshTokens[] | email (unique) |
| `HealthProfile` | userId, gender (snapshot), age (tính từ birthday), diseases[] (mảng subdocument `{ key, diagnosedAt, stage?, indicators[] }`) | userId (unique) |
| `MealPlan` | userId, **purpose** (`daily_health_based\|weight_management\|disease_based`), days[], duration | userId + createdAt (compound) |
| `Favorite` | userId, targetType (`'meal-plan'` only), targetId | userId+targetType+targetId (unique compound) |
| `TokenBlacklist` | token, expiresAt | token (unique), expiresAt (TTL — tự động xóa) |

### Pipeline Biến Đổi Dữ Liệu Cho Kế Hoạch Bữa Ăn

1. **Xác thực đầu vào (Joi):** Các trường hồ sơ sức khỏe được xác thực theo schema
2. **Tính toán dinh dưỡng:** Các hàm thuần túy tạo ra `{ calorieTarget, macros, mealDistribution }`
3. **Điều chỉnh bệnh lý:** Macros bị giới hạn; danh sách hạn chế nguyên liệu được xây dựng
4. **Truy xuất RAG:** Theo mealType — embed truy vấn → tra cứu ChromaDB → định dạng chuỗi ngữ cảnh
5. **Tạo AI:** LLM nhận prompts với ngữ cảnh nền tảng, trả về văn bản thô chứa nội dung dạng JSON
6. **Làm sạch phản hồi:** `sanitizeResponse()` loại bỏ tất cả trường số từ đầu ra AI
7. **Xác thực Schema (AJV):** Schema JSON nghiêm ngặt xác nhận cấu trúc và các trường bắt buộc
8. **Xác thực logic:** Tổng calorie và phép tính macro được kiểm tra với dung sai 1%
9. **Hợp nhất:** Macros tính bởi backend được hợp nhất vào nội dung sáng tạo do AI tạo
10. **Xác thực an toàn:** Mỗi bữa ăn được quét nguyên liệu bị cấm; bữa ăn không an toàn được tạo lại
11. **Lưu trữ:** Kế hoạch hoàn chỉnh được lưu vào MongoDB với đầy đủ metadata

### Xử Lý Danh Sách Mua Sắm

- Duyệt qua tất cả bữa ăn trong phạm vi ngày được yêu cầu
- Tổng hợp chuỗi nguyên liệu thành mảng phẳng
- Áp dụng phân loại dựa trên từ khóa
- Loại bỏ trùng lặp và trả về bản đồ danh mục có cấu trúc

---

## 8. Xử Lý Đầu Vào Người Dùng

### Các Điểm Thu Thập Đầu Vào

| Route | Validator | Schema |
|-------|-----------|--------|
| `POST /auth/register` | Joi | `registerSchema` |
| `POST /auth/login` | Joi | `loginSchema` |
| `PUT /auth/profile` | Joi | `updateProfileSchema` |
| `POST /health-profile` | Joi | `healthProfileSchema` |
| `POST /meal-plans/generate` | Joi (purpose-aware) | `generateMealPlanSchema` |

### Ràng Buộc Hồ Sơ Sức Khỏe

```
activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active'
mealsPerDay:   1–6
sleepDuration: 0–24 (giờ)
diseases:      [{ key, diagnosedAt?, stage?, indicators: [{ key, value, unit?, measuredAt?, note? }] }]
               — key cross-check với src/data/diseaseCatalog.js (11 bệnh)
               — stage (integer 1–5) cho phân giai đoạn CKD (kidney-disease)
               — indicator key cross-check với relatedIndicators của bệnh đó
               — key trùng lặp và indicator trùng lặp bị từ chối
cuisinePreference: mảng (tối đa 10)
```

**Lấy tự động từ tài khoản User (không thể chỉnh sửa trên hồ sơ sức khỏe):** `gender`, `age` (suy ra từ `birthday`), `height`, `currentWeight`.

**Đã xóa (chuyển thành theo từng request):** `desiredWeight` được cung cấp cho `POST /api/meal-plans/generate` (purpose=weight_management), không lưu trên hồ sơ.

### Ràng Buộc Tạo Kế Hoạch Bữa Ăn

```
purpose:       'daily_health_based' | 'weight_management' | 'disease_based'   (BẮT BUỘC)

# chỉ weight_management — bắt buộc khi purpose=weight_management, cấm trong purpose khác
weightGoal:    'lose-weight' | 'gain-weight' | 'muscle-gain'
desiredWeight: 20–500 (kg)
durationWeeks: 1 | 2 | 4

# chỉ disease_based
durationWeeks: 1 | 2 | 4   (bắt buộc)

# chỉ daily_health_based — telemetry Apple Watch / HealthKit (tùy chọn)
healthSnapshot: {
  activeEnergyKcal:  0–8000,
  restingEnergyKcal: 0–5000,
  steps:             integer ≥0,
  heartRateAvg:      20–250,
  sleepHours:        0–24,
  measuredAt:        date
}
```

### Làm Sạch Đầu Vào Cho Prompt AI

`sanitizePromptInput()` trong `promptBuilder.js` (được export để tái sử dụng bởi `ragContextBuilder.js`):

```javascript
export function sanitizePromptInput(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\n\r\t]/g, ' ')   // loại bỏ xuống dòng
    .replace(/\s+/g, ' ')         // gộp khoảng trắng
    .slice(0, maxLen)              // giới hạn độ dài
    .trim();
}
```

**Làm sạch bổ sung dành riêng cho RAG** trong `ragContextBuilder.js`:
- Áp dụng `sanitizePromptInput()` cho mọi trường từ tài liệu truy xuất
- Loại bỏ mọi văn bản chứa từ khóa tấn công: `ignore`, `forget`, `system`, `assistant`, `human`, `instruction`, `override`
- Giới hạn cứng: tổng 1500 ký tự đầu ra

---

## 9. Kỹ Thuật AI

| Kỹ thuật | Sử dụng? | Chi tiết |
|----------|----------|----------|
| **Prompt Engineering** | ✅ Có | Kỹ thuật chính. Mẫu có cấu trúc với ràng buộc rõ ràng và hướng dẫn định dạng JSON |
| **Prompt Templates** | ✅ Có | `buildMealPrompt()` với các slot tham số cho mục tiêu dinh dưỡng, hạn chế, sở thích, ngữ cảnh RAG |
| **Phòng chống Prompt Injection** | ✅ Có | Đầu vào người dùng được làm sạch trước khi chèn; nội dung RAG được kiểm tra thêm từ khóa tấn công |
| **Error-Feedback Prompting** | ✅ Có | Lý do xác thực thất bại được đưa vào prompt thử lại qua tham số `errorFeedback` |
| **Retrieval-Augmented Generation (RAG)** | ✅ Có | Tìm kiếm vector ChromaDB truy xuất bữa ăn tham khảo tương tự + hướng dẫn bệnh lý; đưa vào làm ngữ cảnh prompt |
| **Embeddings** | ✅ Có | `bge-m3` qua LM Studio tạo vector 1024 chiều cho tìm kiếm tương đồng ngữ nghĩa |
| **Fine-tuning** | ❌ Không | Không huấn luyện hay điều chỉnh mô hình |
| **Few-shot Examples** | ✅ Một phần | RAG hiệu quả cung cấp few-shot examples động được rút từ cơ sở kiến thức |
| **Chain-of-Thought** | ✅ Có chọn lọc | Khi có bệnh lý, prompt yêu cầu mô hình suy luận từng bước qua danh sách nguyên liệu cấm/hạn chế/ưu tiên trước khi sinh JSON. Bỏ qua cho bữa ăn không có bệnh để giữ tốc độ. Phần suy luận CoT được bỏ qua bởi `parseAIResponse` (trích xuất JSON bằng đếm ngoặc) |
| **Tool Use / Function Calling** | ❌ Không | Hoàn thành văn bản thô, JSON được phân tích thủ công |
| **Streaming** | ❌ Không | `stream: false`, phản hồi đồng bộ |

### Ràng Buộc Thiết Kế AI Chính (Không Thay Đổi)

Hệ thống được thiết kế có chủ đích để AI **không thể ảnh hưởng đến giá trị dinh dưỡng**. Tất cả calories và macros được tính trước khi gọi AI và đưa vào sau khi tạo:

```javascript
// src/services/ai/mealGenerator.js
const FORBIDDEN_NUMERIC_FIELDS = ['calories', 'macros', 'protein', 'carbs', 'fat', 'totalCalories']
function sanitizeResponse(parsed) {
  for (const field of FORBIDDEN_NUMERIC_FIELDS) {
    if (field in parsed) throw new Error(`AI included forbidden field: ${field}`)
  }
  return { name, description, ingredients, benefits } // chỉ 4 trường này
}
```

Quy tắc này cũng áp dụng cho cơ sở kiến thức: thư mục `recipes/` **không chứa số liệu calorie hay macro** — chỉ có tên nguyên liệu, mô tả và tags. Ngữ cảnh RAG không thể đưa giá trị dinh dưỡng dạng số vào prompt.

---

## 10. Luồng Hệ Thống End-to-End

### Pipeline Đầy Đủ: Đầu Vào Người Dùng → Kế Hoạch Bữa Ăn Đã Lưu

```
Bước 1: Xác thực
  POST /api/auth/login
  → JWT access token được cấp (hết hạn 15 phút)
  → Refresh token được lưu trong User.refreshTokens[]

Bước 2: Thiết lập Hồ Sơ Sức Khỏe
  POST /api/health-profile
  → Xác thực Joi (age, weight, diseases enum, v.v.)
  → Upsert vào collection HealthProfile (mỗi user một hồ sơ)

Bước 3: Tạo Kế Hoạch Bữa Ăn
  POST /api/meal-plans/generate

  [3a] Lấy HealthProfile từ MongoDB
       Nếu height hoặc currentWeight thiếu → điền sẵn từ tài liệu User

  [3a-purpose] Phân nhánh theo purpose (MỚI):
       templateDays = 7 (mặc định); goalOverride = undefined; tdeeOverride = undefined
       purpose=daily_health_based →
         templateDays = 1; requestedWeeks = 1
         tdeeOverride = restingEnergyKcal + activeEnergyKcal (nếu cả hai hữu hạn)
       purpose=weight_management →
         checkWeightGoalContraindications(weightGoal, allDiseaseKeys)
           → nếu chặn: HTTP 400 + reason: weight_goal_contraindication
         goalOverride = mapWeightGoalToEngineGoal(weightGoal)  // muscle-gain → gain-weight
         requestedWeeks = durationWeeks
       purpose=disease_based →
         yêu cầu hồ sơ có ≥1 bệnh, nếu không trả HTTP 400
         goalOverride = 'improve-health'
         requestedWeeks = durationWeeks

  [3b] Nutrition Engine (tất định):
       generateNutritionPlan(profile, { goalOverride, tdeeOverride })
       BMR = 10×weight + 6.25×height − 5×age ± hằng số
       TDEE = tdeeOverride ?? BMR × activityFactor
       calorieTarget = TDEE × goalMultiplier (giới hạn 1200–4000)
       macros = { protein: weight×1.8g, fat: 25%, carbs: phần còn lại }
       mealDistribution = phân chia theo mealsPerDay (30/40/30 cho 3 bữa)
       duration = calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks })
                  → nếu requestedWeeks được set, weeks = requestedWeeks (bỏ qua tính chênh lệch cân nặng)
                  → nếu không, weeks = |currentWeight − desiredWeight| / tốc độ tuần (giới hạn 1–52)

  [3c] Disease Engine (nếu có bệnh):
       Với mỗi bệnh → tải quy tắc từ diseaseRules.js
       Áp dụng giới hạn nghiêm ngặt nhất qua tất cả bệnh (ví dụ: protein ≤ 0.8g/kg cho bệnh thận)
       Phân phối lại calories dư thừa cho macros chưa bị giới hạn
       Giới hạn lại sau phân phối
       Kiểm tra khả thi: nếu calories đã điều chỉnh lệch >10% so với mục tiêu → throw error
       Tính lại phân phối bữa ăn từ macros đã điều chỉnh
       Xây dựng forbiddenIngredients[], limitedIngredients[], preferredIngredients[]

  [3d] Truy xuất RAG (song song hoàn toàn):
       Thu thập mealTypes duy nhất từ nutritionPlan.mealDistribution
       Gọi một Promise.all() duy nhất để lấy tất cả cùng lúc:
         → retrieveDiseaseGuidelines(diseases) — gọi MỘT lần, tái sử dụng cho tất cả mealTypes
         → retrieveRelevantMeals({ mealType, ... }) — một lần cho mỗi mealType, tất cả song song
       Mỗi truy xuất xây dựng chuỗi truy vấn tiếng Việt qua bản đồ EN→VI:
         "món bữa sáng cho mục tiêu lose-weight ẩm thực Việt Nam phở"
         → getEmbedding(queryString) qua LM Studio /v1/embeddings (bge-m3, vector 1024 chiều)
         → queryDocuments(RECIPES, vector, { nResults: 3, where: { mealType } })
       Với mỗi mealType: buildMealContext(meals, guidelines)
         → làm sạch, loại bỏ nội dung tấn công, giới hạn 1500 ký tự
         → kết quả: ragContextByMealType["breakfast"] = "Reference meals: ..."
       Nếu bất kỳ bước nào throw → ghi log cảnh báo, ragContextByMealType = {} (tiếp tục tạo không có ngữ cảnh)

  [3e] Tạo AI đồng thời (mỗi bữa ăn, tối đa 3 đồng thời):
       Với mỗi ngày (1–7) × mỗi bữa ăn:
         Xây dựng prompt: buildMealPrompt({
           mealType, calories, protein, carbs, fat, goal,
           dietPreference, cuisinePreference, diseases,
           forbiddenIngredients, limitedIngredients, preferredIngredients,
           retrievedContext: ragContextByMealType[mealType] ?? null  ← Đưa RAG vào
         })
         Gọi LM Studio: POST /v1/chat/completions (timeout 30 giây)
         Phân tích phản hồi: loại bỏ markdown → trích xuất JSON
         Làm sạch: từ chối bất kỳ trường số nào

         [3e-retry] Nếu tạo thất bại:
           Đưa errorFeedback vào prompt, thử lại (tối đa 2 lần)

  [3f] Xác thực an toàn (mỗi bữa ăn):
       Với mỗi nguyên liệu trong phản hồi AI:
         Kiểm tra với forbiddenIngredients sử dụng Unicode-aware lookaround regex
         ví dụ: /(?<![\p{L}\p{N}])đường(?![\p{L}\p{N}])/iu — an toàn với dấu tiếng Việt
         (JS \b chỉ xử lý ASCII nên không dùng được cho tiếng Việt)
       Nếu không an toàn: tạo lại bữa ăn (tối đa 2 lần tạo lại mỗi bữa)

  [3g] Xác thực Schema (AJV):
       Xác thực kế hoạch đã lắp ráp theo mealPlan.schema.js nghiêm ngặt
       Bắt buộc: days[], mỗi day có meals[], mỗi meal có name/description/ingredients/benefits

  [3h] Xác thực Logic:
       Tổng calories bữa ăn ≈ day.totalCalories (dung sai ±1%)
       protein×4 + carbs×4 + fat×9 ≈ totalCalories (dung sai ±1%)

  [3i] Nhân bản mẫu 7 ngày qua thời gian kế hoạch (1–52 tuần)

  [3j] Lưu vào MongoDB:
       MealPlan được lưu với cây days/meals đầy đủ, duration, swapCount: 0

  [3k] Phản hồi:
       Trả về mealPlan
       Nếu có bệnh: thêm medicalDisclaimer
       Nếu có unsupportedDiseases: liệt kê trong phản hồi

Bước 4: Danh sách mua sắm
  GET /api/meal-plans/:planId/shopping-list?startDay=1&endDay=7
  → Tổng hợp tất cả chuỗi nguyên liệu từ các ngày được chọn
  → Phân loại theo mẫu từ khóa
  → Trả về có cấu trúc { categories: { Produce, Protein, Dairy, Grains, Pantry, Other } }
```

---

## 11. Sơ Đồ Logic Dịch Vụ

Phần này truy vết logic chính xác bên trong mỗi lớp dịch vụ — công thức, hằng số, quyết định rẽ nhánh, và hình dạng dữ liệu — để nhà phát triển có thể hiểu code mà không cần mở từng file.

---

### 10.1 Nutrition Engine (`src/services/nutrition/`)

`generateNutritionPlan(healthProfile, { goalOverride, tdeeOverride })`. Hai tùy chọn là cách controller meal-plan inject hành vi theo purpose:
- `goalOverride` — ghi đè goal mặc định `'improve-health'` (dùng bởi `weight_management` để inject `weightGoal` theo từng request).
- `tdeeOverride` — bỏ qua hoàn toàn tính BMR/TDEE (dùng bởi `daily_health_based` khi có đủ resting + active energy từ Apple Watch).

Plan trả về bao gồm **effective `goal`** để các code downstream duy trì nhất quán với phân phối macro nhận được.

```
Đầu vào: healthProfile { currentWeight, height, age, gender, activityLevel, mealsPerDay }
         options      { goalOverride?, tdeeOverride? }
                                    │
                         validateInputs()
                         • weight: 20–500 kg
                         • height: 50–300 cm
                         • age: 1–120
                         • gender: 'male' | 'female'
                         throw nếu bất kỳ trường nào không hợp lệ
                                    │
                        ┌───────────▼───────────┐
                        │    calculateBMR()      │  bmrCalculator.js
                        │                        │
                        │  Mifflin-St Jeor:      │
                        │  base = 10W + 6.25H    │
                        │        - 5A            │
                        │  nam:    base + 5      │
                        │  nữ:    base - 161    │
                        └───────────┬────────────┘
                                    │ bmr (float)
                        ┌───────────▼───────────┐
                        │   calculateTDEE()      │  tdeeCalculator.js
                        │                        │
                        │  TDEE = BMR × hệ số    │
                        │                        │
                        │  sedentary       1.200 │
                        │  lightly-active  1.375 │
                        │  moderately-act  1.550 │
                        │  very-active     1.725 │
                        │  extremely-act   1.900 │
                        └───────────┬────────────┘
                                    │ tdee (float)
                        ┌───────────▼────────────────┐
                        │  calculateCalorieTarget()   │  calorieTargetCalculator.js
                        │                             │
                        │  target = TDEE × hệ số nhân │
                        │  lose-weight:  × 0.80       │
                        │  gain-weight:  × 1.10       │
                        │  improve-health: × 1.00     │
                        │                             │
                        │  sàn: nam=1500, nữ=1200    │
                        │  trần: 4000 kcal           │
                        │  result = clamp(sàn,trần)  │
                        └───────────┬─────────────────┘
                                    │ calorieTarget (số nguyên)
                        ┌───────────▼───────────┐
                        │   calculateMacros()    │  macroCalculator.js
                        │                        │
                        │  protein (g/kg × kg):  │
                        │   lose-weight:  1.8g   │
                        │   gain-weight:  1.6g   │
                        │   improve-hlth: 1.4g   │
                        │                        │
                        │  fat (% của kcal ÷ 9): │
                        │   lose-weight:  25%    │
                        │   gain-weight:  25%    │
                        │   improve-hlth: 30%    │
                        │                        │
                        │  carbs = (kcal         │
                        │   - protein×4          │
                        │   - fat×9) ÷ 4         │
                        │  (lấp đầy phần còn lại)│
                        └───────────┬────────────┘
                                    │ { protein, carbs, fat } (grams)
                        ┌───────────▼───────────┐
                        │   distributeMacros()   │  mealMacroDistributor.js
                        │                        │
                        │  mealsPerDay=3:         │
                        │   breakfast 30%        │
                        │   lunch     40%        │
                        │   dinner    30%        │
                        │                        │
                        │  mealsPerDay=4:         │
                        │   mỗi bữa 25%         │
                        │   [bfst,lunch,snk,din] │
                        │                        │
                        │  mealsPerDay=5:         │
                        │   mỗi bữa 20%         │
                        │   [bfst,snk,lunch,     │
                        │    snk,dinner]         │
                        │                        │
                        │  Sửa lỗi làm tròn:    │
                        │   bữa lớn nhất hấp thụ│
                        │   chênh lệch làm tròn  │
                        │   để đảm bảo tổng chính│
                        │   xác                  │
                        └───────────┬────────────┘
                                    │ mealDistribution[]
                                    │ [{ mealType, calories, protein, carbs, fat }, ...]

Đầu ra: { bmr, tdee, calorieTarget, macros, mealDistribution }
```

**Duration Calculator** (`durationCalculator.js`):
```
calculatePlanDuration({ goal, currentWeight, desiredWeight, requestedWeeks })

Nếu requestedWeeks được cung cấp (1, 2, hoặc 4):
  → dùng trực tiếp (purpose=weight_management hoặc disease_based)
  → đầu ra: { weeks: requestedWeeks, templateDays: 7, totalDays: requestedWeeks × 7 }

Ngược lại, dùng heuristic chênh lệch cân nặng:
  goal = 'lose-weight':    weeks = ceil(|current - desired| / 0.5)
  goal = 'gain-weight':    weeks = ceil(|desired - current| / 0.25)
  goal = 'improve-health': weeks = 1 (mặc định)
  giới hạn: weeks = max(1, min(52, weeks))

Lưu ý: desiredWeight không còn lưu trên HealthProfile — được truyền theo từng request
qua POST /api/meal-plans/generate (purpose=weight_management). Purpose daily_health_based
bỏ qua calculator này hoàn toàn (templateDays=1, lưu là { weeks: 0, totalDays: 1 }).
```

---

### 10.2 Disease Engine (`src/services/disease/`)

```
Đầu vào: nutritionPlan (từ NutritionEngine), healthProfile.diseases[]
                                    │
              ┌─────────────────────▼──────────────────────┐
              │         applyDiseaseAdjustments()           │  diseaseEngine.js
              │                                             │
              │  1. Phát hiện bệnh không được hỗ trợ       │
              │     (không có trong danh sách SUPPORTED_DISEASES)│
              │     → ghi log cảnh báo, hiển thị trong phản hồi │
              │                                             │
              │  2. adjustMacrosForDiseases()               │
              │                                             │
              │  3. Kiểm tra khả thi:                       │
              │     reconstructed = protein×4+carbs×4+fat×9 │
              │     drift = |reconstructed - target| / target│
              │     nếu drift > 10% → throw Error           │
              │     (kết hợp bệnh không khả thi)            │
              │                                             │
              │  4. effectiveCalories = reconstructed       │
              │  5. chạy lại distributeMacros()             │
              └─────────────────────┬───────────────────────┘
                                    │
              ┌─────────────────────▼──────────────────────┐
              │       adjustMacrosForDiseases()             │  macroAdjuster.js
              │                                             │
              │  Thu thập giới hạn nghiêm ngặt nhất mỗi   │
              │  macro qua TẤT CẢ bệnh (nghiêm ngặt nhất thắng):│
              │                                             │
              │  diabetes:      maxCarbPct = 35%            │
              │  kidney-disease: maxProteinPerKg = 0.8g/kg  │
              │  high-uric-acid: maxProteinPct = 30%        │
              │                  maxFatPct = 25%            │
              │  hypertension:  maxFatPct = 25%             │
              │                                             │
              │  Chuyển sang grams:                         │
              │   maxCarbGrams = (kcal × carbPct%) / 4      │
              │   maxProteinGrams = min(                    │
              │     weight × maxProteinPerKg,               │
              │     kcal × maxProteinPct% / 4)              │
              │   maxFatGrams = (kcal × fatPct%) / 9        │
              │                                             │
              │  Áp dụng giới hạn + theo dõi calories dư:  │
              │   nếu carbs > cap → excess += diff×4        │
              │   nếu protein > cap → excess += diff×4      │
              │   nếu fat > cap → excess += diff×9          │
              │                                             │
              │  Phân phối lại excess cho macros chưa bị giới hạn:│
              │   carbs chưa bị? → carbs += excess/4        │
              │   fat chưa bị?   → fat   += excess/9        │
              │   protein chưa bị? → protein += excess/4    │
              │   tất cả bị?     → chia: nửa→carbs,        │
              │                          nửa→fat           │
              │                                             │
              │  Giới hạn lại sau phân phối:                │
              │   (thiếu hụt calorie được ưu tiên hơn      │
              │    vượt quá giới hạn y tế)                  │
              └─────────────────────┬───────────────────────┘
                                    │ đã điều chỉnh { protein, carbs, fat }

Danh sách nguyên liệu (xây dựng riêng, không điều chỉnh):
  getForbiddenIngredients(diseases)  → hợp của tất cả danh sách cấm theo bệnh
  getLimitedIngredients(diseases)    → hợp của tất cả danh sách hạn chế theo bệnh
  getPreferredIngredients(diseases)  → hợp của tất cả danh sách ưu tiên theo bệnh

  Ví dụ cho ['diabetes', 'hypertension']:
  forbidden = ['white sugar','candy','soda','syrup',...,'table salt',
               'soy sauce','fish sauce','pickles',...] (Set đã loại trùng)
```

**Xác thực an toàn sau khi tạo:**
```
validateGeneratedMeal(meal, diseases)          diseaseEngine.js
          │
          ▼
validateMealSafety(meal, diseases)             safetyValidator.js
          │
          ▼
filterIngredients(meal, diseases)              ingredientFilter.js
  │
  │  forbidden = getForbiddenIngredients(diseases)
  │  với mỗi thuật ngữ bị cấm:
  │    xây dựng regex: /(?<![\p{L}\p{N}])term(?![\p{L}\p{N}])/iu
  │    (Unicode-aware lookaround — an toàn với dấu tiếng Việt;
  │     ngăn "ham" khớp "edamame", "beer" khớp "beet")
  │  quét mọi chuỗi nguyên liệu
  │  thu thập flagged[]
  │
  └→ { safe: flagged.length === 0, flaggedIngredients, meal }

Kết quả: { safe: bool, reasons: ["Forbidden ingredients found: X, Y"] }
```

**Triết lý thiết kế DISEASE_RULES vs DISEASE_CATALOG:**

`DISEASE_CATALOG` (`src/data/diseaseCatalog.js`) liệt kê **toàn bộ 11 bệnh** mà hệ thống có thể ghi nhận trên hồ sơ sức khỏe người dùng. `DISEASE_RULES` (`src/services/disease/diseaseRules.js`) chỉ bao phủ **4 bệnh được đánh dấu `supported: true`** — những bệnh có quy tắc dinh dưỡng đủ cụ thể để tự động hóa an toàn.

7 bệnh `supported: false` (fatty-liver, high-cholesterol, heart-disease, obesity, anemia, gastritis, insomnia) vẫn được lưu trên hồ sơ, hiển thị qua `GET /api/diseases`, và được tham chiếu bởi các kiểm tra chống chỉ định trong `mealPlanPurposeService.js` (ví dụ: `obesity` chặn `gain-weight`, `anemia` chặn `lose-weight`) — nhưng bộ máy macro có chủ đích bỏ qua chúng. Điều này tránh tạo ra thực đơn sai về mặt y tế cho các bệnh có quy tắc chế độ ăn quá phức tạp hoặc phụ thuộc vào tình trạng cụ thể để có thể mã hóa thành một bộ quy tắc duy nhất.

Để mở rộng hỗ trợ cho một bệnh mới chỉ cần hai thay đổi: thêm entry `macroAdjustment + forbiddenIngredients + limitedIngredients + preferredIngredients` vào `DISEASE_RULES` và đổi `supported: false → true` trong catalog. Không cần thay đổi bất kỳ code controller hay service nào.

---

### 10.3 Lớp RAG (`src/services/rag/`)

```
Đầu vào: { mealType, goal, diseases[], cuisine }  theo mỗi mealType duy nhất
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │               retriever.js                          │
         │                                                     │
         │  RAG_ENABLED === 'false'?                           │
         │    → trả về null / [] ngay lập tức (bỏ qua tất cả) │
         │                                                     │
         │  retrieveRelevantMeals():                           │
         │    Xây dựng chuỗi truy vấn (bỏ qua trường null):   │
         │    "{mealType} meal for {goal} goal                 │
         │     {cuisine} cuisine"                              │
         │                                                     │
         │  retrieveDiseaseGuidelines(diseases):               │
         │    Với mỗi bệnh duy nhất:                           │
         │    query = "dietary guidelines for {disease}"       │
         └──────────────────────────┬──────────────────────────┘
                                    │ chuỗi truy vấn
         ┌──────────────────────────▼──────────────────────────┐
         │            embeddingClient.js                       │
         │                                                     │
         │  normalizeText(query):                              │
         │    trim → lowercase → gộp khoảng trắng             │
         │                                                     │
         │  POST LM_STUDIO_EMBEDDING_URL                       │
         │  { model: EMBEDDING_MODEL, input: [query] }         │
         │  timeout: 10 giây AbortController                   │
         │  phân tích: data[0].embedding → float[1024]          │
         │                                                     │
         │  Khi lỗi → trả về null (suy thoái nhẹ nhàng)       │
         └──────────────────────────┬──────────────────────────┘
                                    │ queryEmbedding: float[1024] | null
                   null? ───────────┘ bỏ qua truy xuất, trả về null
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │              vectorStore.js                         │
         │                                                     │
         │  queryDocuments(collection, embedding, options):    │
         │                                                     │
         │  Truy vấn bữa ăn:                                  │
         │    collection: 'recipes'                            │
         │    nResults: 3                                      │
         │    where: { mealType: 'breakfast' }                 │
         │    (chỉ bộ lọc bằng — $in không được hỗ trợ)       │
         │                                                     │
         │  Truy vấn hướng dẫn (mỗi bệnh):                   │
         │    collection: 'guidelines'                         │
         │    nResults: 1                                      │
         │    where: { disease: 'diabetes' }                   │
         │                                                     │
         │  ChromaDB: tìm kiếm tương đồng cosine              │
         │  Trả về: { ids, documents, metadatas, distances }   │
         │  Khi lỗi → trả về null (suy thoái nhẹ nhàng)       │
         └──────────────────────────┬──────────────────────────┘
                                    │ kết quả ChromaDB thô
         ┌──────────────────────────▼──────────────────────────┐
         │           ragContextBuilder.js                      │
         │                                                     │
         │  buildMealContext(retrievedMeals, retrievedGuidelines)
         │                                                     │
         │  Phân tích mục bữa ăn:                             │
         │    với mỗi cặp metadata+document:                   │
         │      name = sanitizePromptInput(meta.name, 80)      │
         │      doc  = sanitizePromptInput(document, 200)      │
         │      loại bỏ nếu tìm thấy từ khóa tấn công:        │
         │      /\b(ignore|forget|system|assistant|            │
         │          human|instruction|override)\b/i            │
         │                                                     │
         │  Phân tích mẹo hướng dẫn:                          │
         │    với mỗi document trong kết quả:                  │
         │      tip = sanitizePromptInput(doc, 150)            │
         │      loại bỏ nếu tìm thấy từ khóa tấn công        │
         │                                                     │
         │  Lắp ráp đầu ra:                                   │
         │  "Reference meals (use as inspiration...):\n        │
         │   1. {name}: {doc}\n                                │
         │   2. ...\n                                          │
         │   Dietary guidelines to follow:\n                   │
         │   - {tip}\n"                                        │
         │                                                     │
         │  Giới hạn cứng: cắt tại \n cuối cùng trước 1500 ký tự│
         │  Đầu vào rỗng → trả về ""                          │
         └──────────────────────────┬──────────────────────────┘
                                    │ contextString (≤1500 ký tự) | ""

Đầu ra: ragContextByMealType = {
  "breakfast": "Reference meals...",
  "lunch":     "Reference meals...",
  "dinner":    "Reference meals...",
}
(chuỗi rỗng cho mealTypes không có ngữ cảnh truy xuất được)
```

**Luồng đánh chỉ mục** (`indexer.js` + `scripts/indexKnowledgeBase.js`):
```
npm run rag:index
        │
        ▼
indexAllCollections() chạy song song:
  ┌─────────────────┬──────────────────┬──────────────────┐
  │  indexRecipes() │ indexGuidelines()│indexIngredients()│
  │                 │                  │                  │
  │ kích thước batch: 10│ tất cả cùng lúc│ kích thước batch: 10│
  │                 │                  │                  │
  │ chuỗi doc:      │ chuỗi doc:       │ chuỗi doc:       │
  │ "{name}.        │ "{disease}:      │ "{name}          │
  │  {mealType}     │  {summary}.      │  ({aliases}).    │
  │  for {goal}.    │  Tips:           │  {nutritionProf} │
  │  Ingredients:   │  {tips.join}"    │  Safe for:       │
  │  {ingredients}. │                  │  {safeFor}"      │
  │  {description}" │                  │                  │
  │                 │                  │                  │
  │ metadata:       │ metadata:        │ metadata:        │
  │  name,mealType, │  disease,        │  name, category, │
  │  cuisine,       │  type:'guideline'│  safeFor,        │
  │  goal(csv),     │                  │  avoidFor        │
  │  diseaseComp(csv│                  │  (tất cả csv)    │
  │  tags(csv)      │                  │                  │
  └─────────────────┴──────────────────┴──────────────────┘
        │                 │                   │
        └─────────────────┴───────────────────┘
        Xóa rồi re-index mỗi collection (clean re-index, không phải idempotent upsert)
        Trả về: { recipes: 96, guidelines: 11, ingredients: 85, errors: 0 }
```

---

### 10.4 Lớp AI (`src/services/ai/`)

```
Đầu vào: mealInput { mealType, calories, protein, carbs, fat, goal,
                   dietPreference, cuisinePreference, diseases,
                   forbiddenIngredients, limitedIngredients,
                   preferredIngredients, retrievedContext }
callBudget: { remaining: N }
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │               generateMeal()                        │  mealGenerator.js
         │                                                     │
         │  MAX_MEAL_RETRIES = 2  (tổng cộng tối đa 3 lần)    │
         │                                                     │
         │  với attempt 0..2:                                  │
         │    callBudget.remaining-- (throw nếu 0)             │
         │    errorFeedback = lastError.message (hoặc null)    │
         │    prompt = buildMealPrompt({...mealInput,          │
         │               errorFeedback, retrievedContext})     │
         │    rawText = callLMStudio(prompt)                   │
         │    parsed  = parseAIResponse(rawText)               │
         │    result  = sanitizeResponse(parsed)               │
         │    trả về result  ← thành công                      │
         │    khi lỗi → lastError = error, thử lại            │
         │                                                     │
         │  throw nếu tất cả lần thử thất bại                 │
         └──────────────────────────┬──────────────────────────┘
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │              buildMealPrompt()                      │  promptBuilder.js
         │                                                     │
         │  Làm sạch mọi đầu vào người dùng:                  │
         │   sanitizePromptInput(str, maxLen):                 │
         │   → thay [\n\r\t] bằng khoảng trắng               │
         │   → gộp khoảng trắng                               │
         │   → cắt tới maxLen (mặc định 100)                  │
         │                                                     │
         │  Các phần prompt (theo thứ tự):                     │
         │  ┌─────────────────────────────────────────────┐   │
         │  │ "You are a professional nutritionist.       │   │
         │  │  Generate ONE creative {mealType} meal."    │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ Ngữ cảnh mục tiêu (chỉ ngữ cảnh, không xuất):│  │
         │  │  calories, protein, carbs, fat              │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ Sở thích người dùng:                        │   │
         │  │  goal, diet, cuisines, diseases             │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ Hướng dẫn định dạng JSON + ví dụ            │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ [nếu retrievedContext không rỗng]:          │   │
         │  │  REFERENCE CONTEXT (chỉ cảm hứng):         │   │
         │  │  {retrievedContext}                         │   │  ← Đưa RAG vào
         │  ├─────────────────────────────────────────────┤   │
         │  │ [nếu có bệnh — CoT có chọn lọc]:           │   │  ← Chain-of-Thought
         │  │  SUY LUẬN TỪNG BƯỚC:                       │   │
         │  │  1. Liệt kê tình trạng sức khỏe            │   │
         │  │  2. Nguyên liệu CẤM (KHÔNG BAO GIỜ dùng)  │   │
         │  │  3. Nguyên liệu HẠN CHẾ (dùng ít)         │   │
         │  │  4. Nguyên liệu ƯU TIÊN                    │   │
         │  │  5. Chọn nguyên liệu AN TOÀN               │   │
         │  │  6. Xác minh không có nguyên liệu cấm      │   │
         │  │  7. Xuất JSON                               │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ QUY TẮC NGHIÊM NGẶT (1–6)                  │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ [nếu KHÔNG có bệnh — định dạng phẳng]:     │   │
         │  │ [nếu forbidden]: KHÔNG được dùng: ...       │   │
         │  │ [nếu limited]:   Dùng hạn chế: ...         │   │
         │  │ [nếu preferred]: Ưu tiên dùng: ...         │   │
         │  ├─────────────────────────────────────────────┤   │
         │  │ [nếu errorFeedback]:                        │   │
         │  │  QUAN TRỌNG: lỗi trước cần sửa: ...       │   │
         │  └─────────────────────────────────────────────┘   │
         └──────────────────────────┬──────────────────────────┘
                                    │ chuỗi prompt
         ┌──────────────────────────▼──────────────────────────┐
         │               callLMStudio()                        │  aiClient.js
         │                                                     │
         │  POST LM_STUDIO_URL                                 │
         │  body: {                                            │
         │    model: 'local-model',                            │
         │    messages: [                                      │
         │      { role:'system', content: SYSTEM_MESSAGE },    │
         │      { role:'user', content: prompt }               │
         │    ],                                               │
         │    temperature: 0.2,                                │
         │    max_tokens: 2000,                                │
         │    top_p: 0.9                                       │
         │  }                                                  │
         │  timeout: 30 giây AbortController                   │
         │  giới hạn kích thước: throw nếu phản hồi > 50KB    │
         │  trả về: data.choices[0].message.content            │
         └──────────────────────────┬──────────────────────────┘
                                    │ rawText
         ┌──────────────────────────▼──────────────────────────┐
         │              parseAIResponse()                      │  aiClient.js
         │                                                     │
         │  loại bỏ ```json ... ``` markdown fences            │
         │  nếu text không bắt đầu bằng '{':                  │
         │    extractBalancedJSON() — quét đếm dấu ngoặc      │
         │    (theo dõi depth, inString, ký tự escape)         │
         │  JSON.parse(jsonText)                               │
         │  throw nếu không tìm thấy JSON cân bằng            │
         └──────────────────────────┬──────────────────────────┘
                                    │ đối tượng đã phân tích
         ┌──────────────────────────▼──────────────────────────┐
         │              sanitizeResponse()                     │  mealGenerator.js
         │                                                     │
         │  Từ chối nếu BẤT KỲ key nào có mặt:               │
         │   calories, macros, protein, carbs, fat,            │
         │   totalCalories                                     │
         │                                                     │
         │  Yêu cầu: name (chuỗi không rỗng)                  │
         │  Yêu cầu: ingredients (mảng chuỗi không rỗng)      │
         │                                                     │
         │  Chỉ trả về: { name, description,                  │
         │                  ingredients, benefits }            │
         └──────────────────────────┬──────────────────────────┘
                                    │
Đầu ra: { name, description, ingredients[], benefits[] }
```

**Xử lý đồng thời** (`concurrency.js`):
```
runWithConcurrency(tasks[], limit=3):
  Tạo min(limit, tasks.length) worker coroutines
  Mỗi worker lặp: chọn task tiếp theo chưa bắt đầu → await → lưu kết quả
  Tất cả workers chạy song song qua Promise.all()
  Kết quả trả về theo thứ tự task gốc

Ví dụ: 21 tasks (7 ngày × 3 bữa), limit=3
  Worker-1: task0, task3, task6, task9, task12, task15, task18
  Worker-2: task1, task4, task7, task10, task13, task16, task19
  Worker-3: task2, task5, task8, task11, task14, task17, task20
  (xấp xỉ — phụ thuộc vào thời gian)
```

---

### 10.5 Dịch Vụ Xác Thực Bữa Ăn (`src/services/mealValidationService.js`)

```
Đầu vào: plan { days[] }, healthProfile { mealsPerDay }
DEVIATION_THRESHOLD = 1%

Với mỗi day trong plan.days:

  validateCaloriesConsistency(day):
    sum = Σ meal.calories
    nếu |sum - day.totalCalories| / day.totalCalories > 1%
    → lỗi: "Day N: tổng calories bữa ăn (X) lệch so với totalCalories (Y)"

  validateMacroConsistency(day):
    estimated = day.macros.protein×4 + day.macros.carbs×4 + day.macros.fat×9
    nếu |estimated - day.totalCalories| / day.totalCalories > 1%
    → lỗi: "Day N: calories tính từ macro (X) lệch so với totalCalories (Y)"

  validateMealsPerDay(day, expectedMealsPerDay):
    nếu day.meals.length !== mealsPerDay
    → lỗi: "Day N: mong đợi X bữa nhưng có Y"

Đầu ra: { valid: bool, errors: string[] | null }
Ghi chú: xác thực logic thất bại gây thử lại kế hoạch (không phải lỗi cứng),
      tối đa MAX_RETRIES=2 lần thử lại toàn bộ
```

---

### 10.6 Điều Phối Đầy Đủ (`src/controllers/mealplan.controller.js`)

```
POST /api/meal-plans/generate
                                    │
         Lấy HealthProfile từ MongoDB
         Xác thực các trường bắt buộc: [gender, age, currentWeight, height]
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │       BƯỚC 0: Phân nhánh theo purpose (MỚI)         │
         │                                                      │
         │  purpose = req.body.purpose                          │
         │  templateDays = 7  (mặc định)                        │
         │  goalOverride = undefined                            │
         │  tdeeOverride = undefined                            │
         │  requestedWeeks = undefined                          │
         │                                                      │
         │  if purpose === 'daily_health_based':                │
         │    templateDays = 1                                  │
         │    requestedWeeks = 1                                │
         │    tdeeOverride = restingEnergyKcal +                │
         │                   activeEnergyKcal                   │
         │      (từ req.body.healthSnapshot, nếu cả hai hữu hạn)│
         │                                                      │
         │  if purpose === 'weight_management':                 │
         │    checkWeightGoalContraindications(weightGoal,      │
         │      allDiseaseKeys)                                 │
         │      → 400 nếu bị chặn (vd: gain-weight + obesity,  │
         │        muscle-gain + kidney-disease,                 │
         │        lose-weight + anemia)                         │
         │    goalOverride =                                    │
         │      mapWeightGoalToEngineGoal(weightGoal)           │
         │      ('muscle-gain' → 'gain-weight')                 │
         │    requestedWeeks = durationWeeks (1, 2, hoặc 4)     │
         │                                                      │
         │  if purpose === 'disease_based':                     │
         │    yêu cầu allDiseaseKeys.length > 0 (nếu không 400)│
         │    goalOverride = 'improve-health'                   │
         │    requestedWeeks = durationWeeks (1, 2, hoặc 4)     │
         └──────────────────────────┬──────────────────────────┘
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │            BƯỚC 1: Nutrition Engine                  │
         │  generateNutritionPlan(healthProfile,                │
         │    { goalOverride, tdeeOverride })                   │
         │  → { bmr, tdee, calorieTarget, goal, macros,        │
         │      mealDistribution }                              │
         │  (effective goal được trả về — dùng downstream)     │
         └──────────────────────────┬──────────────────────────┘
                                    │
                         diseases.length > 0?
                         có ──────▼──────── không
         ┌──────────────────────────▼──────────────────────────┐
         │            BƯỚC 2: Disease Engine                    │
         │  applyDiseaseAdjustments(nutritionPlan, profile)     │
         │  → macros đã điều chỉnh, mealDistribution mới       │
         │  → unsupportedDiseases (hiển thị trong phản hồi)    │
         │  throw nếu khả thi drift > 10%                      │
         └──────────────────────────┬──────────────────────────┘
                                    │
         Xây dựng danh sách nguyên liệu:
         getForbiddenIngredients(diseases)
         getLimitedIngredients(diseases)
         getPreferredIngredients(diseases)
                                    │
         ┌──────────────────────────▼──────────────────────────┐
         │            BƯỚC 3: Truy Xuất RAG (song song)            │
         │  uniqueMealTypes = Set của mealTypes trong phân phối │
         │  try:                                                │
         │    Một Promise.all() duy nhất lấy tất cả:           │
         │      - retrieveDiseaseGuidelines(diseases) — 1 lần  │
         │      - retrieveRelevantMeals({ mealType, goal,      │
         │          diseases, cuisine })                        │
         │          — mỗi mealType, tất cả song song           │
         │    với mỗi mealType:                                │
         │      ragContextByMealType[mealType] =               │
         │        buildMealContext(meals, guidelines)           │
         │  catch bất kỳ lỗi nào:                              │
         │    ghi log cảnh báo, ragContextByMealType = {}      │
         │    (tiếp tục tạo mà không có ngữ cảnh)             │
         └──────────────────────────┬──────────────────────────┘
                                    │
         aiCallBudget = min(60, templateDays × mealsPerDay × 2 + 10)
         callBudget = { remaining: aiCallBudget }
         (templateDays = 1 cho daily_health_based, 7 cho các purpose khác)
                                    │
         ┌─────────── VÒNG LẶP THỬ LẠI (tối đa 3 lần) ───────┐
         │                                                     │
         │  BƯỚC 4: Xây dựng task bữa ăn                      │
         │  với dayIndex 0..(templateDays-1) × mỗi dist:       │
         │    task = () => generateMeal({                      │
         │      mealType: dist.mealType,                       │
         │      calories, protein, carbs, fat,                 │
         │      goal: nutritionPlan.goal,  ← effective goal    │
         │      dietPreference, cuisinePreference,             │
         │      diseases,                                      │
         │      forbiddenIngredients, limitedIngredients,      │
         │      preferredIngredients,                          │
         │      retrievedContext: ragContextByMealType[mealType]│
         │    }, callBudget)                                   │
         │                                                     │
         │  BƯỚC 5: Tạo đồng thời                             │
         │  mealResults = runWithConcurrency(tasks, limit=3)   │
         │                                                     │
         │  BƯỚC 6: Xác thực an toàn (mỗi bữa ăn)            │
         │  với mỗi mealResult:                                │
         │    nếu có bệnh:                                     │
         │      với regenAttempt 0..2:                         │
         │        result = validateGeneratedMeal(meal, diseases)│
         │        nếu an toàn → break                          │
         │        nếu !an toàn && budget > 0 → tạo lại        │
         │      nếu vẫn không an toàn → safetyFailed = true → break│
         │                                                     │
         │  BƯỚC 7: Lắp ráp mẫu 7 ngày                        │
         │  templateDays = nhóm mealResults theo dayIndex      │
         │  hợp nhất nội dung AI + dinh dưỡng backend vào mỗi bữa│
         │                                                     │
         │  BƯỚC 8: Xác thực Schema (AJV)                     │
         │  validateMealPlan(templatePlan)                     │
         │  nếu không hợp lệ → lastErrors = errors, tiếp tục thử lại│
         │                                                     │
         │  BƯỚC 9: Xác thực Logic                             │
         │  validateFullMealPlan(templatePlan, healthProfile)  │
         │  nếu không hợp lệ → lastErrors = errors, tiếp tục thử lại│
         │                                                     │
         │  mẫu hợp lệ → thoát vòng lặp thử lại              │
         └─────────────────────────────────────────────────────┘
                                    │
         Nhân bản mẫu qua duration:
         - daily_health_based: bỏ qua nhân bản; dùng 1-day template,
           lưu là { weeks: 0, totalDays: 1 }
         - ngược lại: với week 0..(weeks-1): với mỗi templateDayObj:
             push { ...templateDayObj, day: week×7 + day.day }
                                    │
         Lưu vào MongoDB: MealPlan.create({
           userId, healthProfileId, title, days,
           purpose,                          ← MỚI
           duration: { weeks, totalDays },
           aiModel: 'lm-studio',
           prompt: 'per-meal-generation'
         })
                                    │
         Phản hồi:
           { ok: true, mealPlan }
           + disclaimer (nếu có bệnh)
           + unsupportedDiseases (nếu có)
```

---

## 12. Tổng Kết

Eat Clean API là một **hệ thống lập kế hoạch bữa ăn ưu tiên an toàn, được tăng cường RAG**, được xây dựng trên sự phân tách trách nhiệm rõ ràng:

**Backend sở hữu (tất định):**
- Tất cả tính toán dinh dưỡng (BMR, TDEE, calories, macros, phân phối bữa ăn)
- Quy tắc hạn chế bệnh lý và điều chỉnh macro
- Xác thực an toàn nguyên liệu
- Xác thực schema dữ liệu
- Tuyển chọn cơ sở kiến thức và đánh chỉ mục vector

**Lớp RAG cung cấp (nền tảng):**
- Bữa ăn tham khảo có ngữ nghĩa tương tự từ cơ sở kiến thức được tuyển chọn
- Hướng dẫn chế độ ăn theo bệnh được truy xuất bằng tương đồng ngữ nghĩa
- Được định dạng là "ngữ cảnh cảm hứng" — LLM được yêu cầu rõ ràng không sao chép

**AI sở hữu (sáng tạo):**
- Tên và mô tả bữa ăn
- Gợi ý nguyên liệu (chịu lọc an toàn, lấy cảm hứng từ ngữ cảnh truy xuất)
- Mô tả lợi ích sức khỏe

Kiến trúc này đảm bảo **an toàn y tế không bao giờ được ủy thác cho AI**. Ngay cả khi LLM gợi ý bữa ăn có nguyên liệu bị cấm, bộ xác thực an toàn sẽ bắt và từ chối nó. Tất cả giá trị dinh dưỡng dạng số trong kế hoạch cuối cùng đều chứng minh được là do backend tính — LLM không thể tăng hoặc giảm lượng calorie. Cơ sở kiến thức cũng không chứa dữ liệu dinh dưỡng dạng số, nên ngữ cảnh RAG không thể đưa số liệu vào qua cửa sau.

### Các Điểm Không Nhất Quán Đã Biết

| Yêu cầu | Trạng thái triển khai |
|----------|----------------------|
| Giới hạn lập trình sodium/potassium/sugar | KHÔNG được thực thi có chủ đích (cần cơ sở dữ liệu dinh dưỡng); danh sách đen nguyên liệu được dùng thay thế |
| Logging request bằng Morgan | Morgan có trong dependencies nhưng không sử dụng; `requestLogger` tùy chỉnh bằng Winston được dùng thay thế |
| Bộ lọc ChromaDB `$in` cho mảng bệnh | Không được ChromaDB hỗ trợ trên metadata chuỗi; lọc tương thích bệnh để cho prompt xử lý |

### Các Bản Sửa Bảo Mật Đã Áp Dụng

| Vấn đề | Cách sửa | File đã thay đổi |
|--------|----------|-------------------|
| ReDoS qua `$regex` với đầu vào người dùng thô trong tìm kiếm công thức | Escape tất cả ký tự regex đặc biệt bằng `escapeRegex()` trước khi truyền cho `$regex` | `recipe.controller.js` *(file đã bị xóa vào tháng 04/2026 cùng toàn bộ resource `/api/recipes` — xem §5.4)* |
| Thiếu kiểm tra quyền sở hữu khi cập nhật/xóa công thức | Lấy công thức trước; xác minh `author === req.user.id`; admin bỏ qua kiểm tra; trả 403 nếu không | `recipe.controller.js` *(file đã bị xóa vào tháng 04/2026 cùng toàn bộ resource `/api/recipes` — xem §5.4)* |
| Rò rỉ chi tiết lỗi nội bộ qua `e.message` trong phản hồi auth | Tất cả catch blocks giờ ghi log qua `logger.error()` và trả về `'Internal server error'` chung | `auth.controller.js` |
| Chính sách mật khẩu yếu (tối thiểu 6 ký tự, không yêu cầu độ phức tạp) | Nâng lên tối thiểu 8 ký tự + yêu cầu chữ hoa, chữ thường, và chữ số | `auth.validator.js`, `User.js` |
| `role` thiếu trong JWT payload | Thêm `role` vào `signAccessToken()` để route handlers có thể kiểm tra trạng thái admin mà không cần truy vấn DB | `auth.controller.js` |
