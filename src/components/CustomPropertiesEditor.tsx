import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { 
  CustomProperty, 
  CustomPropertyType, 
  CustomPropertiesConfig,
  CustomPropertyDropdown,
  CustomPropertyText,
  CustomPropertyNumber
} from '../types/database';

interface CustomPropertiesEditorProps {
  value: CustomPropertiesConfig | null;
  onChange: (config: CustomPropertiesConfig | null) => void;
}

export function CustomPropertiesEditor({ value, onChange }: CustomPropertiesEditorProps) {
  const properties = value?.properties || [];

  const addProperty = () => {
    const newProperty: CustomProperty = {
      id: `prop_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    };

    onChange({
      properties: [...properties, newProperty],
    });
  };

  const removeProperty = (index: number) => {
    const newProperties = properties.filter((_, i) => i !== index);
    onChange(newProperties.length > 0 ? { properties: newProperties } : null);
  };

  const updateProperty = (index: number, updates: Partial<CustomProperty>) => {
    const newProperties = [...properties];
    newProperties[index] = { ...newProperties[index], ...updates } as CustomProperty;
    onChange({ properties: newProperties });
  };

  const updatePropertyType = (index: number, type: CustomPropertyType) => {
    const baseProperty = properties[index];
    let updatedProperty: CustomProperty;

    switch (type) {
      case 'dropdown':
        updatedProperty = {
          id: baseProperty.id,
          label: baseProperty.label,
          type: 'dropdown',
          required: baseProperty.required,
          description: baseProperty.description,
          options: [],
        };
        break;
      case 'text':
        updatedProperty = {
          id: baseProperty.id,
          label: baseProperty.label,
          type: 'text',
          required: baseProperty.required,
          description: baseProperty.description,
        };
        break;
      case 'textarea':
        updatedProperty = {
          id: baseProperty.id,
          label: baseProperty.label,
          type: 'textarea',
          required: baseProperty.required,
          description: baseProperty.description,
        };
        break;
      case 'number':
        updatedProperty = {
          id: baseProperty.id,
          label: baseProperty.label,
          type: 'number',
          required: baseProperty.required,
          description: baseProperty.description,
        };
        break;
    }

    const newProperties = [...properties];
    newProperties[index] = updatedProperty;
    onChange({ properties: newProperties });
  };

  const addDropdownOption = (propertyIndex: number) => {
    const property = properties[propertyIndex];
    if (property.type !== 'dropdown') return;
    const dropdown = property as CustomPropertyDropdown;
    updateProperty(propertyIndex, { options: [...dropdown.options, ''] } as Partial<CustomPropertyDropdown>);
  };

  const updateDropdownOptionLabel = (propertyIndex: number, optionIndex: number, label: string) => {
    const property = properties[propertyIndex];
    if (property.type !== 'dropdown') return;
    const dropdown = property as CustomPropertyDropdown;

    const newOptions = [...dropdown.options];
    const oldLabel = newOptions[optionIndex];
    newOptions[optionIndex] = label;

    const newOptionPrices = dropdown.optionPrices ? { ...dropdown.optionPrices } : {};
    if (oldLabel && oldLabel !== label && newOptionPrices[oldLabel] !== undefined) {
      newOptionPrices[label] = newOptionPrices[oldLabel];
      delete newOptionPrices[oldLabel];
    }

    updateProperty(propertyIndex, {
      options: newOptions,
      optionPrices: Object.keys(newOptionPrices).length > 0 ? newOptionPrices : undefined,
    } as Partial<CustomPropertyDropdown>);
  };

  const updateDropdownOptionPrice = (propertyIndex: number, optionLabel: string, priceStr: string) => {
    const property = properties[propertyIndex];
    if (property.type !== 'dropdown') return;
    const dropdown = property as CustomPropertyDropdown;

    const newOptionPrices = dropdown.optionPrices ? { ...dropdown.optionPrices } : {};
    if (priceStr === '' || priceStr === undefined) {
      delete newOptionPrices[optionLabel];
    } else {
      const price = parseFloat(priceStr);
      if (!isNaN(price)) {
        newOptionPrices[optionLabel] = price;
      }
    }

    updateProperty(propertyIndex, {
      optionPrices: Object.keys(newOptionPrices).length > 0 ? newOptionPrices : undefined,
    } as Partial<CustomPropertyDropdown>);
  };

  const removeDropdownOption = (propertyIndex: number, optionIndex: number) => {
    const property = properties[propertyIndex];
    if (property.type !== 'dropdown') return;
    const dropdown = property as CustomPropertyDropdown;

    const removedLabel = dropdown.options[optionIndex];
    const newOptions = dropdown.options.filter((_, i) => i !== optionIndex);
    const newOptionPrices = dropdown.optionPrices ? { ...dropdown.optionPrices } : {};
    if (removedLabel) delete newOptionPrices[removedLabel];

    updateProperty(propertyIndex, {
      options: newOptions,
      optionPrices: Object.keys(newOptionPrices).length > 0 ? newOptionPrices : undefined,
    } as Partial<CustomPropertyDropdown>);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Custom Properties
          <span className="text-gray-500 text-xs ml-2">(optional)</span>
        </label>
        <button
          type="button"
          onClick={addProperty}
          className="inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Property
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="text-sm text-gray-500 italic p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
          No custom properties defined. Add properties to allow customers to customize this product.
        </div>
      ) : (
        <div className="space-y-4">
          {properties.map((property, index) => (
            <div
              key={property.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={property.label}
                        onChange={(e) => updateProperty(index, { label: e.target.value })}
                        placeholder="Property Label (e.g., Size)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <select
                        value={property.type}
                        onChange={(e) => updatePropertyType(index, e.target.value as CustomPropertyType)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="text">Text Input</option>
                        <option value="textarea">Text Area</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="number">Number Input</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeProperty(index)}
                  className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Remove property"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 pl-6">
                <div>
                  <input
                    type="text"
                    value={property.description || ''}
                    onChange={(e) => updateProperty(index, { description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {property.type === 'dropdown' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Options</span>
                      <button
                        type="button"
                        onClick={() => addDropdownOption(index)}
                        className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </button>
                    </div>
                    {(property as CustomPropertyDropdown).options.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No options yet. Click "Add Option" to add one.</p>
                    ) : (
                      <div className="space-y-2">
                        {(property as CustomPropertyDropdown).options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => updateDropdownOptionLabel(index, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1} label`}
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-gray-500">£</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={(property as CustomPropertyDropdown).optionPrices?.[option] ?? ''}
                                onChange={(e) => updateDropdownOptionPrice(index, option, e.target.value)}
                                placeholder="Price"
                                className="w-24 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDropdownOption(index, optIndex)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {Object.keys((property as CustomPropertyDropdown).optionPrices ?? {}).length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            Options with a price will override the product price when selected.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {property.type === 'text' && (
                  <div>
                    <input
                      type="text"
                      value={(property as CustomPropertyText).placeholder || ''}
                      onChange={(e) => updateProperty(index, { placeholder: e.target.value })}
                      placeholder="Placeholder text (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                {property.type === 'number' && (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={(property as CustomPropertyNumber).min || ''}
                      onChange={(e) => updateProperty(index, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Min (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="number"
                      value={(property as CustomPropertyNumber).max || ''}
                      onChange={(e) => updateProperty(index, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Max (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="number"
                      value={(property as CustomPropertyNumber).step || ''}
                      onChange={(e) => updateProperty(index, { step: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Step (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={property.required}
                      onChange={(e) => updateProperty(index, { required: e.target.checked })}
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-sm text-gray-700">Required field</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
