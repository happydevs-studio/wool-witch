import type { 
  CustomProperty, 
  CustomPropertyDropdown, 
  CustomPropertyText, 
  CustomPropertyTextarea,
  CustomPropertyNumber,
  CustomPropertySelection 
} from '../types/database';

interface CustomPropertiesInputProps {
  properties: CustomProperty[];
  values: CustomPropertySelection[];
  onChange: (values: CustomPropertySelection[]) => void;
  /** Base product price used to show the effective price when an option is selected */
  basePrice?: number;
}

export function CustomPropertiesInput({ properties, values, onChange, basePrice }: CustomPropertiesInputProps) {
  if (properties.length === 0) {
    return null;
  }

  const handleValueChange = (propertyId: string, value: string | number) => {
    const newValues = [...values];
    const existingIndex = newValues.findIndex(v => v.propertyId === propertyId);
    
    if (existingIndex >= 0) {
      newValues[existingIndex] = { propertyId, value };
    } else {
      newValues.push({ propertyId, value });
    }
    
    onChange(newValues);
  };

  const getValue = (propertyId: string): string | number => {
    const selection = values.find(v => v.propertyId === propertyId);
    return selection?.value ?? '';
  };

  /** Returns the effective price based on current selections, or undefined if no price override applies */
  const getEffectiveDisplayPrice = (): number | undefined => {
    for (const property of properties) {
      if (property.type !== 'dropdown') continue;
      const dropdown = property as CustomPropertyDropdown;
      if (!dropdown.optionPrices) continue;
      const selectedValue = getValue(property.id) as string;
      if (selectedValue && dropdown.optionPrices[selectedValue] !== undefined) {
        return dropdown.optionPrices[selectedValue];
      }
    }
    return undefined;
  };

  const effectivePrice = getEffectiveDisplayPrice();

  const renderProperty = (property: CustomProperty) => {
    const value = getValue(property.id);

    switch (property.type) {
      case 'dropdown': {
        const dropdownProperty = property as CustomPropertyDropdown;
        const hasPrices = dropdownProperty.optionPrices && Object.keys(dropdownProperty.optionPrices).length > 0;
        return (
          <div key={property.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {property.label}
              {property.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {property.description && (
              <p className="text-xs text-gray-500">{property.description}</p>
            )}
            <select
              value={value as string}
              onChange={(e) => handleValueChange(property.id, e.target.value)}
              required={property.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">Select {property.label}</option>
              {dropdownProperty.options.map((option) => {
                const optionPrice = dropdownProperty.optionPrices?.[option];
                return (
                  <option key={option} value={option}>
                    {hasPrices && optionPrice !== undefined
                      ? `${option} — £${optionPrice.toFixed(2)}`
                      : option}
                  </option>
                );
              })}
            </select>
          </div>
        );
      }

      case 'text': {
        const textProperty = property as CustomPropertyText;
        return (
          <div key={property.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {property.label}
              {property.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {property.description && (
              <p className="text-xs text-gray-500">{property.description}</p>
            )}
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleValueChange(property.id, e.target.value)}
              placeholder={textProperty.placeholder}
              maxLength={textProperty.maxLength}
              required={property.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        );
      }

      case 'textarea': {
        const textareaProperty = property as CustomPropertyTextarea;
        return (
          <div key={property.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {property.label}
              {property.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {property.description && (
              <p className="text-xs text-gray-500">{property.description}</p>
            )}
            <textarea
              value={value as string}
              onChange={(e) => handleValueChange(property.id, e.target.value)}
              placeholder={textareaProperty.placeholder}
              maxLength={textareaProperty.maxLength}
              rows={textareaProperty.rows ?? 3}
              required={property.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        );
      }

      case 'number': {
        const numberProperty = property as CustomPropertyNumber;
        return (
          <div key={property.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {property.label}
              {property.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {property.description && (
              <p className="text-xs text-gray-500">{property.description}</p>
            )}
            <input
              type="number"
              value={value as number}
              onChange={(e) => handleValueChange(property.id, parseFloat(e.target.value) || 0)}
              min={numberProperty.min}
              max={numberProperty.max}
              step={numberProperty.step}
              required={property.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-900">Customize Your Product</h3>
      {properties.map(renderProperty)}
      {basePrice !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-600">Price</span>
          <span className="text-lg font-bold text-gray-900">
            {effectivePrice !== undefined
              ? `£${effectivePrice.toFixed(2)}`
              : `£${basePrice.toFixed(2)}`}
          </span>
        </div>
      )}
    </div>
  );
}
