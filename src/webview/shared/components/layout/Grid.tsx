import React, { forwardRef, HTMLAttributes } from 'react';
import { spacing, SpacingToken } from '../../theme';

/**
 * Grid component props
 */
export interface GridProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Number of columns
     * @default 12
     */
    columns?: number | { sm?: number; md?: number; lg?: number };

    /**
     * Gap between items using spacing scale
     * @default 'md'
     */
    gap?: SpacingToken;

    /**
     * Row gap (if different from column gap)
     */
    rowGap?: SpacingToken;

    /**
     * Custom CSS class name
     */
    className?: string;

    /**
     * Child elements
     */
    children?: React.ReactNode;
}

/**
 * Grid component for responsive layouts.
 *
 * @example
 * ```tsx
 * <Grid columns={3} gap="lg">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * ```
 *
 * **Validates: Requirements 3.1, 3.4**
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
    ({ columns = 12, gap = 'md', rowGap, className = '', style, children, ...props }, ref) => {
        const columnCount = typeof columns === 'number' ? columns : columns.md || 12;

        const gridStyle: React.CSSProperties = {
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            gap: spacing[gap],
            rowGap: rowGap ? spacing[rowGap] : undefined,
            ...style,
        };

        return (
            <div ref={ref} className={className} style={gridStyle} {...props}>
                {children}
            </div>
        );
    }
);

Grid.displayName = 'Grid';

/**
 * GridItem component props
 */
export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Number of columns to span
     * @default 1
     */
    span?: number;

    /**
     * Column start position
     */
    start?: number;

    /**
     * Row span
     */
    rowSpan?: number;

    children?: React.ReactNode;
}

/**
 * Grid item for controlling span within a Grid.
 */
export const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
    ({ span = 1, start, rowSpan, className = '', style, children, ...props }, ref) => {
        const itemStyle: React.CSSProperties = {
            gridColumn: start ? `${start} / span ${span}` : `span ${span}`,
            gridRow: rowSpan ? `span ${rowSpan}` : undefined,
            ...style,
        };

        return (
            <div ref={ref} className={className} style={itemStyle} {...props}>
                {children}
            </div>
        );
    }
);

GridItem.displayName = 'GridItem';

export default Grid;
