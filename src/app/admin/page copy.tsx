'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Users, Package, LayoutDashboard } from 'lucide-react'
import SalesTab from './components/sales/SalesTab'
import OrdersTab from './components/orders/OrdersTab'
import CustomersTab from './components/customers/CustomersTab'
import ProductsTab from './components/products/ProductsTab'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("sales")

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-bold mb-6">Quản lý bán hàng</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Bán hàng
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Quản lý đơn hàng
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center justify-center">
            <Users className="w-4 h-4 mr-2" />
            Khách hàng
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center justify-center">
            <Package className="w-4 h-4 mr-2" />
            Sản phẩm
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesTab />
        </TabsContent>
        
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        
        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>
        
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}