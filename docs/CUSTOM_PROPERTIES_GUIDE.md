# Custom Product Properties - Feature Guide

## Overview

The Custom Product Properties feature allows administrators to add configurable fields to products that customers can fill in when purchasing. This enables product customization without requiring code changes.

## Supported Property Types

### 1. Dropdown
Provides a list of predefined options for customers to choose from.

**Use Cases:**
- Size selection (Small, Medium, Large)
- Color options (Red, Blue, Green)
- Material choices (Cotton, Polyester, Wool)

**Configuration:**
- Label: Display name (e.g., "Size")
- Options: Comma-separated values
- Required: Yes/No
- Description: Optional help text

### 2. Text Input
Single-line text field for short custom text.

**Use Cases:**
- Custom name/message
- Gift message
- Personalization text

**Configuration:**
- Label: Display name
- Placeholder: Hint text
- Max Length: Character limit (optional)
- Required: Yes/No
- Description: Optional help text

### 3. Text Area
Multi-line text field for longer custom text.

**Use Cases:**
- Special instructions
- Detailed customization requests
- Gift notes

**Configuration:**
- Label: Display name
- Placeholder: Hint text
- Rows: Number of visible lines
- Max Length: Character limit (optional)
- Required: Yes/No
- Description: Optional help text

### 4. Number Input
Numeric input with optional constraints.

**Use Cases:**
- Quantity multiplier
- Dimensions (width, height)
- Age/year selection

**Configuration:**
- Label: Display name
- Min: Minimum value (optional)
- Max: Maximum value (optional)
- Step: Increment value (optional)
- Required: Yes/No
- Description: Optional help text

## Admin Usage

### Creating Products with Custom Properties

1. Navigate to Admin panel
2. Click "Add Product" or edit existing product
3. Scroll to "Custom Properties" section
4. Click "Add Property"
5. Configure the property:
   - Enter a label (what the customer sees)
   - Select property type
   - Configure type-specific options
   - Add description if needed
   - Mark as required if mandatory
6. Add more properties as needed
7. Save the product

### Managing Custom Properties

- **Reorder**: Use the grip handle (⋮) to drag properties
- **Edit**: Click on any field to modify
- **Remove**: Click the trash icon
- **Required**: Toggle checkbox to make field mandatory

## Customer Experience

### Shopping Flow

1. **Product Card**:
   - Products with custom properties show a "Customizable" badge
   - "Customize" button instead of direct "Add to Bag"

2. **Customization Modal**:
   - Opens when clicking "Customize"
   - Shows all custom property fields
   - Required fields marked with *
   - Validates input before adding to cart

3. **Cart**:
   - Shows custom selections under product name
   - Different selections = separate cart items
   - Full quantity controls maintained

4. **Checkout**:
   - Custom selections visible in order summary
   - Included in order confirmation

## Technical Details

### Data Structure

Custom properties are stored in JSONB format:

```typescript
{
  "properties": [
    {
      "id": "prop_1234567890",
      "label": "Size",
      "type": "dropdown",
      "required": true,
      "options": ["Small", "Medium", "Large"],
      "description": "Select your preferred size"
    }
  ]
}
```

### Cart Storage

Customer selections are stored with cart items:

```typescript
{
  "product": { ... },
  "quantity": 1,
  "customSelections": [
    {
      "propertyId": "prop_1234567890",
      "value": "Medium"
    }
  ]
}
```

### Database Schema

- **Table**: `woolwitch.products`
- **Column**: `custom_properties` (JSONB, nullable)
- **Index**: GIN index for efficient querying

### API Layer

- `create_product`: Accepts `p_custom_properties` parameter
- `update_product`: Accepts `p_custom_properties` parameter
- All operations follow existing API layer pattern

## Best Practices

### Property Design

1. **Keep labels clear and concise**: "Size" not "Please select your size"
2. **Use descriptions for clarification**: Explain options or constraints
3. **Limit required fields**: Only make essential fields required
4. **Order logically**: Put most important properties first

### Dropdown Options

1. **Be specific**: "Small (10cm)" vs just "Small"
2. **Reasonable number**: 2-10 options ideal
3. **Sort logically**: Size (S, M, L), not alphabetical

### Text Fields

1. **Set max length**: Prevent extremely long input
2. **Use placeholders**: Show example text
3. **Choose type carefully**: Text input for short, textarea for long

### Number Fields

1. **Set min/max when applicable**: Prevent invalid values
2. **Use appropriate step**: 1 for whole numbers, 0.1 for decimals
3. **Consider defaults**: Use property defaultValue if needed

## Examples

### Example 1: T-Shirt with Size and Color

```
Properties:
1. Size (Dropdown, Required)
   - Options: Small, Medium, Large, X-Large
   
2. Color (Dropdown, Required)
   - Options: Black, White, Navy, Red
   
3. Gift Message (Text, Optional)
   - Placeholder: "Happy Birthday!"
   - Max Length: 100
```

### Example 2: Custom Embroidery

```
Properties:
1. Text to Embroider (Text, Required)
   - Placeholder: "Enter name or message"
   - Max Length: 30
   - Description: "Maximum 30 characters"
   
2. Font Style (Dropdown, Required)
   - Options: Script, Block, Cursive
   
3. Thread Color (Dropdown, Required)
   - Options: Gold, Silver, Black, White
```

### Example 3: Made-to-Order Dimensions

```
Properties:
1. Width (Number, Required)
   - Min: 10
   - Max: 100
   - Step: 1
   - Description: "Width in centimeters (10-100)"
   
2. Height (Number, Required)
   - Min: 10
   - Max: 100
   - Step: 1
   - Description: "Height in centimeters (10-100)"
   
3. Special Instructions (Textarea, Optional)
   - Placeholder: "Any additional requirements..."
   - Rows: 3
```

## Troubleshooting

### Customer can't add to cart
- Check all required fields are filled
- Verify dropdown selections are made
- Ensure numeric values are within min/max range

### Properties not saving
- Verify admin permissions
- Check browser console for errors
- Ensure all property labels are filled

### Custom selections not showing in cart
- Clear browser cache/localStorage
- Check if properties were saved to product
- Verify customSelections array structure

## Future Enhancements

Potential improvements:
- Date/time picker property type
- File upload property type (for custom images)
- Conditional properties (show/hide based on other selections)
- Property validation rules (regex patterns)
- Property dependencies (price adjustments per selection)
- Multi-select dropdown
- Color picker property type

## Support

For technical issues or feature requests, please refer to the project documentation or contact the development team.
