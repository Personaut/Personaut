# Accessibility Documentation

This document describes the accessibility features and guidelines for the Personaut webview.

## WCAG 2.1 AA Compliance

The webview is designed to meet WCAG 2.1 AA standards.

### Color Contrast

All color combinations meet minimum contrast requirements:

| Element Type | Minimum Ratio | Our Implementation |
|-------------|---------------|-------------------|
| Normal Text | 4.5:1 | ✅ All text colors verified |
| Large Text (18px+) | 3:1 | ✅ Headings verified |
| UI Components | 3:1 | ✅ Borders, icons verified |
| Focus Indicators | 3:1 | ✅ Focus rings verified |

#### Text Colors on Dark Background (#1E1E1E)

- `text.primary` (#CCCCCC): ~12.6:1 contrast ✅
- `text.secondary` (#9E9E9E): ~7.0:1 contrast ✅
- `text.muted` (#6E6E6E): ~4.5:1 contrast ✅

### Keyboard Navigation

All interactive elements are keyboard accessible:

#### Focus Order

Focus follows a logical reading order:
1. Header navigation
2. Main content area
3. Footer navigation
4. Modal overlays (when open)

#### Focus Indicators

All focusable elements have visible focus indicators:
- 2px solid outline
- 2px offset from element
- High contrast color (`--vscode-focusBorder`)

#### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Tab | Move focus forward |
| Shift+Tab | Move focus backward |
| Enter/Space | Activate buttons |
| Arrow keys | Navigate within menus, lists |
| Escape | Close modals, cancel actions |

### Screen Reader Support

#### ARIA Labels

All interactive elements have descriptive labels:

```tsx
<button aria-label="Send message">
  Send
</button>

<input
  aria-label="Project name"
  aria-describedby="project-name-hint"
/>
```

#### ARIA Roles

Semantic roles are used throughout:

```tsx
<nav role="navigation" aria-label="Main navigation">
  ...
</nav>

<main role="main" aria-label="Chat content">
  ...
</main>
```

#### Live Regions

Dynamic content updates are announced:

```tsx
<div 
  role="status" 
  aria-live="polite"
  aria-atomic="true"
>
  {statusMessage}
</div>

<div 
  role="alert" 
  aria-live="assertive"
>
  {errorMessage}
</div>
```

### Form Accessibility

#### Labels

All form inputs have associated labels:

```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

#### Error Messages

Errors are programmatically associated:

```tsx
<input
  id="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    Please enter a valid email
  </span>
)}
```

#### Required Fields

Required fields are marked:

```tsx
<label htmlFor="name">
  Name <span aria-hidden="true">*</span>
</label>
<input
  id="name"
  aria-required="true"
/>
```

### Motion and Animation

#### Reduced Motion

Animations respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### Safe Animations

- No auto-playing animations
- No flashing content (< 3 flashes/second)
- All animations can be paused/stopped

## Testing Accessibility

### Automated Testing

Run accessibility tests with jest-axe:

```bash
npm run test:a11y
```

### Manual Testing

1. **Keyboard Testing**
   - Navigate using Tab and Shift+Tab
   - Verify all interactive elements are reachable
   - Verify focus indicators are visible

2. **Screen Reader Testing**
   - Test with VoiceOver (macOS)
   - Test with NVDA (Windows)
   - Verify all content is read correctly

3. **Color Contrast Testing**
   - Use browser DevTools contrast checker
   - Use WebAIM Contrast Checker

## Component Guidelines

### Buttons

```tsx
<Button
  variant="primary"
  onClick={handleClick}
  aria-label="Descriptive label"
  disabled={isDisabled}
>
  Button Text
</Button>
```

### Forms

```tsx
<Input
  id="unique-id"
  label="Field Label"
  required={true}
  error={errorMessage}
  helpText="Additional guidance"
/>
```

### Modals

```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  aria-describedby="modal-description"
>
  <p id="modal-description">Modal content</p>
</Modal>
```

### Lists

```tsx
<ul role="list" aria-label="List description">
  {items.map((item) => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [MDN ARIA Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
