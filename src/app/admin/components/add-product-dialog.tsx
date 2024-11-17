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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm mới</DialogTitle>
          <DialogDescription>
            Điền thông tin sản phẩm mới vào form dưới đây
          </DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên sản phẩm</Label>
              <Input 
                id="name" 
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                placeholder="Nhập tên sản phẩm" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Giá bán</Label>
              <Input 
                id="price" 
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                placeholder="Nhập giá bán" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Danh mục</Label>
              <Select 
                value={newProduct.category}
                onValueChange={(value) => setNewProduct({...newProduct, category: value})}
              >
                <SelectTrigger>
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
            
            <div className="space-y-2">
              <Label htmlFor="sku">Mã SKU</Label>
              <Input 
                id="sku" 
                value={newProduct.sku}
                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                placeholder="Nhập mã SKU" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Số lượng tồn</Label>
              <Input 
                id="stock" 
                type="number"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                placeholder="Nhập số lượng" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Hình ảnh URL</Label>
              <Input 
                id="image" 
                value={newProduct.image}
                onChange={(e) => setNewProduct({...newProduct, image: e.target.value})}
                placeholder="Nhập URL hình ảnh" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Xem trước hình ảnh</Label>
            <div className="border rounded-lg p-2 w-[200px] h-[200px]">
              {newProduct.image ? (
                <img 
                  src={newProduct.image} 
                  alt="Preview" 
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e: any) => e.target.src = '/placeholder.jpg'}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => {
            addProduct()
            onOpenChange(false)
          }}>
            Thêm sản phẩm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 