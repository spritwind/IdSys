/**
 * 組織架構模組 - TypeScript 類型定義
 * UC Capital Identity Admin
 */

// 組織群組完整資料
export interface OrganizationGroup {
    id: string;
    name: string;
    path: string;
    parentId: string | null;
    description: string | null;
    depth: number;
    subGroupCount: number;
    deptCode: string | null;
    deptEName: string | null;
    deptZhName: string | null;
    manager: string | null;
    enabled: boolean;
    insDate: string;
    updDate: string;
}

// 組織樹狀結構節點
export interface OrganizationTreeNode {
    id: string;
    name: string;
    parentId: string | null;
    deptCode: string | null;
    deptEName: string | null;
    deptZhName: string | null;
    manager: string | null;
    description: string | null;
    depth: number;
    /** 是否為 CEO/最高層級節點（後端計算） */
    isCeo: boolean;
    /** 是否為根節點 */
    isRoot: boolean;
    /** 子節點數量 */
    childCount: number;
    children: OrganizationTreeNode[];
}

// 組織統計資料
export interface OrganizationStats {
    totalGroups: number;
    totalRootGroups: number;
    maxDepth: number;
    groupsWithManagers: number;
}

// 節點類型判斷
export type NodeType = 'ceo' | 'root' | 'branch' | 'leaf';

/**
 * 判斷節點類型
 * 優先使用後端傳來的 isCeo 屬性
 */
export function getNodeType(node: OrganizationTreeNode, isRootLevel: boolean): NodeType {
    // 使用後端計算的 isCeo 屬性
    if (node.isCeo) return 'ceo';
    // 根節點（parentId 為空或在根層級）
    if (node.isRoot || isRootLevel) return 'root';
    // 有子節點的為分支
    if (node.children && node.children.length > 0) return 'branch';
    // 否則為葉節點
    return 'leaf';
}

/**
 * 檢查是否為 CEO 節點
 * @deprecated 請使用 node.isCeo 屬性（後端已計算）
 */
export function isCeoNode(node: OrganizationTreeNode): boolean {
    // 優先使用後端傳來的屬性
    if (typeof node.isCeo === 'boolean') {
        return node.isCeo;
    }

    // 後備邏輯：關鍵字匹配（相容舊版 API）
    const nameCheck = node.name?.toLowerCase() || '';
    const codeCheck = node.deptCode?.toLowerCase() || '';
    const zhNameCheck = node.deptZhName || '';

    const ceoKeywords = ['ceo', 'chief executive', '執行長', '總裁', '董事長', '總經理'];

    return ceoKeywords.some(keyword =>
        nameCheck.includes(keyword) ||
        codeCheck.includes(keyword) ||
        zhNameCheck.includes(keyword)
    );
}

// 視圖模式
export type ViewMode = 'chart' | 'table';

// 搜尋結果
export interface SearchResult {
    node: OrganizationTreeNode;
    path: string[];
    matchType: 'name' | 'code' | 'manager';
}

// ========================================
// CRUD 操作相關類型
// ========================================

/**
 * 新增組織群組請求
 */
export interface CreateOrganizationGroupRequest {
    name: string;
    parentId: string | null;
    deptCode?: string;
    deptZhName?: string;
    deptEName?: string;
    manager?: string;
    description?: string;
}

/**
 * 更新組織群組請求
 */
export interface UpdateOrganizationGroupRequest {
    name: string;
    parentId: string | null;
    deptCode?: string;
    deptZhName?: string;
    deptEName?: string;
    manager?: string;
    description?: string;
}

/**
 * 刪除確認資訊（包含待刪除的群組及子群組列表）
 */
export interface DeleteConfirmation {
    /** 待刪除的群組 */
    group: OrganizationGroup;
    /** 將被一同刪除的子群組列表 */
    descendants: OrganizationGroup[];
    /** 總計將刪除的群組數量（包含自身） */
    totalCount: number;
    /** 是否有子群組 */
    hasDescendants: boolean;
}

/**
 * 刪除結果
 */
export interface DeleteResult {
    /** 是否成功 */
    success: boolean;
    /** 刪除的群組數量 */
    deletedCount: number;
    /** 訊息 */
    message: string;
}
