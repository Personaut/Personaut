import React, { forwardRef, HTMLAttributes, createContext, useContext } from 'react';
import { spacing, borderRadius, colors, shadows } from '../../theme';

/**
 * Card variant styles
 */
export type CardVariant = 'default' | 'secondary' | 'bordered' | 'elevated';

/**
 * Card component props
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Visual variant of the card
     * @default 'default'
     */
    variant?: CardVariant;

    /**
     * Padding size for the card content
     * @default 'lg'
     */
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';

    /**
     * Whether the card is interactive (shows hover state)
     * @default false
     */
    interactive?: boolean;

    /**
     * Whether the card is in active/selected state
     * @default false
     */
    active?: boolean;

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
 * Card context for compound components
 */
interface CardContextValue {
    variant: CardVariant;
}

const CardContext = createContext<CardContextValue | undefined>(undefined);

/**
 * Hook to access card context
 */
const useCardContext = () => {
    const context = useContext(CardContext);
    return context || { variant: 'default' };
};

/**
 * Get styles for each card variant
 */
const getVariantStyles = (variant: CardVariant, _interactive: boolean, _active: boolean): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
        borderRadius: borderRadius.xl,
        transition: 'all 200ms ease-out',
    };

    switch (variant) {
        case 'secondary':
            return {
                ...baseStyles,
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border}`,
            };
        case 'bordered':
            return {
                ...baseStyles,
                backgroundColor: 'transparent',
                border: `1px solid ${colors.border}`,
            };
        case 'elevated':
            return {
                ...baseStyles,
                backgroundColor: colors.background.secondary,
                boxShadow: shadows.md,
                border: 'none',
            };
        case 'default':
        default:
            return {
                ...baseStyles,
                backgroundColor: colors.background.secondary,
                border: `1px solid ${colors.border}`,
            };
    }
};

/**
 * Get padding value from size
 */
const getPadding = (size: CardProps['padding']): string => {
    switch (size) {
        case 'none':
            return '0';
        case 'sm':
            return spacing.sm;
        case 'md':
            return spacing.md;
        case 'xl':
            return spacing.xl;
        case 'lg':
        default:
            return spacing.lg;
    }
};

/**
 * Card component for grouping related content.
 *
 * Provides a consistent container with optional header, body, and footer sections.
 * Supports multiple visual variants and interactive states.
 *
 * @example
 * ```tsx
 * // Simple card
 * <Card>
 *   <Card.Body>Card content here</Card.Body>
 * </Card>
 *
 * // Card with header and footer
 * <Card variant="elevated">
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content</Card.Body>
 *   <Card.Footer>Actions</Card.Footer>
 * </Card>
 *
 * // Interactive card
 * <Card interactive onClick={handleClick}>
 *   <Card.Body>Click me</Card.Body>
 * </Card>
 * ```
 *
 * **Validates: Requirements 3.1, 22.1**
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            variant = 'default',
            padding = 'lg',
            interactive = false,
            active = false,
            className = '',
            style,
            children,
            ...props
        },
        ref
    ) => {
        const variantStyles = getVariantStyles(variant, interactive, active);
        const paddingValue = getPadding(padding);

        const cardStyle: React.CSSProperties = {
            ...variantStyles,
            padding: paddingValue,
            cursor: interactive ? 'pointer' : undefined,
            ...(active && {
                borderColor: colors.accent,
                boxShadow: `0 0 0 1px ${colors.accent}`,
            }),
            ...style,
        };

        // Add hover styles via inline data attribute
        const hoverClass = interactive ? 'card-interactive' : '';

        return (
            <CardContext.Provider value={{ variant }}>
                <div
                    ref={ref}
                    className={`${hoverClass} ${className}`.trim()}
                    style={cardStyle}
                    {...props}
                >
                    {children}
                </div>
            </CardContext.Provider>
        );
    }
);

Card.displayName = 'Card';

/**
 * Card.Header component props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Whether to show a bottom border
     * @default true
     */
    bordered?: boolean;

    children?: React.ReactNode;
}

/**
 * Card header section with optional border.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ bordered = true, className = '', style, children, ...props }, ref) => {
        const { variant } = useCardContext();

        const headerStyle: React.CSSProperties = {
            padding: `${spacing.md} ${spacing.lg}`,
            margin: `-${spacing.lg} -${spacing.lg} ${spacing.lg}`,
            borderBottom: bordered ? `1px solid ${colors.border}` : undefined,
            backgroundColor: variant === 'elevated' ? 'transparent' : colors.background.tertiary,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            fontWeight: 600,
            fontSize: '14px',
            ...style,
        };

        return (
            <div ref={ref} className={className} style={headerStyle} {...props}>
                {children}
            </div>
        );
    }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card.Body component props
 */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

/**
 * Card body section for main content.
 */
export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
    ({ className = '', style, children, ...props }, ref) => {
        const bodyStyle: React.CSSProperties = {
            ...style,
        };

        return (
            <div ref={ref} className={className} style={bodyStyle} {...props}>
                {children}
            </div>
        );
    }
);

CardBody.displayName = 'CardBody';

/**
 * Card.Footer component props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Whether to show a top border
     * @default true
     */
    bordered?: boolean;

    children?: React.ReactNode;
}

/**
 * Card footer section with optional border.
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
    ({ bordered = true, className = '', style, children, ...props }, ref) => {
        const footerStyle: React.CSSProperties = {
            padding: `${spacing.md} ${spacing.lg}`,
            margin: `${spacing.lg} -${spacing.lg} -${spacing.lg}`,
            borderTop: bordered ? `1px solid ${colors.border}` : undefined,
            backgroundColor: colors.background.tertiary,
            borderBottomLeftRadius: borderRadius.xl,
            borderBottomRightRadius: borderRadius.xl,
            ...style,
        };

        return (
            <div ref={ref} className={className} style={footerStyle} {...props}>
                {children}
            </div>
        );
    }
);

CardFooter.displayName = 'CardFooter';

// Attach compound components
(Card as any).Header = CardHeader;
(Card as any).Body = CardBody;
(Card as any).Footer = CardFooter;

export default Card;
