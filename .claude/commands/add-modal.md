# Add Modal Component

Create a new Modal component for the TwFrontEnd project following the established pattern.

## User Input

The user will provide:
- **Entity name** (e.g., "Client", "ApiResource", "Organization")
- **Purpose** (e.g., "edit permissions", "view details", "create new")
- **Data to display/edit** (optional — infer from entity type if not specified)

## Template

Generate a file at `src/pages/{feature}/components/{EntityName}Modal.tsx` with:

### 1. Props Interface
```tsx
interface Props {
    {entity}: {EntityDto};   // The entity being operated on
    onClose: () => void;     // Close modal without saving
    onSave: () => void;      // Called after successful save (parent reloads data)
}
```

### 2. State Management
```tsx
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
// Add entity-specific state here
```

### 3. Data Loading with Promise.all
```tsx
useEffect(() => {
    async function loadData() {
        setLoading(true);
        try {
            const [dataA, dataB] = await Promise.all([
                apiService.getA(),
                apiService.getB(),
            ]);
            // Process and set state
        } finally {
            setLoading(false);
        }
    }
    loadData();
}, [{entity}.id]);
```

### 4. Change Detection
```tsx
const hasChanges = useMemo(() => {
    // Compare current state vs original state
    // Return true if any changes detected
}, [currentState, originalState]);
```

### 5. Save Handler
```tsx
const handleSave = async () => {
    if (!hasChanges) { onClose(); return; }
    setSaving(true);
    try {
        await apiService.save(payload);
        toast.success('已儲存');
        onSave();
    } catch (error: any) {
        toast.error(error.response?.data?.message || '儲存失敗');
    } finally {
        setSaving(false);
    }
};
```

### 6. JSX Structure
```tsx
return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-800 border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                    <Icon className="w-5 h-5 text-indigo-400" />
                    Modal Title
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                ) : (
                    /* Render entity-specific content */
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                <button onClick={onClose}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 rounded-lg">
                    取消
                </button>
                <button onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-400 text-white font-medium rounded-lg hover:shadow-xl shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    儲存
                </button>
            </div>
        </motion.div>
    </div>
);
```

### 7. Required Imports
```tsx
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
```

## Checklist
- [ ] Props: entity + onClose + onSave
- [ ] loading / saving states
- [ ] Data loaded via Promise.all in useEffect
- [ ] hasChanges via useMemo for change detection
- [ ] Save uses try/catch with toast.success / toast.error
- [ ] motion.div with scale + opacity animation
- [ ] Overlay: fixed inset-0 bg-black/60 backdrop-blur-sm z-50
- [ ] Panel: bg-gray-800 border-white/10 rounded-xl max-h-[90vh] flex flex-col
- [ ] Header with icon + title + X close button
- [ ] Footer with 取消 (cancel) + 儲存 (save) buttons
- [ ] UI text in Traditional Chinese (zh-TW)
