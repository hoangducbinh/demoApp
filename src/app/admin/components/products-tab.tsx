'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, FolderOpen, AlertCircle, DollarSign, Plus, Search, Trash2, FolderPlus, Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import AddProductDialog from './add-product-dialog'
import AddCategoryDialog from './add-category-dialog'

interface Product {
  id: string
  name: string
  price: number
  category: string
  sku: string
  stock: number
  image?: string
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

interface Category {
  id: string
  name: string
  createdAt?: string
}

interface NewProduct {
  name: string
  price: string
  category: string
  sku: string
  stock: number
  image: string
}

export default function ProductsTab() {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [productSearch, setProductSearch] = useState("")
  const { toast } = useToast()

  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: '',
    price: '',
    category: '',
    sku: '',
    stock: 0,
    image: ''
  })

  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '' })
  const [categoryName, setCategoryName] = useState('')
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  useEffect(() => {
    // Lấy danh sách sản phẩm
    const unsubscribeProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setProducts(productsData as Product[])
      }
    )

    // Lấy danh sách danh mục
    const unsubscribeCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }))
        setCategories(categoriesData)
      }
    )

    return () => {
      unsubscribeProducts()
      unsubscribeCategories()
    }
  }, [])

  const addProduct = async () => {
    try {
      const { name, price, category } = newProduct

      if (!name || !price || !category) {
        toast({
          title: "Không thể thêm sản phẩm",
          description: "Vui lòng nhập đầy đủ thông tin sản phẩm",
          variant: "destructive",
        })
        return
      }

      const newProductData = {
        name,
        price: parseFloat(price),
        category,
        sku: newProduct.sku || `SKU-${Date.now()}`,
        stock: newProduct.stock || 0,
        image: newProduct.image || '',
        createdAt: new Date().toISOString(),
        status: 'active'
      }

      await addDoc(collection(db, 'products'), newProductData)

      setNewProduct({
        name: '',
        price: '',
        category: '',
        sku: '',
        stock: 0,
        image: ''
      })

      toast({
        title: "Thành công",
        description: `Sản phẩm ${name} đã được thêm vào danh sách.`,
      })
    } catch (error) {
      console.error('Error adding product:', error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm sản phẩm. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  const addCategory = async () => {
    try {
      if (!categoryName.trim()) {
        toast({
          title: "Không thể thêm danh mục",
          description: "Vui lòng nhập tên danh mục",
          variant: "destructive",
        })
        return
      }

      await addDoc(collection(db, 'categories'), {
        name: categoryName.trim(),
        createdAt: new Date().toISOString()
      })

      setCategoryName('')
      toast({
        title: "Thành công",
        description: `Danh mục ${categoryName} đã được thêm.`,
      })
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm danh mục. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      // Kiểm tra xem có sản phẩm nào đang sử dụng danh mục này không
      const productsInCategory = products.filter(p => p.category === categoryName)
      if (productsInCategory.length > 0) {
        toast({
          title: "Không thể xóa danh mục",
          description: "Vẫn còn sản phẩm trong danh mục này",
          variant: "destructive",
        })
        return
      }

      await deleteDoc(doc(db, 'categories', categoryId))
      toast({
        title: "Thành công",
        description: `Đã xóa danh mục ${categoryName}`,
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa danh mục. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const productRef = doc(db, 'products', productId)
      
      // Cập nhật trong Firestore
      await updateDoc(productRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      })

      // Hiển thị thông báo thành công
      toast({
        title: "Cập nhật thành công",
        description: "Thông tin sản phẩm đã được cập nhật",
      })

      // Reset trạng thái chỉnh sửa
      setEditingProduct(null)

    } catch (error) {
      console.error('Error updating product:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật sản phẩm. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header với thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Tổng sản phẩm</p>
                <p className="text-lg md:text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Danh mục</p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">{categories.length}</p>
              </div>
              <FolderOpen className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Hết hàng</p>
                <p className="text-lg md:text-2xl font-bold text-red-600">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
              <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Tổng giá trị</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Danh sách sản phẩm</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddProduct(true)}>
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Thêm sản phẩm</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddCategory(true)}>
                <FolderPlus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Thêm danh mục</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col space-y-4 md:flex-row md:items-end md:space-x-4 md:space-y-0">
            <div className="flex-1">
              <Label>Tìm kiếm</Label>
              <div className="flex w-full items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="Tìm theo tên, mã..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-[200px]">
              <Label>Danh mục</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[150px]">
              <Label>Sắp xếp</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Tên A-Z</SelectItem>
                  <SelectItem value="name_desc">Tên Z-A</SelectItem>
                  <SelectItem value="price_asc">Giá tăng dần</SelectItem>
                  <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="hidden md:table-cell">Danh mục</TableHead>
                  <TableHead className="hidden md:table-cell">Mã SKU</TableHead>
                  <TableHead className="text-center">Tồn kho</TableHead>
                  <TableHead className="text-right">Giá bán</TableHead>
                  <TableHead className="hidden md:table-cell">Trạng thái</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg border overflow-hidden">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Package className="h-4 w-4 md:h-6 md:w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm md:text-base">{product.name}</p>
                          <div className="md:hidden">
                            <p className="text-xs text-gray-500">{product.category}</p>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            <Badge 
                              variant={product.status === 'active' ? 'default' : 'secondary'}
                              className="mt-1"
                            >
                              {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        {editingProduct === `${product.id}-stock` ? (
                          <Input
                            type="number"
                            value={editingValue}
                            className="w-20 text-center"
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newStock = parseInt(editingValue)
                                if (!isNaN(newStock) && newStock >= 0) {
                                  updateProduct(product.id, { stock: newStock })
                                }
                              }
                            }}
                            onBlur={() => {
                              const newStock = parseInt(editingValue)
                              if (!isNaN(newStock) && newStock >= 0) {
                                updateProduct(product.id, { stock: newStock })
                              }
                              setEditingProduct(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <p 
                            className="font-medium cursor-pointer hover:text-blue-600"
                            onClick={() => {
                              setEditingProduct(`${product.id}-stock`)
                              setEditingValue(product.stock.toString())
                            }}
                          >
                            {product.stock}
                          </p>
                        )}
                        {product.stock === 0 && (
                          <Badge variant="destructive">Hết hàng</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingProduct === `${product.id}-price` ? (
                        <Input
                          type="number"
                          value={editingValue}
                          className="w-32 text-right"
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newPrice = parseFloat(editingValue)
                              if (!isNaN(newPrice) && newPrice >= 0) {
                                updateProduct(product.id, { price: newPrice })
                              }
                            }
                          }}
                          onBlur={() => {
                            const newPrice = parseFloat(editingValue)
                            if (!isNaN(newPrice) && newPrice >= 0) {
                              updateProduct(product.id, { price: newPrice })
                            }
                            setEditingProduct(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <p 
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingProduct(`${product.id}-price`)
                            setEditingValue(product.price.toString())
                          }}
                        >
                          {product.price.toLocaleString('vi-VN')} VNĐ
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center">
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="hidden md:flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingProduct(`${product.id}-name`)
                            setEditingValue(product.name)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card>
        <CardHeader>
          <CardTitle>Quản lý danh mục</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Tên danh mục mới" 
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              />
              <Button onClick={addCategory}>
                Thêm danh mục
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map(category => (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <div className="hidden md:flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteCategory(category.id, category.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      {products.filter(p => p.category === category.name).length} sản phẩm
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AddCategoryDialog
        open={showAddCategory}
        onOpenChange={setShowAddCategory}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        addCategory={addCategory}
      />

      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        categories={categories}
        addProduct={addProduct}
      />
    </div>
  )
} 