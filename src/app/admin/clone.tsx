'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Eye, Printer, Plus, Trash2, FileText, 
    MinusCircle, PlusCircle, Search, ShoppingCart, 
    Users, Package, LayoutDashboard, X,
     Clock, CheckCircle, DollarSign, 
    FileSpreadsheet, RefreshCw, 
    ChevronLeft, ChevronRight, CheckCircle2, 
    Circle, User, Mail, Phone, Edit2, CreditCard, Banknote, 
    Building2, Smartphone,
    MapPin, Save, UserPlus, Crown, ShoppingBag, FolderOpen, AlertCircle, ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { db } from '@/lib/firebase'
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, where, orderBy, increment } from 'firebase/firestore'



export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("sales")
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [filteredProducts, setFilteredProducts] = useState(products)
  const [filteredCustomers, setFilteredCustomers] = useState(customers)
  const [orderNote, setOrderNote] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [taxRate, setTaxRate] = useState(0.1) // 10% VAT
  const [showCart, setShowCart] = useState(false)
  const [orderSearch, setOrderSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [filteredOrders, setFilteredOrders] = useState([])
  const [orderPreparationStatus, setOrderPreparationStatus] = useState({})
  const [statusUpdateNote, setStatusUpdateNote] = useState("")
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [isAllCustomersSelected, setIsAllCustomersSelected] = useState(false)
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all")
  const [customerSort, setCustomerSort] = useState("name_asc")

  const { toast } = useToast()

  // Thêm state cho đơn hàng hiện tại
  const [order, setOrder] = useState({
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

  // Thêm state cho danh mục
  const [categories, setCategories] = useState([])

  // Thêm states cho form thêm sản phẩm
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    sku: '',
    stock: 0,
    image: ''
  })

  // Thêm state để quản lý dialog
  const [showAddProduct, setShowAddProduct] = useState(false)

  useEffect(() => {
    // Lấy danh sách khách hàng
    const unsubscribeCustomers = onSnapshot(
      query(collection(db, 'customers'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const customersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setCustomers(customersData)
      }
    )

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

    // Lấy danh sách đơn hàng
    const unsubscribeOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('date', 'desc')),
      (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setOrders(ordersData)
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

    // Cleanup function
    return () => {
      unsubscribeCustomers()
      unsubscribeProducts()
      unsubscribeOrders()
      unsubscribeCategories()
    }
  }, [])

  useEffect(() => {
    setFilteredProducts(
      products.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.category.toLowerCase().includes(productSearch.toLowerCase())
      )
    )
  }, [productSearch, products])

  useEffect(() => {
    setFilteredCustomers(
      customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase())
      )
    )
  }, [customerSearch, customers])

  useEffect(() => {
    let result = [...orders]

    // Lọc theo từ khóa tìm kiếm
    if (orderSearch) {
      const searchLower = orderSearch.toLowerCase()
      result = result.filter(order => 
        order.id.toString().includes(searchLower) ||
        customers.find(c => c.id.toString() === order.customer)?.name.toLowerCase().includes(searchLower) ||
        customers.find(c => c.id.toString() === order.customer)?.email.toLowerCase().includes(searchLower)
      )
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter)
    }

    // Lọc theo khoảng thời gian
    if (startDate) {
      const start = new Date(startDate)
      result = result.filter(order => new Date(order.date) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Đặt thời gian cuối ngày
      result = result.filter(order => new Date(order.date) <= end)
    }

    // Sắp xếp theo thời gian mới nhất
    result.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Cập nhật số trang
    const itemsPerPage = 10 // Số đơn hàng mỗi trang
    setTotalPages(Math.ceil(result.length / itemsPerPage))

    // Phân trang
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    result = result.slice(startIndex, endIndex)

    setFilteredOrders(result)
  }, [orders, orderSearch, statusFilter, startDate, endDate, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [orderSearch, statusFilter, startDate, endDate])

  useEffect(() => {
    setIsAllSelected(
      filteredOrders.length > 0 && 
      filteredOrders.every(order => selectedOrders.includes(order.id))
    )
  }, [filteredOrders, selectedOrders])

  // Cập nhật hàm addToOrder
  const addToOrder = (product, quantity) => {
    const existingItemIndex = order.items.findIndex(item => item.id === product.id)
    let newItems

    if (existingItemIndex !== -1) {
      newItems = [...order.items]
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + quantity
      }
    } else {
      newItems = [...order.items, { ...product, quantity }]
    }

    setOrder({
      ...order,
      items: newItems,
      subtotal: newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    })

    toast({
      title: "Đã thêm vào đơn hàng",
      description: `${quantity} x ${product.name}`,
    })
  }

  // Cập nhật hàm removeFromOrder
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

  // Cập nhật hàm updateQuantity
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

  // Cập nhật hàm createOrder
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
      
      // Cập nhật thông tin khách hàng
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

  const printInvoices = () => {
    console.log("In hóa đơn cho các đơn hàng:", selectedOrders)
    toast({
      title: "Đang in hóa đơn",
      description: `Đang in ${selectedOrders.length} hóa đơn.`,
    })
  }

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
        sku: newProduct.sku || `SKU-${Date.now()}`, // Tạo SKU mặc định nếu không có
        stock: newProduct.stock || 0,
        image: newProduct.image || '', // URL hình ảnh mặc định hoặc để trống
        createdAt: new Date().toISOString(),
        status: 'active'
      }

      await addDoc(collection(db, 'products'), newProductData)

      // Reset form
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

  const addCategory = async (categoryName) => {
    try {
      if (!categoryName) {
        toast({
          title: "Không thể thêm danh mục",
          description: "Vui lòng nhập tên danh mục",
          variant: "destructive",
        })
        return
      }

      await addDoc(collection(db, 'categories'), {
        name: categoryName,
        createdAt: new Date().toISOString()
      })

      toast({
        title: "Thành công",
        description: `Danh mục ${categoryName} đã được thêm.`,
      })

      // Reset input
      if (document.getElementById('newCategory')) {
        (document.getElementById('newCategory') as HTMLInputElement).value = ''
      }
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm danh mục. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prevSelected =>
      prevSelected.includes(orderId)
        ? prevSelected.filter(id => id !== orderId)
        : [...prevSelected, orderId]
    )
  }

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrders(prevSelected => 
        prevSelected.filter(id => !filteredOrders.find(order => order.id === id))
      )
    } else {
      setSelectedOrders(prevSelected => [
        ...new Set([...prevSelected, ...filteredOrders.map(order => order.id)])
      ])
    }
    setIsAllSelected(!isAllSelected)
  }

  const viewOrderDetails = (orderId) => {
    setSelectedOrder(orders.find(order => order.id === orderId))
  }

  const printOrder = (orderId) => {
    console.log("In hóa đơn cho đơn hàng:", orderId)
    toast({
      title: "Đang in hóa đơn",
      description: `Đang in hóa đơn #${orderId}`,
    })
  }

  const updateOrderStatus = (orderId) => {
     
      toast({
        title: "Đã cập nhật trạng thái đơn hàng",
        description: `Đơn hàng #${orderId} đã được cập nhật trạng thái thành `,
      })
    
  }

  const printSelectedOrders = () => {
    console.log("In hóa đơn cho các đơn hàng:", selectedOrders)
    toast({
      title: "Đang in hóa đơn",
      description: `Đang in ${selectedOrders.length} hóa đơn.`,
    })
  }

  const exportToExcel = () => {
    console.log("Xuất Excel cho các đơn hàng:", orders)
    toast({
      title: "Đang xuất Excel",
      description: `Đang xuất Excel cho ${orders.length} đơn hàng`,
    })
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'processing': return 'default'
      case 'completed': return 'success'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Chờ xử lý'
      case 'processing': return 'Đang xử lý'
      case 'completed': return 'Hoàn thành'
      case 'cancelled': return 'Đã hủy'
      default: return 'Không xác định'
    }
  }

  const getPaymentBadgeVariant = (method) => {
    switch (method) {
      case 'cash': return 'default'
      case 'bank_transfer': return 'info'
      case 'card': return 'success'
      case 'momo': return 'warning'
      default: return 'secondary'
    }
  }

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'cash': return 'Tiền mặt'
      case 'bank_transfer': return 'Chuyển khoản'
      case 'card': return 'Thẻ tín dụng'
      case 'momo': return 'Ví MoMo'
      default: return 'Không xác định'
    }
  }

  const updateOrderItemQuantity = (orderId: number, itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setSelectedOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        ),
        subtotal: prev.items.reduce((sum, item) => 
          sum + (item.id === itemId ? newQuantity : item.quantity) * item.price, 
        0)
      };
    });
  };

  const toggleCustomerSelection = (customerId) => {
    setSelectedCustomers(prevSelected =>
      prevSelected.includes(customerId)
        ? prevSelected.filter(id => id !== customerId)
        : [...prevSelected, customerId]
    )
  }

  const toggleSelectAllCustomers = () => {
    if (isAllCustomersSelected) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id))
    }
    setIsAllCustomersSelected(!isAllCustomersSelected)
  }

  const viewCustomerDetails = (customerId) => {
    // Implement view details logic
  }

  const editCustomer = (customerId) => {
    // Implement edit logic
  }

  const deleteCustomer = (customerId) => {
    // Implement delete logic
  }

  // Filter customers
  const filteredCustomersList = useMemo(() => {
    let result = [...customers]

    // Filter by search
    if (customerSearch) {
      const searchLower = customerSearch.toLowerCase()
      result = result.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchLower)
      )
    }

    // Filter by type
    if (customerTypeFilter !== 'all') {
      result = result.filter(customer => customer.type === customerTypeFilter)
    }

    // Sort
    switch (customerSort) {
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'orders_desc':
        result.sort((a, b) => b.orderCount - a.orderCount)
        break
      case 'created_desc':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
    }

    return result
  }, [customers, customerSearch, customerTypeFilter, customerSort])

  const addCustomer = async () => {
    try {
      const name = document.getElementById('name').value
      const email = document.getElementById('email').value
      const phone = document.getElementById('phone').value
      const type = document.getElementById('type').value
      const address = document.getElementById('address').value
      const note = document.getElementById('note').value

      if (!name || !email || !phone) {
        toast({
          title: "Lỗi",
          description: "Vui lòng điền đầy đủ thông tin bắt buộc",
          variant: "destructive",
        })
        return
      }

      const newCustomer = {
        name,
        email,
        phone,
        type: type || 'normal',
        status: 'active',
        createdAt: new Date().toISOString(),
        orderCount: 0,
        totalSpent: 0,
        avatar: "",
        address,
        note
      }

      await addDoc(collection(db, 'customers'), newCustomer)

      setShowAddCustomer(false)
      toast({
        title: "Thành công",
        description: "Đã thêm khách hàng mới",
      })
    } catch (error) {
      console.error('Error adding customer:', error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm khách hàng. Vui lòng thử lại",
        variant: "destructive",
      })
    }
  }

  return (
    <>
  
    <div className="container mx-auto p-4 space-y-4">
    <h1 className="text-3xl font-bold mb-6">Quản lý bán hàng (Hệ thống thử nghiệm)</h1>
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
        <div className="space-y-4 p-2 md:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
                            <TableCell className="text-center hidden md:table-cell">120</TableCell>
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
                        {filteredCustomersList.map(customer => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>{customer.name}</SelectItem>
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

                  <div>
                    <Label>Ghi chú</Label>
                    <Input
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="Nhập ghi chú cho đơn hàng..."
                    />
                  </div>

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
      </TabsContent>
      <TabsContent value="orders">
        <div className="space-y-4">
          {/* Phần Filter và Tìm kiếm */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Quản lý đơn hàng</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Tìm kiếm</Label>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <Input 
                      placeholder="Tìm theo mã đơn, khách hng..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Trạng thái</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="pending">Chờ xử lý</SelectItem>
                      <SelectItem value="processing">Đang xử lý</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Từ ngày</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Đến ngày</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Phần Thống kê nhanh */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold">{filteredOrders.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Chờ xử lý</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {filteredOrders.filter(order => order.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Hoàn thành</p>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredOrders.filter(order => order.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Doanh thu</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {filteredOrders
                        .filter(order => order.status === 'completed')
                        .reduce((sum, order) => sum + order.total, 0)
                        .toLocaleString('vi-VN')} VNĐ
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bảng đơn hàng */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Tổng tiền</TableHead>
                      <TableHead>Trạng thi</TableHead>
                      <TableHead>Thanh toán</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>
                          {customers.find(c => c.id.toString() === order.customer)?.name}
                          <span className="block text-sm text-gray-500">
                            {customers.find(c => c.id.toString() === order.customer)?.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(order.date).toLocaleDateString('vi-VN')}
                          <span className="block text-sm text-gray-500">
                            {new Date(order.date).toLocaleTimeString('vi-VN')}
                          </span>
                        </TableCell>
                        <TableCell>{order.total.toLocaleString('vi-VN')} VNĐ</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentBadgeVariant(order.paymentMethod)}>
                            {getPaymentMethodText(order.paymentMethod)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => viewOrderDetails(order.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => printOrder(order.id)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => updateOrderStatus(order.id)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={printSelectedOrders} disabled={selectedOrders.length === 0}>
                  <Printer className="h-4 w-4 mr-2" />
                  In {selectedOrders.length} đơn đã chọn
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} disabled={filteredOrders.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Xuất Excel
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Modal xem chi tiết đơn hàng */}
          {selectedOrder && (
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-bold">
                      Đơn hàng #{selectedOrder.id}
                    </DialogTitle>
                    <DialogDescription>
                      Tạo ngày {new Date(selectedOrder.date).toLocaleString('vi-VN')}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="px-4 py-1 text-base">
                      {getStatusText(selectedOrder.status)}
                    </Badge>
                    <Badge variant={getPaymentBadgeVariant(selectedOrder.paymentMethod)} className="px-4 py-1">
                      {getPaymentMethodText(selectedOrder.paymentMethod)}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-12 gap-6 py-6">
                {/* Thông tin chung - 4 cột */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                  {/* Thông tin khách hàng */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">
                          Thông tin khách hàng
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={customers.find(c => c.id.toString() === selectedOrder.customer)?.avatar} />
                          <AvatarFallback>
                            {customers.find(c => c.id.toString() === selectedOrder.customer)?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {customers.find(c => c.id.toString() === selectedOrder.customer)?.name}
                          </p>
                          <p className="text-sm text-gray-500">Khách hàng thân thiết</p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{customers.find(c => c.id.toString() === selectedOrder.customer)?.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{customers.find(c => c.id.toString() === selectedOrder.customer)?.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{customers.find(c => c.id.toString() === selectedOrder.customer)?.address}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Thông tin thanh toán */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Chi tiết thanh toán</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Tạm tính</span>
                          <span>{(selectedOrder?.subtotal || 0).toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Giảm giá</span>
                          <span className="text-red-500">-{selectedOrder.discount.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">VAT (10%)</span>
                          <span>{selectedOrder.tax.toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Phí vận chuyển</span>
                          <span>{(selectedOrder.shippingFee || 0).toLocaleString('vi-VN')} VNĐ</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Tổng cộng</span>
                        <span className="text-lg">{selectedOrder.total.toLocaleString('vi-VN')} VNĐ</span>
                      </div>
                      <div className="pt-2">
                        <Label className="text-sm text-gray-500">Phương thức thanh toán</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          {selectedOrder.paymentMethod === 'card' && <CreditCard className="h-4 w-4" />}
                          {selectedOrder.paymentMethod === 'cash' && <Banknote className="h-4 w-4" />}
                          {selectedOrder.paymentMethod === 'bank_transfer' && <Building2 className="h-4 w-4" />}
                          {selectedOrder.paymentMethod === 'momo' && <Smartphone className="h-4 w-4" />}
                          <span>{getPaymentMethodText(selectedOrder.paymentMethod)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Danh sách sản phẩm và cập nhật trạng thái - 8 cột */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {/* Danh sách sản phẩm */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold">Danh sách sản phẩm</CardTitle>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {selectedOrder.items.length} sản phẩm
                          </span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-sm text-gray-500">
                            Tổng SL: {selectedOrder.items.reduce((acc, item) => acc + item.quantity, 0)}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox 
                                checked={selectedOrder.items.every(item => 
                                  orderPreparationStatus[`${selectedOrder.id}-${item.id}`]
                                )}
                                onCheckedChange={(checked) => {
                                  const newStatus = {...orderPreparationStatus}
                                  selectedOrder.items.forEach(item => {
                                    newStatus[`${selectedOrder.id}-${item.id}`] = checked
                                  })
                                  setOrderPreparationStatus(newStatus)
                                }}
                              />
                            </TableHead>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead className="text-center">Đơn giá</TableHead>
                            <TableHead className="text-center">SL</TableHead>
                            <TableHead className="text-center">Điều chỉnh</TableHead>
                            <TableHead className="text-right">Thành tiền</TableHead>
                            <TableHead className="text-center">Trạng thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Checkbox 
                                  checked={orderPreparationStatus[`${selectedOrder.id}-${item.id}`] || false}
                                  onCheckedChange={(checked) => {
                                    setOrderPreparationStatus(prev => ({
                                      ...prev,
                                      [`${selectedOrder.id}-${item.id}`]: checked
                                    }))
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <img 
                                    src={item.image || '/placeholder.png'} 
                                    alt={item.name}
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                  <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-gray-500">{item.sku || 'SKU: N/A'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {(item?.price || 0).toLocaleString('vi-VN')} VNĐ
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">{item.quantity}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateOrderItemQuantity(selectedOrder.id, item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value)
                                      if (!isNaN(value) && value >= 1) {
                                        updateOrderItemQuantity(selectedOrder.id, item.id, value)
                                      }
                                    }}
                                    className="w-16 text-center"
                                    min="1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateOrderItemQuantity(selectedOrder.id, item.id, item.quantity + 1)}
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {((item?.price || 0) * (item?.quantity || 0)).toLocaleString('vi-VN')} VNĐ
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center">
                                  {orderPreparationStatus[`${selectedOrder.id}-${item.id}`] ? (
                                    <Badge variant="success" className="w-28">Đã chuẩn bị</Badge>
                                  ) : (
                                    <Badge variant="warning" className="w-28">Chưa chuẩn bị</Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={5}>Tổng cộng</TableCell>
                            <TableCell className="text-right font-bold">
                              {(selectedOrder?.items?.reduce((sum, item) => 
                                sum + ((item?.price || 0) * (item?.quantity || 0)), 0) || 0).toLocaleString('vi-VN')} VNĐ
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Cập nhật trạng thái */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Cập nhật trạng thái</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Trạng thái mới</Label>
                          <Select 
                            value={selectedOrder.status} 
                            onValueChange={(value) => {
                              setSelectedOrder(prev => ({...prev, status: value}))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Chờ xử lý</SelectItem>
                              <SelectItem value="processing">Đang xử lý</SelectItem>
                              <SelectItem value="shipping">Đang giao hàng</SelectItem>
                              <SelectItem value="completed">Hoàn thành</SelectItem>
                              <SelectItem value="cancelled">Đã hủy</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Người cập nhật</Label>
                          <Input value="Admin" disabled />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ghi chú cập nhật</Label>
                        <Textarea
                          placeholder="Nhập ghi chú cập nht..."
                          value={statusUpdateNote}
                          onChange={(e) => setStatusUpdateNote(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lịch sử cập nhật */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-semibold">Lịch sử cập nhật</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedOrder.history?.map((record, index) => (
                          <div key={index} className="flex items-start space-x-3 pb-4 last:pb-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                              <Clock className="h-4 w-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{record.updatedBy}</span>
                                <span className="text-sm text-gray-500">
                                  {new Date(record.date).toLocaleString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-gray-600 mt-1">{record.note}</p>
                              <Badge variant={getStatusBadgeVariant(record.status)} className="mt-2">
                                {getStatusText(record.status)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter className="border-t pt-4 space-x-2">
                <div className="flex-1 flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                    <X className="h-4 w-4 mr-2" />
                    Đóng
                  </Button>
                  <Button variant="outline" onClick={() => printOrder(selectedOrder.id)}>
                    <Printer className="h-4 w-4 mr-2" />
                    In đơn hàng
                  </Button>
                </div>
                <Button 
                  onClick={() => updateOrderStatus(selectedOrder.id, statusUpdateNote)}
                  disabled={!statusUpdateNote.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Cập nhật
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        )}
        </div>
      </TabsContent>
      <TabsContent value="customers">
        <div className="space-y-4">
          {/* Header với thống kê */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng khách hàng</p>
                    <p className="text-2xl font-bold">{customers.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Khách hàng mới</p>
                    <p className="text-2xl font-bold text-green-600">
                      {customers.filter(c => {
                        const createdDate = new Date(c.createdAt);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return createdDate >= thirtyDaysAgo;
                      }).length}
                    </p>
                  </div>
                  <UserPlus className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Khách hàng VIP</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {customers.filter(c => c.type === 'vip').length}
                    </p>
                  </div>
                  <Crown className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                  </div>
                  <ShoppingBag className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phần tìm kiếm và thêm mới */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quản lý khách hàng</CardTitle>
                <Button onClick={() => setShowAddCustomer(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm khách hàng
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <Label>Tìm kiếm</Label>
                  <div className="flex w-full items-center space-x-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input 
                      placeholder="Tìm theo tên, email, số điện thoại..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-[150px]">
                  <Label>Loại khách hàng</Label>
                  <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="normal">Thường</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label>Sắp xếp</Label>
                  <Select value={customerSort} onValueChange={setCustomerSort}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">Tên A-Z</SelectItem>
                      <SelectItem value="name_desc">Tên Z-A</SelectItem>
                      <SelectItem value="orders_desc">Đơn hàng nhiều nhất</SelectItem>
                      <SelectItem value="created_desc">Mới nhất</SelectItem>
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
                      <Checkbox 
                        checked={isAllCustomersSelected}
                        onCheckedChange={toggleSelectAllCustomers}
                      />
                    </TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Liên hệ</TableHead>
                    <TableHead className="text-center">Loại</TableHead>
                    <TableHead className="text-center">Đơn hàng</TableHead>
                    <TableHead className="text-right">Doanh số</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomersList.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={(checked) => toggleCustomerSelection(customer.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={customer.avatar} />
                            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-gray-500">
                              Tham gia: {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{customer.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{customer.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {customer.type === 'vip' ? (
                          <Badge variant="purple">
                            <Crown className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Thường</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <p className="font-medium">{customer.orderCount}</p>
                          <p className="text-sm text-gray-500">đơn hàng</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {(customer?.totalSpent || 0).toLocaleString('vi-VN')} VNĐ
                          </p>
                          <p className="text-sm text-gray-500">tổng chi tiêu</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewCustomerDetails(customer.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editCustomer(customer.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCustomer(customer.id)}
                          >
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
        </div>

        {/* Dialog thêm/sửa khách hàng */}
        <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Thêm khách hàng mới</DialogTitle>
              <DialogDescription>
                Điền thông tin khách hàng mới vào form dưới đây
              </DialogDescription>
            </DialogHeader>
            
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Họ tên</Label>
                  <Input id="name" placeholder="Nhập họ tên" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="example@email.com" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input id="phone" placeholder="Nhập số điện thoại" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Loại khách hàng</Label>
                  <Select>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Thường</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Textarea id="address" placeholder="Nhập địa chỉ" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Textarea id="note" placeholder="Nhập ghi chú" />
              </div>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
                Hủy
              </Button>
              <Button onClick={addCustomer}>
                Thêm khách hàng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>
      <TabsContent value="products">
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
                      <SelectItem value="price_asc">Giá tăng dần</SelectItem>
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
                            <p className="text-sm text-gray-500">{product.sku || 'SKU: N/A'}</p>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewCustomerDetails(customer.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editCustomer(customer.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCustomer(customer.id)}
                          >
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

          {/* Quản lý danh mục */}
          <Card>
            <CardHeader>
              <CardTitle>Quản lý danh mục</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Tên danh mục mới" id="newCategory" />
                  <Button onClick={() => addCategory(document.getElementById('newCategory').value)}>
                    Thêm danh mục
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {categories.map(category => (
                    <Card key={category.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
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
        </div>
      </TabsContent>
    </Tabs>

    {/* Thêm vào phần return, ngay trước đóng TabsContent */}
<Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
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
              onError={(e) => e.target.src = '/placeholder.png'}
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
      <Button variant="outline" onClick={() => setShowAddProduct(false)}>
        Hủy
      </Button>
      <Button onClick={() => {
        addProduct()
        setShowAddProduct(false)
      }}>
        Thêm sản phẩm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

  </div>
  </>
  )
}