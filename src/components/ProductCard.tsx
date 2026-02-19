import { ShoppingCart, Eye, Settings } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { OptimizedImage } from './OptimizedImage';
import { CustomPropertiesInput } from './CustomPropertiesInput';
import { getProductPriceRange } from '../lib/orderService';
import type { Product, CustomPropertiesConfig, CustomPropertySelection } from '../types/database';

interface ProductCardProps {
  product: Product;
  onViewDetails?: (productId: string) => void;
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [customSelections, setCustomSelections] = useState<CustomPropertySelection[]>([]);

  const customProperties = product.custom_properties as CustomPropertiesConfig | null;
  const hasCustomProperties = customProperties?.properties && customProperties.properties.length > 0;

  const { min: priceMin, max: priceMax } = getProductPriceRange(customProperties ?? null, product.price, product.price_max ?? null);

  const handleAddToCart = () => {
    if (hasCustomProperties) {
      // Validate required properties
      const allRequiredFilled = customProperties!.properties
        .filter(p => p.required)
        .every(p => customSelections.some(s => s.propertyId === p.id && s.value !== ''));

      if (!allRequiredFilled) {
        setShowCustomizeModal(true);
        return;
      }
    }

    addItem(product, 1, hasCustomProperties ? customSelections : undefined);
    setIsAdded(true);
    setShowCustomizeModal(false);
    setCustomSelections([]);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleCustomizeClick = () => {
    setShowCustomizeModal(true);
  };

  const handleModalAddToCart = () => {
    // Validate required properties
    const allRequiredFilled = customProperties!.properties
      .filter(p => p.required)
      .every(p => customSelections.some(s => s.propertyId === p.id && s.value !== ''));

    if (!allRequiredFilled) {
      alert('Please fill in all required fields');
      return;
    }

    addItem(product, 1, customSelections);
    setIsAdded(true);
    setShowCustomizeModal(false);
    setCustomSelections([]);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <>
      <div className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <OptimizedImage
            src={product.image_url}
            alt={product.name}
            className="group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.stock_quantity != null && product.stock_quantity < 5 && product.stock_quantity > 0 && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Only {product.stock_quantity} left
            </div>
          )}
          {product.stock_quantity != null && product.stock_quantity === 0 && (
            <div className="absolute top-3 right-3 bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
              Sold Out
            </div>
          )}
          {hasCustomProperties && (
            <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Customizable
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="mb-2">
            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-full">
              {product.category}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
            {product.name}
          </h3>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {product.description}
          </p>

          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-2xl font-bold text-gray-900">
                {priceMax > priceMin
                  ? `£${priceMin.toFixed(2)} - £${priceMax.toFixed(2)}`
                  : `£${priceMin.toFixed(2)}`
                }
              </span>
              {product.delivery_charge != null && product.delivery_charge > 0 && (
                <p className="text-xs text-gray-500">
                  + £{product.delivery_charge.toFixed(2)} delivery
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(product.id)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border-2 border-rose-600 text-rose-600 rounded-lg transition-all font-medium hover:bg-rose-50"
              >
                <Eye className="w-4 h-4" />
                <span>Details</span>
              </button>
            )}
            {hasCustomProperties ? (
              <button
                onClick={handleCustomizeClick}
                disabled={product.stock_quantity != null && product.stock_quantity === 0}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium"
              >
                <Settings className="w-4 h-4" />
                <span>Customize</span>
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity != null && product.stock_quantity === 0}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  isAdded
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{isAdded ? 'Added!' : 'Add to Bag'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customize Modal */}
      {showCustomizeModal && hasCustomProperties && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Customize {product.name}</h2>
              
              <CustomPropertiesInput
                properties={customProperties.properties}
                values={customSelections}
                onChange={setCustomSelections}
                basePrice={product.price}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCustomizeModal(false);
                    setCustomSelections([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalAddToCart}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium"
                >
                  Add to Bag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
