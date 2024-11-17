'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageIcon } from 'lucide-react'

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newProduct: any
  setNewProduct: (product: any) => void
  categories: any[]
  addProduct: () => void
}

export default function AddProductDialog({
  open,
  onOpenChange,
  newProduct,
  setNewProduct,
  categories,
  addProduct
}: AddProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-2xl mx-auto p-3 md:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="space-y-2 text-left md:text-center mb-4">
          <DialogTitle className="text-lg md:text-2xl font-bold">
            Thêm sản phẩm mới
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm text-gray-500">
            Điền thông tin sản phẩm mới vào form dưới đây
          </DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4">
          {/* Phần hình ảnh - Đưa lên đầu trên mobile */}
          <div className="md:hidden">
            <Label className="text-sm font-medium mb-2 block">
              Xem trước hình ảnh
            </Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                {newProduct.image ? (
                  <img 
                    src={newProduct.image} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e: any) => e.target.src = '/placeholder.jpg'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="mobile-image" className="text-sm font-medium">
                  URL hình ảnh
                </Label>
                <Input 
                  id="mobile-image" 
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                  placeholder="Nhập URL hình ảnh"
                  className="mt-1" 
                />
              </div>
            </div>
          </div>

          {/* Thông tin cơ bản */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Tên sản phẩm <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="name" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="Nhập tên sản phẩm"
                className="mt-1" 
              />
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="price" className="text-sm font-medium">
                  Giá bán <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="price" 
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  placeholder="Nhập giá bán"
                  className="mt-1" 
                />
              </div>
              
              <div className="flex-1">
                <Label htmlFor="stock" className="text-sm font-medium">
                  Số lượng tồn
                </Label>
                <Input 
                  id="stock" 
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                  placeholder="Nhập số lượng"
                  className="mt-1" 
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="category" className="text-sm font-medium">
                  Danh mục <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={newProduct.category}
                  onValueChange={(value) => setNewProduct({...newProduct, category: value})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="sku" className="text-sm font-medium">
                  Mã SKU
                </Label>
                <Input 
                  id="sku" 
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  placeholder="Nhập mã SKU"
                  className="mt-1" 
                />
              </div>
            </div>
          </div>

          {/* Phần hình ảnh - Desktop */}
          <div className="hidden md:block space-y-3">
            <Label className="text-sm font-medium">
              Xem trước hình ảnh
            </Label>
            <div className="flex items-start gap-4">
              <div className="w-[200px] aspect-square rounded-lg border border-gray-200 overflow-hidden">
                {newProduct.image ? (
                  <img 
                    src={newProduct.image} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e: any) => e.target.src = '/placeholder.jpg'}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <Label htmlFor="desktop-image" className="text-sm font-medium">
                  URL hình ảnh
                </Label>
                <Input 
                  id="desktop-image" 
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                  placeholder="Nhập URL hình ảnh"
                  className="mt-1" 
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Hủy
          </Button>
          <Button 
            onClick={() => {
              addProduct()
              onOpenChange(false)
            }}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            Thêm sản phẩm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 