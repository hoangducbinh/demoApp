'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Package, FolderOpen, AlertCircle, DollarSign, Plus, Search, Edit2, Trash2, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, addDoc } from 'firebase/firestore'
import AddProductDialog from './add-product-dialog'

export default function ProductsTab() {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const { toast } = useToast()

  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    sku: '',
    stock: 0,
    image: ''
  })

  useEffect(() => {
    // Lấy danh sách sản phẩm
    const unsubscribeProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setProducts(productsData)
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

  return (
    <div className="space-y-4">
      {/* Header với thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng sản phẩm</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Danh mục</p>
                <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Hết hàng</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng giá trị</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quản lý sản phẩm */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quản lý sản phẩm</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Xuất Excel
              </Button>
              <Button onClick={() => setShowAddProduct(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm sản phẩm
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <Label>Tìm kiếm</Label>
              <div className="flex w-full items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="Tìm theo tên, mã sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="w-[200px]">
              <Label>Danh mục</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả danh mục" />
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
            <div className="w-[150px]">
              <Label>Sắp xếp</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Tên A-Z</SelectItem>
                  <SelectItem value="name_desc">Tên Z-A</SelectItem>
                  <SelectItem value="price_asc">Giá tăng d���n</SelectItem>
                  <SelectItem value="price_desc">Giá giảm dần</SelectItem>
                  <SelectItem value="stock_asc">Tồn kho ít</SelectItem>
                  <SelectItem value="stock_desc">Tồn kho nhiều</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox />
                </TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead className="text-center">Tồn kho</TableHead>
                <TableHead className="text-right">Giá bán</TableHead>
                <TableHead className="text-center">Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <img 
                        src={product.image || '/placeholder.png'} 
                        alt={product.name}
                        className="h-10 w-10 rounded-md object-cover"
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <p className="font-medium">{product.stock}</p>
                      {product.stock === 0 && (
                        <Badge variant="destructive">Hết hàng</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {product.price.toLocaleString('vi-VN')} VNĐ
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                      {product.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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