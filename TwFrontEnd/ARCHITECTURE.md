# UC Capital Identity Admin - 前端架構規劃

## 專案願景

將 Skoruba.Duende.IdentityServer.Admin.UI 的所有頁面重新設計為現代化的 React + Tailwind CSS 介面，打造頂尖的企業級身份管理系統。

---

## 設計系統 (Design System)

### 色彩系統

```css
/* 主色調 - UC Capital 品牌 */
--color-bg-primary: #0a0a0f;       /* 極深藍黑 */
--color-bg-secondary: #13131f;      /* 深藍 */
--color-bg-tertiary: #1a1a2e;       /* 卡片背景 */

/* 強調色 */
--color-accent-primary: #6366f1;    /* 靛藍紫 */
--color-accent-secondary: #ec4899;   /* 品紅 */
--color-accent-gold: #fbbf24;        /* 金色 */

/* 狀態色 */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-info: #3b82f6;

/* 文字色 */
--color-text-primary: #ffffff;
--color-text-secondary: #94a3b8;
--color-text-muted: #64748b;
```

### 視覺風格

| 元素 | 規範 |
|------|------|
| 圓角 | `rounded-xl` (12px) / `rounded-2xl` (16px) |
| 玻璃效果 | `backdrop-blur-xl` + `bg-white/5` + `border border-white/10` |
| 陰影 | `shadow-[0_0_30px_rgba(99,102,241,0.15)]` |
| 動畫 | Framer Motion, 300-500ms duration |
| 圖標 | Lucide React |
| 字體 | Inter (Google Fonts) |

---

## 頁面清單 (共 32 頁)

### 1. 首頁模組 (Home)
| 頁面 | 路由 | 功能 | 優先級 |
|------|------|------|--------|
| Dashboard | `/dashboard` | 系統概覽、統計卡片、快速操作 | P0 |

### 2. IdentityServer 設定模組 (Configuration)

#### 2.1 Clients 管理 (8 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 客戶端列表 | `/clients` | 搜尋、分頁、CRUD |
| 客戶端詳情 | `/clients/:id` | 多頁籤設定 |
| 基本設定 | `/clients/:id/settings` | 名稱、描述、啟用狀態 |
| 驗證設定 | `/clients/:id/authentication` | 授權類型、密鑰 |
| Token 設定 | `/clients/:id/tokens` | 生命週期、格式 |
| URL 設定 | `/clients/:id/urls` | 回調、登出、CORS |
| 資源設定 | `/clients/:id/resources` | Scopes、API |
| 進階設定 | `/clients/:id/advanced` | Claims、屬性 |

#### 2.2 API Resources (3 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| API 資源列表 | `/api-resources` | 搜尋、分頁、CRUD |
| API 資源詳情 | `/api-resources/:id` | 設定、Scopes、Secrets |
| API 密鑰管理 | `/api-resources/:id/secrets` | 新增、刪除密鑰 |

#### 2.3 API Scopes (2 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| API 範圍列表 | `/api-scopes` | 搜尋、分頁、CRUD |
| API 範圍詳情 | `/api-scopes/:id` | 設定、Claims |

#### 2.4 Identity Resources (2 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 身份資源列表 | `/identity-resources` | 搜尋、分頁、CRUD |
| 身份資源詳情 | `/identity-resources/:id` | 設定、Claims |

### 3. 身份管理模組 (Identity)

#### 3.1 Users 管理 (6 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 使用者列表 | `/users` | 搜尋、Gravatar、分頁 |
| 使用者詳情 | `/users/:id` | 個人資料編輯 |
| 角色指派 | `/users/:id/roles` | 指派/移除角色 |
| Claims 管理 | `/users/:id/claims` | 自訂宣告 |
| 外部登入 | `/users/:id/providers` | 已綁定的 OAuth |
| 變更密碼 | `/users/:id/password` | 密碼重設 |

#### 3.2 Roles 管理 (4 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 角色列表 | `/roles` | 搜尋、分頁、CRUD |
| 角色詳情 | `/roles/:id` | 名稱、描述 |
| 角色成員 | `/roles/:id/users` | 此角色的使用者 |
| 角色 Claims | `/roles/:id/claims` | 角色宣告 |

### 4. 安全與授權模組 (Security)

#### 4.1 Identity Providers (2 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 提供者列表 | `/identity-providers` | 外部 OAuth/OIDC |
| 提供者詳情 | `/identity-providers/:id` | 設定 |

#### 4.2 Persisted Grants (2 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 授權列表 | `/grants` | 搜尋、檢視、撤銷 |
| 授權詳情 | `/grants/:id` | 詳細資訊 |

#### 4.3 Keys (1 頁)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 金鑰管理 | `/keys` | 簽章金鑰列表、刪除 |

### 5. 日誌模組 (Logs)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 稽核日誌 | `/logs/audit` | 操作紀錄、篩選 |
| 錯誤日誌 | `/logs/errors` | 系統錯誤、堆疊追蹤 |

### 6. 組織架構模組 (Organization)
| 頁面 | 路由 | 功能 |
|------|------|------|
| 組織圖 | `/organization` | 樹狀圖、縮放、搜尋 |

---

## 組件架構

### 目錄結構

