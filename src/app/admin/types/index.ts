export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff'
  avatar?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  type: 'normal' | 'vip'
  status: 'active' | 'inactive'
  createdAt: string
  orderCount: number
  totalSpent: number
  avatar: string
  address: string
  note?: string
}

export interface Product {
  id: string
  name: string
  sku: string
  price: number
  category: string
  description: string
  image: string
  stock: number
  status: 'active' | 'inactive'
  createdAt: string
}

export interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface Order {
  id: string
  customerId: string | null
  customerName?: string
  items: OrderItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  note: string
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'momo'
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  createdAt: string
  history?: OrderHistory[]
}

export interface OrderHistory {
  date: string
  status: string
  updatedBy: string
  note: string
}