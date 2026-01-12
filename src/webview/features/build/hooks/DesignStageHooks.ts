/**
 * DesignStageHooks - Custom hooks for Design workflow UI stages
 *
 * Provides:
 * - useModificationTracking: Track user edits to auto-generated content
 * - useStageGate: Manage "Approve & Continue" gate behavior
 * - useRegenerateHandler: Handle regeneration with preserved modifications
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 15.1-15.7, 13.6
 */

import { useState, useCallback, useMemo, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Generic item with ID that can be tracked
 */
export interface TrackableItem {
    id: string;
    [key: string]: unknown;
}

/**
 * Modification state for a single item
 */
export interface ItemModification<T extends TrackableItem> {
    original: T;
    current: T;
    isModified: boolean;
    isUserAdded: boolean;
    isDeleted: boolean;
    modifiedAt?: number;
}

/**
 * Overall modification tracking state
 */
export interface ModificationState<T extends TrackableItem> {
    items: Map<string, ItemModification<T>>;
    userAddedIds: Set<string>;
    deletedIds: Set<string>;
    modifiedIds: Set<string>;
}

/**
 * Gate state for approval workflow
 */
export interface GateState {
    isApproved: boolean;
    approvedAt?: number;
    requiresReapproval: boolean;
}

/**
 * Regeneration options
 */
export interface RegenerateOptions {
    preserveModified: boolean;
    preserveUserAdded: boolean;
    clearDeleted: boolean;
}

// ============================================================================
// useModificationTracking Hook
// ============================================================================

/**
 * Hook for tracking user modifications to generated items
 *
 * Tracks:
 * - Which items have been modified from their original state
 * - Which items were user-added (not generated)
 * - Which items have been deleted
 *
 * @param initialItems - Initially generated items
 * @returns Modification tracking state and handlers
 */
export function useModificationTracking<T extends TrackableItem>(
    initialItems: T[]
): {
    items: T[];
    modificationState: ModificationState<T>;
    updateItem: (id: string, updates: Partial<T>) => void;
    addItem: (item: T) => void;
    deleteItem: (id: string) => void;
    restoreItem: (id: string) => void;
    resetItem: (id: string) => void;
    setItems: (items: T[], preserveModifications?: boolean) => void;
    getModifiedItems: () => T[];
    getUserAddedItems: () => T[];
    hasModifications: boolean;
} {
    // Track original items from initial generation
    const originalItems = useRef<Map<string, T>>(new Map());

    // Current state of all items
    const [itemsMap, setItemsMap] = useState<Map<string, T>>(() => {
        const map = new Map<string, T>();
        initialItems.forEach(item => {
            map.set(item.id, item);
            originalItems.current.set(item.id, { ...item });
        });
        return map;
    });

    // Track user-added and deleted items
    const [userAddedIds, setUserAddedIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

    // Calculate which items are modified
    const modifiedIds = useMemo(() => {
        const modified = new Set<string>();
        itemsMap.forEach((current, id) => {
            const original = originalItems.current.get(id);
            if (original && JSON.stringify(current) !== JSON.stringify(original)) {
                modified.add(id);
            }
        });
        return modified;
    }, [itemsMap]);

    // Get current items as array (excluding deleted)
    const items = useMemo(() => {
        return Array.from(itemsMap.values()).filter(
            item => !deletedIds.has(item.id)
        );
    }, [itemsMap, deletedIds]);

    // Build modification state
    const modificationState = useMemo<ModificationState<T>>(() => ({
        items: new Map(
            Array.from(itemsMap.entries()).map(([id, current]) => [
                id,
                {
                    original: originalItems.current.get(id) || current,
                    current,
                    isModified: modifiedIds.has(id),
                    isUserAdded: userAddedIds.has(id),
                    isDeleted: deletedIds.has(id),
                    modifiedAt: modifiedIds.has(id) ? Date.now() : undefined,
                },
            ])
        ),
        userAddedIds,
        deletedIds,
        modifiedIds,
    }), [itemsMap, userAddedIds, deletedIds, modifiedIds]);

    // Update an existing item
    const updateItem = useCallback((id: string, updates: Partial<T>) => {
        setItemsMap(prev => {
            const current = prev.get(id);
            if (!current) return prev;
            const newMap = new Map(prev);
            newMap.set(id, { ...current, ...updates });
            return newMap;
        });
    }, []);

    // Add a new user-created item
    const addItem = useCallback((item: T) => {
        setItemsMap(prev => {
            const newMap = new Map(prev);
            newMap.set(item.id, item);
            return newMap;
        });
        setUserAddedIds(prev => new Set(prev).add(item.id));
    }, []);

    // Soft-delete an item (mark as deleted but preserve for restore)
    const deleteItem = useCallback((id: string) => {
        setDeletedIds(prev => new Set(prev).add(id));
    }, []);

    // Restore a deleted item
    const restoreItem = useCallback((id: string) => {
        setDeletedIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    }, []);

    // Reset an item to its original state
    const resetItem = useCallback((id: string) => {
        const original = originalItems.current.get(id);
        if (original) {
            setItemsMap(prev => {
                const newMap = new Map(prev);
                newMap.set(id, { ...original });
                return newMap;
            });
        }
    }, []);

    // Set items from new generation
    const setItems = useCallback((newItems: T[], preserveModifications = true) => {
        const newMap = new Map<string, T>();
        const newOriginals = new Map<string, T>();

        // First, add all new items
        newItems.forEach(item => {
            newMap.set(item.id, item);
            newOriginals.set(item.id, { ...item });
        });

        if (preserveModifications) {
            // Preserve user-added items
            userAddedIds.forEach(id => {
                const existing = itemsMap.get(id);
                if (existing) {
                    newMap.set(id, existing);
                }
            });

            // Preserve modifications to items that still exist
            modifiedIds.forEach(id => {
                const current = itemsMap.get(id);
                const newItem = newMap.get(id);
                if (current && newItem) {
                    // Keep the user's modifications
                    newMap.set(id, current);
                }
            });
        } else {
            // Clear all user state
            setUserAddedIds(new Set());
            setDeletedIds(new Set());
        }

        originalItems.current = newOriginals;
        setItemsMap(newMap);
    }, [itemsMap, userAddedIds, modifiedIds]);

    // Get only modified items
    const getModifiedItems = useCallback(() => {
        return Array.from(itemsMap.values()).filter(
            item => modifiedIds.has(item.id) && !deletedIds.has(item.id)
        );
    }, [itemsMap, modifiedIds, deletedIds]);

    // Get only user-added items
    const getUserAddedItems = useCallback(() => {
        return Array.from(itemsMap.values()).filter(
            item => userAddedIds.has(item.id) && !deletedIds.has(item.id)
        );
    }, [itemsMap, userAddedIds, deletedIds]);

    // Check if there are any modifications
    const hasModifications = modifiedIds.size > 0 || userAddedIds.size > 0 || deletedIds.size > 0;

    return {
        items,
        modificationState,
        updateItem,
        addItem,
        deleteItem,
        restoreItem,
        resetItem,
        setItems,
        getModifiedItems,
        getUserAddedItems,
        hasModifications,
    };
}

// ============================================================================
// useStageGate Hook
// ============================================================================

/**
 * Hook for managing stage approval gate
 *
 * Provides "Approve & Continue" functionality:
 * - Tracks approval state
 * - Invalidates approval when content changes
 * - Prevents proceeding without approval
 *
 * @param hasContent - Whether the stage has content to approve
 * @param hasModifications - Whether content was modified since last approval
 * @returns Gate state and handlers
 */
export function useStageGate(
    hasContent: boolean,
    hasModifications: boolean
): {
    gateState: GateState;
    approve: () => void;
    resetApproval: () => void;
    canProceed: boolean;
} {
    const [isApproved, setIsApproved] = useState(false);
    const [approvedAt, setApprovedAt] = useState<number | undefined>();
    const lastModificationState = useRef(hasModifications);

    // Check if approval needs to be reset
    const requiresReapproval = useMemo(() => {
        if (!isApproved) return false;
        return hasModifications && !lastModificationState.current;
    }, [isApproved, hasModifications]);

    // Build gate state
    const gateState: GateState = useMemo(() => ({
        isApproved,
        approvedAt,
        requiresReapproval,
    }), [isApproved, approvedAt, requiresReapproval]);

    // Approve the current content
    const approve = useCallback(() => {
        setIsApproved(true);
        setApprovedAt(Date.now());
        lastModificationState.current = hasModifications;
    }, [hasModifications]);

    // Reset approval (e.g., after regeneration)
    const resetApproval = useCallback(() => {
        setIsApproved(false);
        setApprovedAt(undefined);
        lastModificationState.current = false;
    }, []);

    // Can proceed only if content exists and is approved
    const canProceed = hasContent && isApproved && !requiresReapproval;

    return {
        gateState,
        approve,
        resetApproval,
        canProceed,
    };
}

// ============================================================================
// useRegenerateHandler Hook
// ============================================================================

/**
 * Hook for handling stage regeneration
 *
 * Features:
 * - Preserves user modifications during regeneration
 * - Tracks regeneration state
 * - Provides callback for regeneration completion
 *
 * @param onRegenerate - Callback to trigger regeneration
 * @param options - Regeneration options
 * @returns Regeneration handlers and state
 */
export function useRegenerateHandler<T extends TrackableItem>(
    onRegenerate: () => Promise<T[]>,
    options: Partial<RegenerateOptions> = {}
): {
    regenerate: (modificationState: ModificationState<T>) => Promise<T[]>;
    isRegenerating: boolean;
    error: string | null;
} {
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mergedOptions: RegenerateOptions = {
        preserveModified: true,
        preserveUserAdded: true,
        clearDeleted: true,
        ...options,
    };

    const regenerate = useCallback(async (modificationState: ModificationState<T>): Promise<T[]> => {
        setIsRegenerating(true);
        setError(null);

        try {
            // Call the regeneration function
            const newItems = await onRegenerate();

            // Create a map for quick lookup
            const newItemsMap = new Map(newItems.map(item => [item.id, item]));
            const result: T[] = [];

            // Add all new items
            newItems.forEach(item => {
                // Check if this item was modified by the user
                if (mergedOptions.preserveModified) {
                    const existing = modificationState.items.get(item.id);
                    if (existing?.isModified && !existing.isDeleted) {
                        // Keep user's modified version
                        result.push(existing.current);
                        return;
                    }
                }

                // Check if this item was deleted
                if (modificationState.deletedIds.has(item.id)) {
                    if (!mergedOptions.clearDeleted) {
                        return; // Skip deleted items
                    }
                }

                result.push(item);
            });

            // Add user-added items
            if (mergedOptions.preserveUserAdded) {
                modificationState.userAddedIds.forEach(id => {
                    const item = modificationState.items.get(id);
                    if (item && !item.isDeleted && !newItemsMap.has(id)) {
                        result.push(item.current);
                    }
                });
            }

            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Regeneration failed';
            setError(message);
            throw err;
        } finally {
            setIsRegenerating(false);
        }
    }, [onRegenerate, mergedOptions]);

    return {
        regenerate,
        isRegenerating,
        error,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for new user-added items
 */
export function generateItemId(prefix: string = 'user'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if an item was modified from its original state
 */
export function isItemModified<T extends TrackableItem>(
    original: T,
    current: T,
    excludeFields: string[] = ['id']
): boolean {
    const originalCopy = { ...original };
    const currentCopy = { ...current };

    excludeFields.forEach(field => {
        delete (originalCopy as Record<string, unknown>)[field];
        delete (currentCopy as Record<string, unknown>)[field];
    });

    return JSON.stringify(originalCopy) !== JSON.stringify(currentCopy);
}

/**
 * Create a modification summary for display
 */
export function getModificationSummary<T extends TrackableItem>(
    state: ModificationState<T>
): {
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
    totalChanges: number;
    description: string;
} {
    const addedCount = state.userAddedIds.size;
    const modifiedCount = state.modifiedIds.size;
    const deletedCount = state.deletedIds.size;
    const totalChanges = addedCount + modifiedCount + deletedCount;

    const parts: string[] = [];
    if (addedCount > 0) parts.push(`${addedCount} added`);
    if (modifiedCount > 0) parts.push(`${modifiedCount} modified`);
    if (deletedCount > 0) parts.push(`${deletedCount} deleted`);

    return {
        addedCount,
        modifiedCount,
        deletedCount,
        totalChanges,
        description: parts.length > 0 ? parts.join(', ') : 'No changes',
    };
}
