export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          category: string;
          stock_quantity: number;
          is_available: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'user';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_roles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
      };
    };
  };
}

export type Product = Database['public']['Tables']['products']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];
