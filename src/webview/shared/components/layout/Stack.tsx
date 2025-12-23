import React, { forwardRef, HTMLAttributes } from 'react';
import { spacing, SpacingToken } from '../../theme';

/**
 * Stack component props
 */
export interface StackProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Direction of the stack
     * @default 'vertical'
     */
    direction?: 'vertical' | 'horizontal';

    /**
     * Gap between children using spacing scale
     * @default 'md'
     */
    gap?: SpacingToken;

    /**
     * Alignment of items on the cross axis
     * @default 'stretch'
     */
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

    /**
     * Justification of items on the main axis
     * @default 'start'
     */
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

    /**
     * Whether items should wrap
     * @default false
     */
    wrap?: boolean;

    /**
     * Whether the stack should grow to fill available space
     * @default false
     */
    grow?: boolean;

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
 * Map alignment values to CSS flexbox values
 */
const alignmentMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
    baseline: 'baseline',
} as const;

/**
 * Map justify values to CSS flexbox values
 */
const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
} as const;

/**
 * Stack component for vertical or horizontal layout with consistent spacing.
 *
 * A fundamental layout component that arranges children in a vertical or
 * horizontal stack with configurable gap spacing from the theme scale.
 *
 * @example
 * ```tsx
 * // Vertical stack with medium gap
 * <Stack gap="md">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Stack>
 *
 * // Horizontal stack with items centered
 * <Stack direction="horizontal" gap="lg" align="center">
 *   <Icon />
 *   <Text>Label</Text>
 * </Stack>
 * ```
 *
 * **Validates: Requirements 3.1, 3.4**
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(
    (
        {
            direction = 'vertical',
            gap = 'md',
            align = 'stretch',
            justify = 'start',
            wrap = false,
            grow = false,
            className = '',
            style,
            children,
            ...props
        },
        ref
    ) => {
        const stackStyle: React.CSSProperties = {
            display: 'flex',
            flexDirection: direction === 'vertical' ? 'column' : 'row',
            gap: spacing[gap],
            alignItems: alignmentMap[align],
            justifyContent: justifyMap[justify],
            flexWrap: wrap ? 'wrap' : 'nowrap',
            flexGrow: grow ? 1 : undefined,
            ...style,
        };

        return (
            <div ref={ref} className={className} style={stackStyle} {...props}>
                {children}
            </div>
        );
    }
);

Stack.displayName = 'Stack';

/**
 * Horizontal Stack convenience component.
 * Equivalent to `<Stack direction="horizontal" />`.
 */
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
    (props, ref) => <Stack ref={ref} direction="horizontal" {...props} />
);

HStack.displayName = 'HStack';

/**
 * Vertical Stack convenience component.
 * Equivalent to `<Stack direction="vertical" />`.
 */
export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
    (props, ref) => <Stack ref={ref} direction="vertical" {...props} />
);

VStack.displayName = 'VStack';

export default Stack;
