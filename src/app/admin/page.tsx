'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/firebase-service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Users, Package, LayoutDashboard, LogOut, Menu } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import SalesTab from './components/sales-tab'
import ProductsTab from './components/products-tab'
import OrdersTab from './components/orders-tab'
import CustomersTab from './components/customers-tab'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("sales")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setIsMobileMenuOpen(false) // Đóng menu mobile khi chọn tab
  }

  return (
    <div className="container mx-auto p-2 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-3xl font-bold truncate">
          Quản lý bán hàng (Thử nghiệm)
        </h1>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Đăng xuất</span>
          </Button>
        </div>
      </div>
      
      {/* Desktop Tabs */}
      <div className="hidden md:block">
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

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[280px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  variant={activeTab === "sales" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("sales")}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Bán hàng
                </Button>
                <Button
                  variant={activeTab === "orders" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("orders")}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Quản lý đơn hàng
                </Button>
                <Button
                  variant={activeTab === "customers" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("customers")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Khách hàng
                </Button>
                <Button
                  variant={activeTab === "products" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleTabChange("products")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Sản phẩm
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="text-lg font-semibold">
            {activeTab === "sales" && "Bán hàng"}
            {activeTab === "orders" && "Quản lý đơn hàng"}
            {activeTab === "customers" && "Khách hàng"}
            {activeTab === "products" && "Sản phẩm"}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="mt-4">
          {activeTab === "sales" && <SalesTab />}
          {activeTab === "orders" && <OrdersTab />}
          {activeTab === "customers" && <CustomersTab />}
          {activeTab === "products" && <ProductsTab />}
        </div>
      </div>
    </div>
  )
}