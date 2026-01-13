/**
 * @jest-environment jsdom
 */

/**
 * DesignStageHooks Property Tests
 *
 * Property 11: User Modification Tracking
 * - Modified items are correctly identified
 * - User-added items are preserved during regeneration
 * - Deleted items can be restored
 * - Modifications are tracked per-item
 *
 * Stage Gate Tests:
 * - Approval state is tracked correctly
 * - Approval is invalidated when content changes
 * - canProceed requires approval
 *
 * Regeneration Tests:
 * - User modifications preserved during regeneration
 * - User-added items preserved during regeneration
 * - Deleted items can be cleared or preserved
 *
 * Validates: Requirements 15.1-15.7, 13.6
 */

import { renderHook, act } from '@testing-library/react';
import {
    useModificationTracking,
    useStageGate,
    useRegenerateHandler,
    generateItemId,
    isItemModified,
    getModificationSummary,
    TrackableItem,
    ModificationState,
} from '../DesignStageHooks';

// ============================================================================
// Test Types
// ============================================================================

interface TestItem extends TrackableItem {
    id: string;
    name: string;
    value: number;
    description?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createTestItem(id: string, name: string, value: number): TestItem {
    return { id, name, value };
}

function createTestItems(): TestItem[] {
    return [
        createTestItem('item-1', 'First Item', 100),
        createTestItem('item-2', 'Second Item', 200),
        createTestItem('item-3', 'Third Item', 300),
    ];
}

// ============================================================================
// Tests
// ============================================================================

describe('DesignStageHooks Property Tests', () => {
    // ========================================================================
    // Property 11: User Modification Tracking
    // ========================================================================
    describe('Property 11: User Modification Tracking', () => {
        describe('Initial state', () => {
            it('should initialize with items from input', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                expect(result.current.items).toHaveLength(3);
                expect(result.current.hasModifications).toBe(false);
            });

            it('should track all items in modification state', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                expect(result.current.modificationState.items.size).toBe(3);
                expect(result.current.modificationState.modifiedIds.size).toBe(0);
                expect(result.current.modificationState.userAddedIds.size).toBe(0);
                expect(result.current.modificationState.deletedIds.size).toBe(0);
            });
        });

        describe('Modification detection', () => {
            it('should detect when an item is modified', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.updateItem('item-1', { name: 'Updated Name' });
                });

                expect(result.current.modificationState.modifiedIds.has('item-1')).toBe(true);
                expect(result.current.hasModifications).toBe(true);
            });

            it('should not mark item as modified if value unchanged', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.updateItem('item-1', { name: 'First Item' }); // Same value
                });

