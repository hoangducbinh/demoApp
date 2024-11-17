'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, MinusCircle, PlusCircle, Trash2, X, ShoppingCart, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db, auth } from '@/lib/firebase'
import { collection, onSnapshot, addDoc, doc, increment, writeBatch } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Badge } from "@/components/ui/badge"

interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
  image?: string
}

interface Customer {
  id: string
  name: string
  orderCount: number
  totalSpent: number
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface OrderHistory {
  date: string
  status: string
  note: string
  updatedBy: string
}

interface Order {
  customer: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  note: string
  paymentMethod: string
  status: string
  date?: string
  history?: OrderHistory[]
}

export default function SalesTab() {
  const { toast } = useToast()
  const [showCart, setShowCart] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [orderNote, setOrderNote] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [currentUser, setCurrentUser] = useState<string>("Admin")

  const [order, setOrder] = useState<Order>({
    customer: null,
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    note: "",
    paymentMethod: "cod",
    status: "pending"
  })

  useEffect(() => {
    // Fetch products
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setProducts(productsData as Product[])
      }
    )

    // Fetch customers
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const customersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setCustomers(customersData as Customer[])
      }
    )

    return () => {
      unsubProducts()
      unsubCustomers()
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.displayName) {
          setCurrentUser(user.displayName)
        } else if (user.email) {
          const username = user.email.split('@')[0]
          const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1)
          setCurrentUser(capitalizedUsername)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addToOrder = (product: Product, quantity = 1) => {
    if (quantity < 1) return

    setOrder(prevOrder => {
      const existingItem = prevOrder.items.find(item => item.id === product.id)
      let newItems

      if (existingItem) {
        newItems = prevOrder.items.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        newItems = [...prevOrder.items, { ...product, quantity }]
      }

      const subtotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      return {
        ...prevOrder,
        items: newItems,
        subtotal
      }
    })

    toast({
      title: "Đã thêm vào đơn hàng",
      description: `${quantity} x ${product.name}`,
    })
  }

  const removeFromOrder = (productId: string) => {
    const newItems = order.items.filter(item => item.id !== productId)
    setOrder({
      ...order,
      items: newItems,
      subtotal: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    })

    toast({
      title: "Đã xóa khỏi đơn hàng",
      description: "Sản phẩm đã được xóa khỏi đơn hàng.",
      variant: "destructive",
    })
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return
    const newItems = order.items.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    )
    setOrder({
      ...order,
      items: newItems,
      subtotal: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    })
  }

  const createOrder = async () => {
    try {
      if (!order.customer || order.items.length === 0) {
        toast({
          title: "Không thể tạo đơn hàng",
          description: "Vui lòng chọn khách hàng và thêm sản phẩm vào đơn hàng",
          variant: "destructive",
        })
        return
      }

      // Kiểm tra số lượng tồn kho
      for (const item of order.items) {
        const product = products.find(p => p.id === item.id)
        if (!product || product.stock < item.quantity) {
          toast({
            title: "Lỗi số lượng",
            description: `Sản phẩm ${item.name} không đủ số lượng trong kho`,
            variant: "destructive",
          })
          return
        }
      }
      
      const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const discount = (discountAmount / 100) * subtotal
      const total = subtotal - discount
      
      const newOrder = {
        ...order,
        subtotal,
        discount,
        total,
        note: orderNote,
        paymentMethod,
        status: "pending",
        date: new Date().toISOString(),
        history: [{
          date: new Date().toISOString(),
          status: "pending",
          note: "Đơn hàng được tạo",
          updatedBy: currentUser
        }]
      }
      
      const docRef = await addDoc(collection(db, 'orders'), newOrder)
      
      // Cập nhật số lượng tồn kho
      const batch = writeBatch(db)
      order.items.forEach(item => {
        const productRef = doc(db, 'products', item.id)
        batch.update(productRef, {
          stock: increment(-item.quantity)
        })
      })
      
      // Cập nhật thông tin khách hàng
      const customerRef = doc(db, 'customers', order.customer)
      batch.update(customerRef, {
        orderCount: increment(1),
        totalSpent: increment(newOrder.total)
      })

      await batch.commit()

      // Reset form
      setOrder({
        customer: null,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        note: "",
        paymentMethod: "cod",
        status: "pending"
      })
      setOrderNote("")
      setDiscountAmount(0)
      
      toast({
        title: "Đơn hàng đã được tạo",
        description: `Đơn hàng #${docRef.id} đã được tạo thành công.`,
      })
    } catch (error) {
      console.error('Error creating order:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tạo đơn hàng. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4 p-2 md:p-4">
      {/* Mobile Cart View */}
      <div className={`lg:hidden fixed inset-0 z-50 bg-white ${showCart ? 'block' : 'hidden'}`}>
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0 pb-2">
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-lg">Đơn hàng mới</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <Select onValueChange={(value) => setOrder({ ...order, customer: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto pb-0">
            {/* Cart Items */}
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.price.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <MinusCircle className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <PlusCircle className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => removeFromOrder(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Details */}
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Giảm giá (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Thanh toán</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">COD</SelectItem>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="transfer">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm">Ghi chú</Label>
                <Input
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ghi chú đơn hàng..."
                  className="mt-1"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{order.subtotal?.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Giảm giá ({discountAmount}%)</span>
                  <span>-{((order.subtotal || 0) * (discountAmount / 100)).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Tổng cộng</span>
                  <span>{((order.subtotal || 0) * (1 - discountAmount / 100)).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-shrink-0 pt-4">
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" onClick={() => setShowCart(false)}>Hủy</Button>
              <Button onClick={createOrder}>Tạo đơn hàng</Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Products List */}
      <div className="lg:grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sản phẩm</CardTitle>
                <Button 
                  className="lg:hidden" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCart(true)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  <span>{order.items.length}</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Tìm sản phẩm..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </CardHeader>

            {/* Products Grid for Mobile */}
            <CardContent className="lg:hidden">
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id} 
                    className="p-2 border rounded-lg space-y-2 relative"
                  >
                    {/* Badge tồn kho */}
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                        {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
                      </Badge>
                    </div>

                    {/* Ảnh sản phẩm */}
                    <div 
                      className="aspect-square bg-gray-100 rounded-md flex items-center justify-center overflow-hidden"
                      onClick={() => product.stock > 0 && addToOrder(product)}
                    >
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400" />
                      )}
                    </div>

                    {/* Thông tin sản phẩm */}
                    <div className="space-y-1">
                      <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.category}</p>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-primary">
                          {product.price.toLocaleString('vi-VN')} đ
                        </p>
                        {product.stock > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => addToOrder(product)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>

            {/* Products Table for Desktop */}
            <div className="hidden lg:block">
              <Card>
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Danh sách sản phẩm</CardTitle>
                    <Button className="lg:hidden" variant="outline" onClick={() => setShowCart(!showCart)}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      <span>{order.items.length}</span>
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Tìm kiếm sản phẩm..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="flex-grow"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead className="hidden md:table-cell">Danh mục</TableHead>
                          <TableHead className="text-center hidden md:table-cell">Tồn</TableHead>
                          <TableHead className="text-right">Giá</TableHead>
                          <TableHead className="text-center">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map(product => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium min-w-[120px]">
                              {product.name}
                              <span className="block text-sm text-gray-500 md:hidden">
                                {product.category}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                            <TableCell className="text-center hidden md:table-cell">{product.stock}</TableCell>
                            <TableCell className="text-right">{product.price.toLocaleString('vi-VN')}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end space-x-2">
                                <Input
                                  type="number"
                                  min="1"
                                  defaultValue="1"
                                  className="w-16 md:w-20"
                                  id={`quantity-${product.id}`}
                                />
                                <Button size="sm" onClick={() => {
                                  const input = document.getElementById(`quantity-${product.id}`) as HTMLInputElement;
                                  if (input) {
                                    addToOrder(product, parseInt(input.value, 10));
                                  }
                                }}>
                                  <Plus className="h-4 w-4" />
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
            </div>
          </Card>
        </div>

        {/* Desktop Cart */}
        <div className="hidden lg:block lg:col-span-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl">Thông tin đơn hàng</CardTitle>
                <Button className="lg:hidden" variant="ghost" onClick={() => setShowCart(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Select onValueChange={(value) => setOrder({ ...order, customer: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khách hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Tìm kiếm khách hàng..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Items Table */}
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Đơn giá</TableHead>
                      <TableHead className="text-center">SL</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.name}
                          <span className="block text-sm text-gray-500 md:hidden">
                            {item.price.toLocaleString('vi-VN')} VNĐ
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          {item.price.toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-1">
                            <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                              <MinusCircle className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                              <PlusCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {(item.price * item.quantity).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeFromOrder(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Payment and Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Giảm giá (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Phương thức thanh toán</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phương thức thanh toán" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cod">Thanh toán khi nhận hàng</SelectItem>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="transfer">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Order Note */}
              <div>
                <Label>Ghi chú</Label>
                <Input
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Nhập ghi chú cho đơn hàng..."
                />
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{order.subtotal?.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Giảm giá ({discountAmount}%):</span>
                  <span>-{((order.subtotal || 0) * (discountAmount / 100)).toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Tổng cộng:</span>
                  <span>{((order.subtotal || 0) * (1 - discountAmount / 100)).toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto">Hủy</Button>
              <Button onClick={createOrder} className="w-full sm:w-auto">Tạo đơn hàng</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
} 