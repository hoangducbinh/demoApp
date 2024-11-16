'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, MinusCircle, PlusCircle, Trash2, X, ShoppingCart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, addDoc, doc, updateDoc, increment } from 'firebase/firestore'

interface Order {
  customer: string | null
  items: any[]
  subtotal: number
  discount: number
  tax: number
  total: number
  note: string
  paymentMethod: string
  status: string
}

export default function SalesTab() {
  const { toast } = useToast()
  const [showCart, setShowCart] = useState(true)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [orderNote, setOrderNote] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const taxRate = 0.1 // 10% VAT

  const [order, setOrder] = useState<Order>({
    customer: null,
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    note: "",
    paymentMethod: "",
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
        setProducts(productsData)
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
        setCustomers(customersData)
      }
    )

    return () => {
      unsubProducts()
      unsubCustomers()
    }
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addToOrder = (product, quantity = 1) => {
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

  const removeFromOrder = (productId) => {
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

  const updateQuantity = (productId, newQuantity) => {
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
      
      const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const discount = (discountAmount / 100) * subtotal
      const taxableAmount = subtotal - discount
      const tax = taxableAmount * taxRate
      
      const newOrder = {
        ...order,
        subtotal,
        discount,
        tax,
        total: taxableAmount + tax,
        note: orderNote,
        paymentMethod,
        status: "pending",
        date: new Date().toISOString(),
        history: [{
          date: new Date().toISOString(),
          status: "pending",
          note: "Đơn hàng được tạo",
          updatedBy: "Admin"
        }]
      }
      
      const docRef = await addDoc(collection(db, 'orders'), newOrder)
      
      // Update customer info
      const customerRef = doc(db, 'customers', order.customer)
      await updateDoc(customerRef, {
        orderCount: increment(1),
        totalSpent: increment(newOrder.total)
      })

      // Reset form
      setOrder({
        customer: null,
        items: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        note: "",
        paymentMethod: "",
        status: "pending"
      })
      setOrderNote("")
      setPaymentMethod("")
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Products List */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl">Danh sách sản phẩm</CardTitle>
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
                            <Button size="sm" onClick={() => addToOrder(product, parseInt(document.getElementById(`quantity-${product.id}`).value, 10))}>
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

        {/* Order Details */}
        <div className={`lg:col-span-5 space-y-4 ${showCart ? 'block' : 'hidden lg:block'}`}>
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
                  <Label>Phương thức thanh toán</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn phương thức" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Thanh toán khi nhận hàng</SelectItem>
                      <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                      <SelectItem value="card">Thẻ tín dụng</SelectItem>
                      <SelectItem value="momo">Ví MoMo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="flex justify-between text-gray-600">
                  <span>VAT (10%):</span>
                  <span>{((order.subtotal || 0) * (1 - discountAmount / 100) * taxRate).toLocaleString('vi-VN')} VNĐ</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Tổng cộng:</span>
                  <span>{((order.subtotal || 0) * (1 - discountAmount / 100) * (1 + taxRate)).toLocaleString('vi-VN')} VNĐ</span>
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