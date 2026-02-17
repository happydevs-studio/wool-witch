import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { CustomProperty, CustomPropertyType, CustomPropertiesConfig } from '../types/database';

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

  const updateDropdownOptions = (index: number, optionsString: string) => {
    const property = properties[index];
    if (property.type !== 'dropdown') return;

    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
    updateProperty(index, { options });
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
                  <div>
                    <input
                      type="text"
                      value={property.options.join(', ')}
                      onChange={(e) => updateDropdownOptions(index, e.target.value)}
                      placeholder="Options (comma-separated, e.g., Small, Medium, Large)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    {property.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {property.options.map((option, optIndex) => (
                          <span
                            key={optIndex}
                            className="inline-flex items-center px-2 py-1 text-xs bg-white border border-gray-300 rounded-md"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {property.type === 'text' && (
                  <div>
                    <input
                      type="text"
                      value={(property as any).placeholder || ''}
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
                      value={(property as any).min || ''}
                      onChange={(e) => updateProperty(index, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Min (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="number"
                      value={(property as any).max || ''}
                      onChange={(e) => updateProperty(index, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Max (optional)"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="number"
                      value={(property as any).step || ''}
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
