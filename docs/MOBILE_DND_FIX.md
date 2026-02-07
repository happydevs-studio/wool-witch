# Mobile Drag-and-Drop Touch Fix

## Issue
The product reorder feature in the Admin panel was non-responsive on mobile devices. When users attempted to drag products to reorder them, the screen would scroll up and down instead of moving the product item. Even with the initial `PointerSensor` fix and `TouchSensor` addition, some mobile devices still allowed page scrolling to interfere with drag operations.

## Root Cause
The `PointerSensor` from `@dnd-kit/core` doesn't consistently handle touch events across all mobile devices and browsers. While it works for mouse events, touch-specific events require the `TouchSensor` for proper handling on mobile devices. Additionally, the default browser touch behavior (scrolling) needed to be explicitly disabled on drag elements using the CSS `touch-action: none` property.

## Solution
1. Added both `PointerSensor` and `TouchSensor` to the sensors configuration in `src/pages/Admin.tsx`:
   - `PointerSensor` with `distance` constraint for desktop mouse interactions
   - `TouchSensor` with `delay` and `tolerance` constraints for mobile touch interactions
2. Added `touchAction: 'none'` to the inline styles of both `SortableProductRow` and `SortableProductCard` components to prevent browser's default touch scrolling behavior during drag operations

### Code Changes

**Initial Fix** (added PointerSensor constraint):
```typescript
// Before
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

// After
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

**Latest Fix** (added `touch-action: none` CSS property):
```typescript
const style = {
  transform: CSS.Transform.toString(transform),
  transition,
  opacity: isDragging ? 0.5 : 1,
  touchAction: 'none', // Prevents default browser scrolling during drag
};
```

Applied to both `SortableProductRow` and `SortableProductCard` components.

## How It Works

### PointerSensor (Desktop)
The `distance: 8` constraint means:
- The drag operation only activates after the pointer has moved at least 8 pixels from the initial touch point
- Desktop mouse drag-and-drop behavior remains unchanged and natural

### TouchSensor (Mobile)
The `delay: 250, tolerance: 5` constraints mean:
- Touch must be held for 250ms before drag activates
- The finger can move up to 5 pixels during the delay period (accommodates natural finger movement)
- Vertical scroll gestures (quick swipes) are recognized as scrolling
- Press-and-hold gestures activate the drag operation after the delay
- Once activated, the drag follows the finger movement smoothly

### touch-action CSS Property
The `touch-action: none` inline style:
- Completely disables browser's default touch behaviors (scrolling, zooming, etc.) on the draggable element
- Ensures that touch gestures on the element are only used for drag-and-drop, not page scrolling
- This is critical for preventing the "page drags up and down" issue on mobile
- Applied to the entire row/card element so the drag is smooth regardless of where the user touches

## Benefits
1. **Mobile touch works reliably** - TouchSensor handles native touch events properly across all mobile devices
2. **No page scrolling during drag** - `touch-action: none` prevents browser from scrolling the page when dragging
3. **Natural scrolling** - Quick swipes scroll the page without triggering drag (when not in reorder mode)
4. **Intentional dragging** - Press-and-hold gestures clearly indicate intent to drag
5. **No desktop impact** - Mouse-based dragging on desktop continues to work as expected via PointerSensor
6. **Cross-browser compatibility** - Dedicated sensors for touch and pointer events ensure consistent behavior
7. **Minimal change** - Configuration and CSS changes following @dnd-kit best practices

## References
- [@dnd-kit/core PointerSensor documentation](https://docs.dndkit.com/api-documentation/sensors/pointer)
- [@dnd-kit/core TouchSensor documentation](https://docs.dndkit.com/api-documentation/sensors/touch)
- [@dnd-kit activation constraints](https://docs.dndkit.com/api-documentation/sensors#activation-constraints)

## Testing
To verify this fix:
1. Open the Admin panel on a mobile device or mobile viewport
2. Enter "Reorder Products" mode
3. Try scrolling the product list with quick swipes - it should scroll normally
4. Press and hold on a grip handle for ~250ms, then move to reorder - drag should activate and follow your finger
5. The dragged item should move smoothly with your touch and drop when released
