import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { validateCartProducts } from '../lib/cartDebug';
import { calculateSubtotal, calculateDeliveryTotal, calculateTotal } from '../lib/orderService';
import type { Product, CustomPropertySelection } from '../types/database';

export interface CartItem {
  id: string; // Unique identifier for this cart line item
  product: Product;
  quantity: number;
  customSelections?: CustomPropertySelection[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, customSelections?: CustomPropertySelection[]) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateCustomSelections: (cartItemId: string, customSelections: CustomPropertySelection[]) => void;
  clearCart: () => void;
  cleanupCart: () => Promise<number>; // Returns number of items removed
  subtotal: number;
  deliveryTotal: number;
  total: number;
  itemCount: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadAndValidateCart = async () => {
      try {
        const savedCart = localStorage.getItem('woolwitch-cart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          const cartItems = Array.isArray(parsedCart) ? parsedCart : [];
          
          if (cartItems.length > 0) {
            // Validate cart products
            const validation = await validateCartProducts(cartItems);
            
            if (!validation.valid) {
              console.warn('🧹 Invalid products found in cart, cleaning up...', validation.errors);
              
              // Keep only valid items
              const validItems = cartItems.filter(item => 
                !validation.invalidItems.some(invalid => invalid.product.id === item.product.id)
              );
              
              setItems(validItems);
              
              // Update localStorage with cleaned cart
              localStorage.setItem('woolwitch-cart', JSON.stringify(validItems));
              
              if (validItems.length !== cartItems.length) {
                console.info(`✅ Cleaned cart: removed ${cartItems.length - validItems.length} invalid items`);
              }
            } else {
              setItems(cartItems);
            }
          }
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        // Clear corrupted cart data
        localStorage.removeItem('woolwitch-cart');
      } finally {
        setIsLoading(false);
      }
    };

    loadAndValidateCart();
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('woolwitch-cart', JSON.stringify(items));
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }
  }, [items, isLoading]);

  const addItem = (product: Product, quantity: number, customSelections?: CustomPropertySelection[]) => {
    setItems((prevItems) => {
      // For products with custom properties, we need to check if the same selections already exist
      const existing = prevItems.find((item) => {
        if (item.product.id !== product.id) return false;
        
        // If product has no custom properties, just match by product ID
        if (!customSelections || customSelections.length === 0) {
          return !item.customSelections || item.customSelections.length === 0;
        }
        
        // Compare custom selections
        if (!item.customSelections || item.customSelections.length !== customSelections.length) {
          return false;
        }
        
        // Check if all selections match
        return customSelections.every(selection => 
          item.customSelections?.some(
            s => s.propertyId === selection.propertyId && s.value === selection.value
          )
        );
      });
      
      if (existing) {
        return prevItems.map((item) =>
          item === existing
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      const newId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return [...prevItems, { id: newId, product, quantity, customSelections }];
    });
  };

  const removeItem = (cartItemIdOrProductId: string) => {
    setItems((prevItems) => prevItems.filter((item) => {
      // Support both cartItemId (new) and productId (backward compatibility)
      if (item.id === cartItemIdOrProductId) return false; // cartItemId match
      if (item.product.id === cartItemIdOrProductId) return false; // productId match (removes all variants)
      return true;
    }));
  };

  const updateQuantity = (cartItemIdOrProductId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemIdOrProductId);
    } else {
      setItems((prevItems) =>
        prevItems.map((item) => {
          // Support both cartItemId (new) and productId (backward compatibility)
          if (item.id === cartItemIdOrProductId || item.product.id === cartItemIdOrProductId) {
            return { ...item, quantity };
          }
          return item;
        })
      );
    }
  };

  const updateCustomSelections = (cartItemId: string, customSelections: CustomPropertySelection[]) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === cartItemId ? { ...item, customSelections } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    // Also clear from localStorage immediately
    try {
      localStorage.removeItem('woolwitch-cart');
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  };

  const cleanupCart = async (): Promise<number> => {
    try {
      if (items.length === 0) return 0;
      
      const validation = await validateCartProducts(items);
      
      if (!validation.valid) {
        const validItems = items.filter(item => 
          !validation.invalidItems.some(invalid => invalid.product.id === item.product.id)
        );
        
        const removedCount = items.length - validItems.length;
        setItems(validItems);
        
        console.info(`🧹 Manual cleanup: removed ${removedCount} invalid items`);
        return removedCount;
      }
      
      return 0;
    } catch (error) {
      console.error('Error during cart cleanup:', error);
      return 0;
    }
  };

  const subtotal = calculateSubtotal(items);
  const deliveryTotal = calculateDeliveryTotal(items);
  const total = calculateTotal(items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateCustomSelections,
      clearCart,
      cleanupCart,
      subtotal,
      deliveryTotal,
      total,
      itemCount,
      isLoading
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
