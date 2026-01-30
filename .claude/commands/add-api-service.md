# Add API Service

Create a new API service file for the TwFrontEnd project following the established pattern.

## User Input

The user will provide:
- **Entity/Feature name** (e.g., "organization", "apiResource", "client")
- **Backend API base path** (e.g., "/api/organization-management")
- **Operations needed** (CRUD or specific operations)

## Template

Generate a file at `src/services/{featureName}Api.ts` with:

### 1. Imports and Base URL
```tsx
import { api } from './api';
import type { EntityDto, CreateEntityDto, UpdateEntityDto, PagedResult } from '../types/{featureName}';

const BASE_URL = '/api/{feature-management}';
```

### 2. GET List (with search/pagination)
```tsx
export interface SearchParams {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    // Add feature-specific filters
}

export async function getEntities(params: SearchParams = {}): Promise<PagedResult<EntityDto>> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await api.get<PagedResult<EntityDto>>(
        `${BASE_URL}?${queryParams.toString()}`
    );

    const data = response.data;

    // Defensive validation
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
        return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 0 };
    }

    return data;
}
```

### 3. GET Single
```tsx
export async function getEntityById(id: string): Promise<EntityDto> {
    const response = await api.get<EntityDto>(`${BASE_URL}/${id}`);
    return response.data;
}
```

### 4. POST Create
```tsx
export async function createEntity(dto: CreateEntityDto): Promise<EntityDto> {
    const response = await api.post<EntityDto>(BASE_URL, dto);
    return response.data;
}
```

### 5. PUT Update
```tsx
export async function updateEntity(id: string, dto: UpdateEntityDto): Promise<void> {
    await api.put(`${BASE_URL}/${id}`, dto);
}
```

### 6. DELETE
```tsx
export async function deleteEntity(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
}
```

### 7. Default Export Object
```tsx
export default {
    getEntities,
    getEntityById,
    createEntity,
    updateEntity,
    deleteEntity,
};
```

## Conventions

- **Import**: Always import `{ api }` from `'./api'` (named export, not default)
- **Types**: Import from `'../types/{featureName}'`; create the types file if it doesn't exist
- **Return types**: Always specify TypeScript return types on every function
- **Defensive validation**: Validate list responses — ensure `items` is an array
- **Query params**: Build with `URLSearchParams`, only append non-empty values
- **Error handling**: Let errors propagate — callers handle with try/catch + toast
- **Naming**: Functions use camelCase verbs: `getEntities`, `createEntity`, `deleteEntity`
- **Named exports**: Export each function individually AND as a default object
- **No console.log**: Use `logApi()` from `'../utils/debugLogger'` only if needed

## PagedResult Type
If not already in the types file, add:
```tsx
export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}
```

## Checklist
- [ ] Import `{ api }` from `'./api'`
- [ ] Define `BASE_URL` const
- [ ] TypeScript return types on all functions
- [ ] Defensive validation on list endpoints
- [ ] Named exports + default export object
- [ ] Types file created/updated in `src/types/`
