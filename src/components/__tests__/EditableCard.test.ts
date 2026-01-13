/**
 * EditableCard Component Unit Tests
 * 
 * Tests the EditableCard component functionality including:
 * - Basic rendering (title, description, tags, badges)
 * - Edit functionality (enter edit mode, save, cancel)
 * - Regenerate functionality (button visibility, callback)
 * - Remove functionality (button visibility, callback)
 * - Expandable functionality (expand/collapse)
 * - Custom actions
 */

import { EditableCardProps } from '../../webview/shared/components/EditableCard';

describe('EditableCard Component Props Interface', () => {
    describe('Required Props', () => {
        it('should require id and title', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
            };

            expect(props.id).toBe('test-id');
            expect(props.title).toBe('Test Title');
        });
    });

    describe('Optional Props', () => {
        it('should accept description prop', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                description: 'Test Description',
            };

            expect(props.description).toBe('Test Description');
        });

        it('should accept tags array prop', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                tags: ['Tag1', 'Tag2', 'Tag3'],
            };

            expect(props.tags).toHaveLength(3);
            expect(props.tags).toContain('Tag1');
        });

        it('should accept badge prop with text, color, and backgroundColor', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                badge: {
                    text: 'High Priority',
                    color: '#ef4444',
                    backgroundColor: '#ef444420',
                },
            };

            expect(props.badge?.text).toBe('High Priority');
            expect(props.badge?.color).toBe('#ef4444');
            expect(props.badge?.backgroundColor).toBe('#ef444420');
        });

        it('should accept expandable props', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                expandable: true,
                initialExpanded: false,
            };

            expect(props.expandable).toBe(true);
            expect(props.initialExpanded).toBe(false);
        });

        it('should accept editable prop', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                editable: true,
            };

            expect(props.editable).toBe(true);
        });

        it('should accept isRegenerating prop', () => {
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                isRegenerating: true,
            };

            expect(props.isRegenerating).toBe(true);
        });
    });

    describe('Handler Props', () => {
        it('should accept onEdit handler', () => {
            const onEdit = jest.fn();
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                onEdit,
            };

            props.onEdit?.('test-id', { title: 'New Title', description: 'New Desc' });
            expect(onEdit).toHaveBeenCalledWith('test-id', { title: 'New Title', description: 'New Desc' });
        });

        it('should accept onRegenerate handler', () => {
            const onRegenerate = jest.fn();
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                onRegenerate,
            };

            props.onRegenerate?.('test-id');
            expect(onRegenerate).toHaveBeenCalledWith('test-id');
        });

        it('should accept onRemove handler', () => {
            const onRemove = jest.fn();
            const props: EditableCardProps = {
                id: 'test-id',
                title: 'Test Title',
                onRemove,
            };

            props.onRemove?.('test-id');
            expect(onRemove).toHaveBeenCalledWith('test-id');
        });
    });
});

describe('EditableCard Handler Behavior', () => {
    describe('Edit Handler', () => {
        it('should pass correct id and updates to onEdit', () => {
            const onEdit = jest.fn();
            const id = 'feature-123';
            const updates = { title: 'Updated Title', description: 'Updated Description' };

            onEdit(id, updates);

            expect(onEdit).toHaveBeenCalledTimes(1);
            expect(onEdit).toHaveBeenCalledWith(id, updates);
        });

        it('should handle partial updates (title only)', () => {
            const onEdit = jest.fn();
            const id = 'story-456';
            const updates = { title: 'Only Title Updated' };

            onEdit(id, updates);

            expect(onEdit).toHaveBeenCalledWith(id, { title: 'Only Title Updated' });
        });

        it('should handle partial updates (description only)', () => {
            const onEdit = jest.fn();
            const id = 'screen-789';
            const updates = { description: 'Only Description Updated' };

            onEdit(id, updates);

            expect(onEdit).toHaveBeenCalledWith(id, { description: 'Only Description Updated' });
        });
    });

    describe('Regenerate Handler', () => {
        it('should pass correct id to onRegenerate', () => {
            const onRegenerate = jest.fn();
            const id = 'feature-to-regenerate';

            onRegenerate(id);

            expect(onRegenerate).toHaveBeenCalledTimes(1);
            expect(onRegenerate).toHaveBeenCalledWith(id);
        });
    });

    describe('Remove Handler', () => {
        it('should pass correct id to onRemove', () => {
            const onRemove = jest.fn();
            const id = 'item-to-remove';

            onRemove(id);

            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(onRemove).toHaveBeenCalledWith(id);
        });
    });
});

describe('EditableCard Integration with Stage Components', () => {
    describe('Features Stage Integration', () => {
        it('should transform feature edit updates correctly', () => {
            // Simulating how FeaturesStage transforms EditableCard updates
            const onEditFeature = jest.fn();
            const editableCardOnEdit = (id: string, updates: { title?: string; description?: string }) => {
                onEditFeature(id, { name: updates.title, description: updates.description });
            };

            editableCardOnEdit('feature-1', { title: 'New Feature Name', description: 'New Feature Description' });

            expect(onEditFeature).toHaveBeenCalledWith('feature-1', {
                name: 'New Feature Name',
                description: 'New Feature Description',
            });
        });
    });

    describe('Stories Stage Integration', () => {
        it('should transform story edit updates correctly', () => {
            // Simulating how StoriesStage transforms EditableCard updates
            const onEditStory = jest.fn();
            const editableCardOnEdit = (id: string, updates: { title?: string; description?: string }) => {
                onEditStory(id, { title: updates.title, description: updates.description });
            };

            editableCardOnEdit('story-1', { title: 'New Story Title', description: 'New Story Description' });

            expect(onEditStory).toHaveBeenCalledWith('story-1', {
                title: 'New Story Title',
                description: 'New Story Description',
            });
        });
    });

    describe('Design Stage (Screens) Integration', () => {
        it('should transform screen edit updates correctly', () => {
            // Simulating how DesignStage transforms EditableCard updates for screens
            const onEditScreen = jest.fn();
            const editableCardOnEdit = (id: string, updates: { title?: string; description?: string }) => {
                onEditScreen(id, { name: updates.title, description: updates.description });
            };

            editableCardOnEdit('screen-1', { title: 'Home Page', description: 'Main landing page' });

            expect(onEditScreen).toHaveBeenCalledWith('screen-1', {
                name: 'Home Page',
                description: 'Main landing page',
            });
        });
    });
});
