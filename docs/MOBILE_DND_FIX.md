# Mobile Drag-and-Drop Touch Fix

## Issue
The product reorder feature in the Admin panel was non-responsive on mobile devices. When users attempted to drag products to reorder them, the screen would scroll up and down instead of moving the product item.

## Root Cause
The `PointerSensor` from `@dnd-kit/core` was configured without any activation constraints. This caused the sensor to immediately capture all pointer events, including touch gestures meant for scrolling on mobile devices.

## Solution
Added an `activationConstraint` with a `distance` threshold of 8 pixels to the `PointerSensor` configuration in `src/pages/Admin.tsx`.

### Code Change
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

## How It Works
The `distance: 8` constraint means:
- The drag operation only activates after the pointer has moved at least 8 pixels from the initial touch point
- Vertical scroll gestures (which naturally move more than 8 pixels quickly) are recognized as scrolling
- Intentional drag gestures (horizontal or controlled movement) activate the drag operation after the 8-pixel threshold
- Desktop mouse drag-and-drop behavior remains unchanged and natural

## Benefits
1. **Mobile scrolling works naturally** - Users can scroll through the product list without accidentally triggering drag
2. **Drag still works on mobile** - Users can still reorder items by pressing and moving with intention
3. **No desktop impact** - Mouse-based dragging on desktop continues to work as expected
4. **Minimal change** - Single configuration change following @dnd-kit best practices

## References
- [@dnd-kit/core PointerSensor documentation](https://docs.dndkit.com/api-documentation/sensors/pointer)
- [@dnd-kit activation constraints](https://docs.dndkit.com/api-documentation/sensors#activation-constraints)

## Testing
To verify this fix:
1. Open the Admin panel on a mobile device or mobile viewport
2. Enter "Reorder Products" mode
3. Try scrolling the product list - it should scroll normally
4. Press and hold on a grip handle, then move to reorder - drag should activate after ~8px of movement
