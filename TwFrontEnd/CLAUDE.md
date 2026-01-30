# TwFrontEnd - Claude Code 指引

UC Capital Identity Admin 前端專案 — React/TypeScript 管理介面。

## 技術棧

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS 3.4** — 自訂深色主題 + glass morphism
- **Framer Motion 12** — 動畫
- **Lucide React** — 圖示
- **Axios** — HTTP（攔截器自動附加 Bearer token）
- **oidc-client-ts** + **react-oidc-context** — OIDC 驗證
- **Sonner** — Toast 通知
- **React Router DOM 7** — 路由
- **Base path**: `/app/`

## 開發指令

```bash
npm run dev       # 啟動開發伺服器 (Vite)
npm run build     # 正式建置 → dist/
npm run preview   # 預覽建置結果
```

## 目錄結構

```
src/
├── components/
│   ├── auth/        # ProtectedRoute
│   ├── common/      # 共用元件
│   ├── data/        # 資料展示（表格等）
│   ├── features/    # 功能專屬元件
│   ├── form/        # 表單元件
│   ├── layout/      # 佈局（Sidebar, Header）
│   └── ui/          # 基礎 UI 原件
├── config/          # 設定檔（OIDC, env）
├── contexts/        # React Context（AuthContext）
├── hooks/           # Custom hooks
├── layouts/         # 頁面佈局包裝
├── pages/           # 依功能分頁面
│   ├── clients/
│   ├── dashboard/
│   ├── organization/
│   ├── permission/
│   ├── roles/
│   ├── token-management/
│   └── users/
├── services/        # API 服務檔
├── types/           # TypeScript 型別定義
└── utils/           # 工具函式
```

## 關鍵 Pattern

### Modal 元件

```
Props: { entity: EntityDto; onClose: () => void; onSave: () => void }
狀態: loading + saving
載入: useEffect + Promise.all
變更偵測: useMemo (hasChanges)
儲存: try/catch + toast.success/toast.error
動畫: motion.div initial={{ opacity: 0, scale: 0.95 }}
面板: bg-gray-800 border-white/10 rounded-xl max-h-[90vh] flex flex-col
結構: Header (icon + title + X) → Content (scrollable) → Footer (取消 + 儲存)
```

### API Service

```
檔案: src/services/{feature}Api.ts
匯入: import { api } from './api'
常數: const BASE_URL = '/api/{feature-management}'
函式: named exports (getEntities, getEntityById, createEntity, updateEntity, deleteEntity)
預設匯出: export default { getEntities, ... }
回傳型別: 明確標註 Promise<T>
驗證: 列表回應需防禦性驗證 (確保 items 是陣列)
```

### Page 元件

```
資料狀態: items[], loading, totalCount, currentPage, pageSize
搜尋/篩選: searchTerm + filter states, debounce 300ms
載入: useCallback + useEffect
結構: Header + Stats Grid → Search Bar → DataTable → Pagination → Modals
表格: checkbox 選取 + hover 狀態 + action menu (MoreVertical)
分頁: 共 N 筆，第 X / Y 頁 + ChevronLeft/Right
Modal 整合: onClose (清除選取) + onSave (清除選取 + loadData)
```

### Type 定義

```
命名: DTO 後綴 (UserListDto, PermissionResourceDto)
搜尋: SearchParams 介面
分頁: PagedResult<T> { items, totalCount, pageNumber, pageSize, totalPages }
列舉: const assertions (as const) + 衍生型別
```

## 權限系統 V2

### 資料模型

```
Resource (PermissionResourceDto) — 樹狀結構 (parentId/children)，隸屬 Client
Scope (PermissionScopeDto) — 操作: r/c/u/d/e/all
Permission (PermissionDto) — Subject → Resource + Scopes
Subject — User | Role | Organization | Group (SUBJECT_TYPES)
```

### 常數

```typescript
SUBJECT_TYPES = { USER: 'User', ROLE: 'Role', ORGANIZATION: 'Organization', GROUP: 'Group' }
SCOPE_CODES = { READ: 'r', CREATE: 'c', UPDATE: 'u', DELETE: 'd', EXECUTE: 'e', ALL: 'all' }
```

### 批次操作

```
batchGrantPermissions({ subjectType, subjectId, subjectName, resourceScopes, inheritToChildren })
batchRevokePermissions([{ resourceId, scopes }])
```

## UI 設計規範

### 色彩

```
背景: #0a0a0f → #13131f → #1a1a2e → #1f1f35
強調: #6366f1 (indigo) | #ec4899 (pink) | #fbbf24 (gold)
文字: #ffffff | #94a3b8 | #64748b
```

### Glass Morphism

```
bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl
```

### 按鈕

```
Primary:   bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-indigo-500/25
Secondary: bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10
Danger:    bg-gradient-to-r from-red-500 to-red-600 text-white
```

### 輸入欄位

```
bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400
focus:border-indigo-500/50 focus:ring-2 ring-indigo-500/20
```

### 動畫 (Framer Motion)

```
入場: initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
Modal: initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
退場: 用 AnimatePresence 包裹
```

## 驗證架構

- OIDC with `oidc-client-ts` UserManager
- `AuthContext` 提供: `user`, `accessToken`, `isAuthenticated`, `hasRole()`
- Admin 判斷: roles 包含 `UCCapitalAdministrator` 或 `SkorubaIdentityAdminAdministrator`
- Token: Session storage + silent renewal
- API 攔截器自動處理 401/403 → redirect to login

## 語言慣例

- **UI 文字**: 繁體中文 (zh-TW) — 按鈕、標籤、toast 訊息、頁面標題
- **程式碼**: 英文 — 變數名、函式名、型別名
- **註解**: 中英文皆可

## 後端 API

- 開發環境: Vite proxy → `localhost:44302` (Admin.Api) / `localhost:44303` (Admin MVC)
- 正式環境: `VITE_ADMIN_API_URL` 環境變數
- Path alias: `@` → `./src`
