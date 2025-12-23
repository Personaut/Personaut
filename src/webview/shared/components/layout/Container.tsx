import React, { forwardRef, HTMLAttributes } from 'react';
import { spacing } from '../../theme';

/**
 * Container component props
 */
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Maximum width of the container
     * @default 'lg'
     */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

    /**
     * Whether to center the container horizontally
     * @default true
     */
    centered?: boolean;

    /**
     * Horizontal padding
     * @default 'lg'
     */
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';

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
 * Get max width value
 */
const getMaxWidth = (size: ContainerProps['maxWidth']): string => {
    switch (size) {
        case 'sm':
            return '640px';
        case 'md':
            return '768px';
        case 'xl':
            return '1280px';
        case 'full':
            return '100%';
        case 'lg':
        default:
            return '1024px';
    }
};

/**
 * Container component for constraining content width.
 *
 * @example
 * ```tsx
 * <Container maxWidth="md" padding="lg">
 *   <h1>Page Title</h1>
 *   <p>Content goes here</p>
 * </Container>
 * ```
 *
 * **Validates: Requirements 3.1, 3.4**
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
    (
        { maxWidth = 'lg', centered = true, padding = 'lg', className = '', style, children, ...props },
        ref
    ) => {
        const paddingValue = padding === 'none' ? '0' : spacing[padding];

        const containerStyle: React.CSSProperties = {
            width: '100%',
            maxWidth: getMaxWidth(maxWidth),
            marginLeft: centered ? 'auto' : undefined,
            marginRight: centered ? 'auto' : undefined,
            paddingLeft: paddingValue,
            paddingRight: paddingValue,
            ...style,
        };

        return (
            <div ref={ref} className={className} style={containerStyle} {...props}>
                {children}
            </div>
        );
    }
);

Container.displayName = 'Container';

export default Container;
