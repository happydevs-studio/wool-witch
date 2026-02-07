# Mobile Drag-and-Drop Touch Fix

## Issue
The product reorder feature in the Admin panel was non-responsive on mobile devices. When users attempted to drag products to reorder them, the screen would scroll up and down instead of moving the product item. Even with the initial `PointerSensor` fix, some mobile devices still couldn't reliably trigger drag operations.

## Root Cause
The `PointerSensor` from `@dnd-kit/core` doesn't consistently handle touch events across all mobile devices and browsers. While it works for mouse events, touch-specific events require the `TouchSensor` for proper handling on mobile devices.

## Solution
Added both `PointerSensor` and `TouchSensor` to the sensors configuration in `src/pages/Admin.tsx`:
- `PointerSensor` with `distance` constraint for desktop mouse interactions
- `TouchSensor` with `delay` and `tolerance` constraints for mobile touch interactions

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

**Final Fix** (added TouchSensor for mobile):
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

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

## Benefits
1. **Mobile touch works reliably** - TouchSensor handles native touch events properly across all mobile devices
2. **Natural scrolling** - Quick swipes scroll the page without triggering drag
3. **Intentional dragging** - Press-and-hold gestures clearly indicate intent to drag
4. **No desktop impact** - Mouse-based dragging on desktop continues to work as expected via PointerSensor
5. **Cross-browser compatibility** - Dedicated sensors for touch and pointer events ensure consistent behavior
6. **Minimal change** - Configuration change following @dnd-kit best practices

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