```
src/
├── components/
│   ├── ui/                    # 基礎 UI 組件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Switch.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Tabs.tsx
│   │   ├── Card.tsx
│   │   └── index.ts
│   │
│   ├── data/                  # 數據展示組件
│   │   ├── DataTable.tsx      # 可排序、分頁表格
│   │   ├── Pagination.tsx
│   │   ├── SearchInput.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingState.tsx
│   │   └── index.ts
│   │
│   ├── form/                  # 表單組件
│   │   ├── FormField.tsx
│   │   ├── FormSection.tsx
│   │   ├── TagInput.tsx       # 多標籤輸入
│   │   ├── SecretInput.tsx    # 密碼/密鑰輸入
│   │   ├── DatePicker.tsx
│   │   └── index.ts
│   │
│   ├── layout/                # 佈局組件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── PageHeader.tsx
│   │   ├── PageContent.tsx
│   │   └── index.ts
│   │
│   └── features/              # 功能組件
│       ├── ConfirmDialog.tsx  # 刪除確認
│       ├── UserAvatar.tsx     # Gravatar 整合
│       ├── StatusBadge.tsx    # 狀態標籤
│       ├── OrgChart.tsx       # 組織圖
│       └── index.ts
│
├── pages/
│   ├── dashboard/
│   │   └── Overview.tsx
│   │
│   ├── clients/
│   │   ├── ClientList.tsx
│   │   ├── ClientDetail.tsx
│   │   └── components/
│   │       ├── ClientForm.tsx
│   │       ├── ClientSecrets.tsx
│   │       └── ClientUrls.tsx
│   │
│   ├── api-resources/
│   ├── api-scopes/
│   ├── identity-resources/
│   ├── users/
│   ├── roles/
│   ├── identity-providers/
│   ├── grants/
│   ├── keys/
│   ├── logs/
│   └── organization/
│
├── hooks/                     # 自訂 Hooks
│   ├── useApi.ts              # API 呼叫
│   ├── useToast.ts            # 通知
│   ├── useConfirm.ts          # 確認對話框
│   ├── usePagination.ts       # 分頁邏輯
│   └── useDebounce.ts         # 防抖
│
├── services/                  # API 服務
│   ├── api.ts                 # Axios 實例
│   ├── clients.ts
│   ├── users.ts
│   ├── roles.ts
│   └── ...
│
├── types/                     # TypeScript 類型
│   ├── client.ts
│   ├── user.ts
│   ├── role.ts
│   └── ...
│
├── utils/                     # 工具函式
│   ├── format.ts              # 格式化
│   ├── validation.ts          # 驗證
│   └── crypto.ts              # 加密
│
└── constants/                 # 常數
    ├── routes.ts
    ├── messages.ts
    └── config.ts
```

---

## 共用組件規格

### DataTable 組件

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (state: PaginationState) => void;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  emptyMessage?: string;
}
```

特性：
- 響應式設計
- 可排序欄位
- 行內操作按鈕
- 載入骨架屏
- 空狀態顯示

### Modal 組件

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}
```

特性：
- 背景模糊 + 點擊關閉
- ESC 鍵關閉
- 動畫進出場
- 可自訂頁尾按鈕

### Toast 通知系統

```tsx
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
```

特性：
- 堆疊顯示（右上角）
- 自動消失 (預設 5 秒)
- 手動關閉
- 圖標區分類型

---

## API 整合策略

### 後端 API 端點對應

```typescript
// 基礎 URL
const API_BASE = '/api/admin';

// Clients
GET    /api/admin/clients              // 列表
GET    /api/admin/clients/:id          // 詳情
POST   /api/admin/clients              // 新增
PUT    /api/admin/clients/:id          // 更新
DELETE /api/admin/clients/:id          // 刪除

// Users
GET    /api/admin/users                // 列表
GET    /api/admin/users/:id            // 詳情
// ... 依此類推
```

### 錯誤處理

```typescript
// 統一錯誤格式
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// 全域錯誤攔截
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 重新登入
    }
    toast.error(error.response?.data?.message || '操作失敗');
    return Promise.reject(error);
  }
);
```

---

## 開發階段規劃

### Phase 1: 基礎建設 (1-2 週)
- [ ] 設計系統 CSS 變數
- [ ] 基礎 UI 組件 (Button, Input, Select, etc.)
- [ ] DataTable 組件
- [ ] Modal & Toast 組件
- [ ] API 服務層架構

### Phase 2: 核心頁面 (2-3 週)
- [ ] Dashboard 完善
- [ ] Clients 列表 + 詳情
- [ ] Users 列表 + 詳情
- [ ] Roles 列表 + 詳情

### Phase 3: 設定頁面 (2 週)
- [ ] API Resources
- [ ] API Scopes
- [ ] Identity Resources
- [ ] Identity Providers

### Phase 4: 進階功能 (1-2 週)
- [ ] Persisted Grants
- [ ] Keys 管理
- [ ] 稽核日誌
- [ ] 錯誤日誌
- [ ] 組織架構圖

### Phase 5: 優化與測試 (1 週)
- [ ] 效能優化
- [ ] 響應式測試
- [ ] 錯誤邊界處理
- [ ] 最終調校

---

## 設計參考

### 動畫規範

```tsx
// 頁面進場
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// 列表項目
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05 }
  })
};

// 模態框
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};
```

### 響應式斷點

```css
/* Tailwind 預設 */
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | React 19 + TypeScript |
| 樣式 | Tailwind CSS 3.4 |
| 動畫 | Framer Motion |
| 路由 | React Router 7 |
| 圖標 | Lucide React |
| 表單 | React Hook Form + Zod |
| 狀態 | Zustand (如需全域狀態) |
| API | Axios + React Query |
| 日期 | date-fns |

---

*文件版本: 1.0*
*最後更新: 2024-12*