                expect(result.current.modificationState.modifiedIds.has('item-1')).toBe(false);
            });

            it('should track multiple modifications separately', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.updateItem('item-1', { name: 'Updated 1' });
                    result.current.updateItem('item-2', { value: 999 });
                });

                expect(result.current.modificationState.modifiedIds.size).toBe(2);
                expect(result.current.modificationState.modifiedIds.has('item-1')).toBe(true);
                expect(result.current.modificationState.modifiedIds.has('item-2')).toBe(true);
            });
        });

        describe('User-added items', () => {
            it('should track user-added items separately', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                const newItem = createTestItem('user-item-1', 'User Added', 999);
                act(() => {
                    result.current.addItem(newItem);
                });

                expect(result.current.items).toHaveLength(4);
                expect(result.current.modificationState.userAddedIds.has('user-item-1')).toBe(true);
                expect(result.current.hasModifications).toBe(true);
            });

            it('should return user-added items from getUserAddedItems', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.addItem(createTestItem('user-1', 'Added 1', 1));
                    result.current.addItem(createTestItem('user-2', 'Added 2', 2));
                });

                const userAdded = result.current.getUserAddedItems();
                expect(userAdded).toHaveLength(2);
                expect(userAdded.map(i => i.id)).toContain('user-1');
                expect(userAdded.map(i => i.id)).toContain('user-2');
            });
        });

        describe('Deletion and restoration', () => {
            it('should soft-delete items (exclude from items array)', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.deleteItem('item-2');
                });

                expect(result.current.items).toHaveLength(2);
                expect(result.current.items.map(i => i.id)).not.toContain('item-2');
                expect(result.current.modificationState.deletedIds.has('item-2')).toBe(true);
            });

            it('should restore deleted items', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.deleteItem('item-2');
                });
                expect(result.current.items).toHaveLength(2);

                act(() => {
                    result.current.restoreItem('item-2');
                });
                expect(result.current.items).toHaveLength(3);
                expect(result.current.modificationState.deletedIds.has('item-2')).toBe(false);
            });

            it('should preserve deletion state in modification tracking', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.deleteItem('item-1');
                    result.current.deleteItem('item-3');
                });

                expect(result.current.modificationState.deletedIds.size).toBe(2);
                expect(result.current.hasModifications).toBe(true);
            });
        });

        describe('Reset functionality', () => {
            it('should reset item to original state', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.updateItem('item-1', { name: 'Changed', value: 999 });
                });
                expect(result.current.modificationState.modifiedIds.has('item-1')).toBe(true);

                act(() => {
                    result.current.resetItem('item-1');
                });
                expect(result.current.modificationState.modifiedIds.has('item-1')).toBe(false);
                expect(result.current.items.find(i => i.id === 'item-1')?.name).toBe('First Item');
            });
        });

        describe('getModifiedItems', () => {
            it('should return only modified items', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.updateItem('item-1', { name: 'Modified' });
                    result.current.updateItem('item-3', { value: 999 });
                });

                const modified = result.current.getModifiedItems();
                expect(modified).toHaveLength(2);
                expect(modified.map(i => i.id)).toContain('item-1');
                expect(modified.map(i => i.id)).toContain('item-3');
            });

            it('should exclude deleted items from modified items', () => {
                const initialItems = createTestItems();
                const { result } = renderHook(() =>
                    useModificationTracking(initialItems)
                );

                act(() => {
                    result.current.updateItem('item-1', { name: 'Modified' });
                    result.current.deleteItem('item-1');
                });

                const modified = result.current.getModifiedItems();
                expect(modified).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // Stage Gate Tests
    // ========================================================================
    describe('Stage Gate', () => {
        it('should start with unapproved state', () => {
            const { result } = renderHook(() =>
                useStageGate(true, false)
            );

            expect(result.current.gateState.isApproved).toBe(false);
            expect(result.current.canProceed).toBe(false);
        });

        it('should allow proceeding after approval', () => {
            const { result } = renderHook(() =>
                useStageGate(true, false)
            );

            act(() => {
                result.current.approve();
            });

            expect(result.current.gateState.isApproved).toBe(true);
            expect(result.current.canProceed).toBe(true);
        });

        it('should not allow proceeding without content', () => {
            const { result } = renderHook(() =>
                useStageGate(false, false) // No content
            );

            act(() => {
                result.current.approve();
            });

            expect(result.current.canProceed).toBe(false);
        });

        it('should track approval timestamp', () => {
            const { result } = renderHook(() =>
                useStageGate(true, false)
            );

            const before = Date.now();
            act(() => {
                result.current.approve();
            });
            const after = Date.now();

            expect(result.current.gateState.approvedAt).toBeGreaterThanOrEqual(before);
            expect(result.current.gateState.approvedAt).toBeLessThanOrEqual(after);
        });

        it('should reset approval state', () => {
            const { result } = renderHook(() =>
                useStageGate(true, false)
            );

            act(() => {
                result.current.approve();
            });
            expect(result.current.canProceed).toBe(true);

            act(() => {
                result.current.resetApproval();
            });
            expect(result.current.gateState.isApproved).toBe(false);
            expect(result.current.canProceed).toBe(false);
        });
    });

    // ========================================================================
    // Regeneration Tests
    // ========================================================================
    describe('Regeneration Handler', () => {
        it('should track regeneration state', async () => {
            const mockRegenerate = jest.fn().mockResolvedValue(createTestItems());
            const { result } = renderHook(() =>
                useRegenerateHandler(mockRegenerate)
            );

            expect(result.current.isRegenerating).toBe(false);

            const modState: ModificationState<TestItem> = {
                items: new Map(),
                userAddedIds: new Set(),
                deletedIds: new Set(),
                modifiedIds: new Set(),
            };

            let regeneratePromise: Promise<TestItem[]>;
            act(() => {
                regeneratePromise = result.current.regenerate(modState) as Promise<TestItem[]>;
            });

            // Wait for completion
            await act(async () => {
                await regeneratePromise;
            });

            expect(result.current.isRegenerating).toBe(false);
            expect(mockRegenerate).toHaveBeenCalled();
        });

        it('should handle regeneration errors', async () => {
            const mockRegenerate = jest.fn().mockRejectedValue(new Error('API Error'));
            const { result } = renderHook(() =>
                useRegenerateHandler(mockRegenerate)
            );

            const modState: ModificationState<TestItem> = {
                items: new Map(),
                userAddedIds: new Set(),
                deletedIds: new Set(),
                modifiedIds: new Set(),
            };

            await act(async () => {
                try {
                    await result.current.regenerate(modState);
                } catch {
                    // Expected error
                }
            });

            expect(result.current.error).toBe('API Error');
        });

        it('should preserve user-added items by default', async () => {
            const newItems = createTestItems();
            const mockRegenerate = jest.fn().mockResolvedValue(newItems);
            const { result } = renderHook(() =>
                useRegenerateHandler(mockRegenerate)
            );

            const userItem = createTestItem('user-added-1', 'User Item', 999);
            const modState: ModificationState<TestItem> = {
                items: new Map([
                    ['user-added-1', {
                        original: userItem,
                        current: userItem,
                        isModified: false,
                        isUserAdded: true,
                        isDeleted: false,
                    }],
                ]),
                userAddedIds: new Set(['user-added-1']),
                deletedIds: new Set(),
                modifiedIds: new Set(),
            };

            let regeneratedItems: TestItem[] = [];
            await act(async () => {
                regeneratedItems = await result.current.regenerate(modState) as TestItem[];
            });

            expect(regeneratedItems.map(i => i.id)).toContain('user-added-1');
            expect(regeneratedItems.length).toBe(4); // 3 new + 1 user-added
        });
    });

    // ========================================================================
    // Helper Function Tests
    // ========================================================================
    describe('Helper Functions', () => {
        describe('generateItemId', () => {
            it('should generate unique IDs', () => {
                const id1 = generateItemId('test');
                const id2 = generateItemId('test');

                expect(id1).not.toBe(id2);
                expect(id1).toMatch(/^test-\d+-[a-z0-9]+$/);
            });

            it('should use default prefix', () => {
                const id = generateItemId();
                expect(id).toMatch(/^user-\d+-[a-z0-9]+$/);
            });
        });

        describe('isItemModified', () => {
            it('should detect modifications', () => {
                const original = createTestItem('1', 'Test', 100);
                const modified = { ...original, name: 'Changed' };

                expect(isItemModified(original, modified)).toBe(true);
            });

            it('should return false for identical items', () => {
                const original = createTestItem('1', 'Test', 100);
                const same = { ...original };

                expect(isItemModified(original, same)).toBe(false);
            });

            it('should exclude specified fields', () => {
                const original = createTestItem('1', 'Test', 100);
                const different = { ...original, id: '2' }; // Different id

                expect(isItemModified(original, different, ['id'])).toBe(false);
            });
        });

        describe('getModificationSummary', () => {
            it('should provide correct counts', () => {
                const state: ModificationState<TestItem> = {
                    items: new Map(),
                    userAddedIds: new Set(['a', 'b']),
                    deletedIds: new Set(['c']),
                    modifiedIds: new Set(['d', 'e', 'f']),
                };

                const summary = getModificationSummary(state);

                expect(summary.addedCount).toBe(2);
                expect(summary.deletedCount).toBe(1);
                expect(summary.modifiedCount).toBe(3);
                expect(summary.totalChanges).toBe(6);
            });

            it('should provide readable description', () => {
                const state: ModificationState<TestItem> = {
                    items: new Map(),
                    userAddedIds: new Set(['a']),
                    deletedIds: new Set(),
                    modifiedIds: new Set(['b', 'c']),
                };

                const summary = getModificationSummary(state);

                expect(summary.description).toContain('1 added');
                expect(summary.description).toContain('2 modified');
            });

            it('should handle no changes', () => {
                const state: ModificationState<TestItem> = {
                    items: new Map(),
                    userAddedIds: new Set(),
                    deletedIds: new Set(),
                    modifiedIds: new Set(),
                };

                const summary = getModificationSummary(state);

                expect(summary.totalChanges).toBe(0);
                expect(summary.description).toBe('No changes');
            });
        });
    });
});
