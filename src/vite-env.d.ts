/// <reference types="vite/client" />

// ========================================
// PAYPAL SDK TYPES
// ========================================

// PayPal SDK type definitions for TypeScript
declare global {
  interface Window {
    paypal?: PayPalNamespace;
    loadPayPalSDK?: () => Promise<PayPalNamespace>;
  }
}

// Main PayPal namespace
interface PayPalNamespace {
  Buttons(options: PayPalButtonsOptions): PayPalButtonsComponent;
  Messages?(options: PayPalMessagesOptions): void;
  PaymentRequest?(options: PayPalPaymentRequestOptions): void;
}

// PayPal Buttons component options
interface PayPalButtonsOptions {
  createOrder?: (data: any, actions: PayPalActions) => Promise<string>;
  onApprove?: (data: PayPalApprovalData, actions: PayPalActions) => Promise<void>;
  onError?: (error: any) => void;
  onCancel?: (data: any) => void;
  onInit?: (data: any, actions: any) => void;
  onClick?: (data: any, actions: any) => void;
  style?: PayPalButtonStyle;
  fundingSource?: string;
  env?: 'sandbox' | 'production';
}

// PayPal button styling options
interface PayPalButtonStyle {
  layout?: 'vertical' | 'horizontal';
  color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
  shape?: 'rect' | 'pill';
  label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment' | 'subscribe' | 'donate';
  tagline?: boolean;
  height?: number;
}

// PayPal actions object for order management
interface PayPalActions {
  order: {
    create(orderData: PayPalOrderData): Promise<string>;
    capture(): Promise<PayPalCaptureResult>;
    get(): Promise<PayPalOrderDetails>;
  };
  payment?: {
    create(paymentData: any): Promise<string>;
  };
}

// PayPal order data structure
interface PayPalOrderData {
  intent?: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: PayPalPurchaseUnit[];
  application_context?: {
    brand_name?: string;
    landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE';
    shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS';
    user_action?: 'CONTINUE' | 'PAY_NOW';
  };
}

// Purchase unit for PayPal orders
interface PayPalPurchaseUnit {
  reference_id?: string;
  description?: string;
  custom_id?: string;
  soft_descriptor?: string;
  amount: PayPalAmount;
  items?: PayPalItem[];
  shipping?: PayPalShipping;
}

// PayPal amount structure with breakdown
interface PayPalAmount {
  currency_code: string;
  value: string;
  breakdown?: {
    item_total?: { currency_code: string; value: string };
    shipping?: { currency_code: string; value: string };
    handling?: { currency_code: string; value: string };
    tax_total?: { currency_code: string; value: string };
    insurance?: { currency_code: string; value: string };
    shipping_discount?: { currency_code: string; value: string };
    discount?: { currency_code: string; value: string };
  };
}

// PayPal item structure
interface PayPalItem {
  name: string;
  description?: string;
  sku?: string;
  unit_amount: {
    currency_code: string;
    value: string;
  };
  quantity: string;
  category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS';
}

// PayPal shipping information
interface PayPalShipping {
  method?: string;
  address?: {
    name?: { full_name?: string };
    address_line_1?: string;
    address_line_2?: string;
    admin_area_2?: string; // City
    admin_area_1?: string; // State/Province
    postal_code?: string;
    country_code?: string;
  };
}

// PayPal approval data from onApprove callback
interface PayPalApprovalData {
  orderID: string;
  payerID: string;
  paymentID?: string;
  billingToken?: string;
  facilitatorAccessToken?: string;
}

// PayPal capture result structure
interface PayPalCaptureResult {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  purchase_units: Array<{
    reference_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: 'PENDING' | 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
        amount: PayPalAmount;
        final_capture?: boolean;
        seller_protection?: any;
        seller_receivable_breakdown?: any;
        create_time?: string;
        update_time?: string;
      }>;
    };
  }>;
  payer?: {
    name?: { given_name?: string; surname?: string };
    email_address?: string;
    payer_id?: string;
    address?: any;
  };
  create_time?: string;
  update_time?: string;
  links?: Array<{
    href: string;
    rel: string;
    method?: string;
  }>;
}

// PayPal order details structure
interface PayPalOrderDetails {
  id: string;
  intent: string;
  status: string;
  purchase_units: PayPalPurchaseUnit[];
  payer?: any;
  create_time?: string;
  update_time?: string;
  links?: any[];
}

// PayPal Buttons component
interface PayPalButtonsComponent {
  render(selector: string | HTMLElement): Promise<void>;
  close(): Promise<void>;
  isEligible(): boolean;
}

// PayPal Messages options
interface PayPalMessagesOptions {
  amount?: number;
  placement?: string;
  style?: any;
}

// PayPal Payment Request options  
interface PayPalPaymentRequestOptions {
  flow: string;
  intent: string;
  currency: string;
}

// Export types for use in components
export type {
  PayPalNamespace,
  PayPalCaptureResult,
  PayPalButtonsOptions,
  PayPalApprovalData,
  PayPalActions,
  PayPalOrderData,
  PayPalAmount,
  PayPalItem
};

export {}; // Ensure this file is treated as a module
