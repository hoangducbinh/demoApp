'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { 
  Printer, 
  Send, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Download,
  Plus,
  Minus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { Checkbox } from "@/components/ui/checkbox"
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const ORDER_STATUS = {
  pending: { 
    label: 'Chờ xử lý', 
    color: 'default',
    icon: Clock,
    description: 'Đơn hàng đang chờ xác nhận'
  },
  confirmed: { 
    label: 'Đã xác nhận', 
    color: 'primary',
    icon: CheckCircle2,
    description: 'Đơn hàng đã được xác nhận'
  },
  shipping: { 
    label: 'Đang giao', 
    color: 'warning',
    icon: Truck,
    description: 'Đơn hàng đang được giao'
  },
  completed: { 
    label: 'Hoàn thành', 
    color: 'success',
    icon: Package,
    description: 'Đơn hàng đã giao thành công'
  },
  cancelled: { 
    label: 'Đã hủy', 
    color: 'destructive',
    icon: XCircle,
    description: 'Đơn hàng đã bị hủy'
  }
}

const PAYMENT_METHODS = {
  cod: { label: 'Thanh toán khi nhận hàng', icon: CreditCard },
  cash: { label: 'Tiền mặt', icon: CreditCard },
  bank_transfer: { label: 'Chuyển khoản', icon: CreditCard },
  momo: { label: 'Ví MoMo', icon: CreditCard },
  vnpay: { label: 'VNPay', icon: CreditCard },
}

// Thêm constant cho trạng thái thanh toán
const PAYMENT_STATUS = {
  cod: { label: 'Thanh toán khi nhận hàng', color: 'warning' },
  pending: { label: 'Chờ thanh toán', color: 'warning' },
  paid: { label: 'Đã thanh toán', color: 'success' },
  failed: { label: 'Thanh toán thất bại', color: 'destructive' },
  refunded: { label: 'Đã hoàn tiền', color: 'default' }
}

// Thêm interface cho Customer
interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

// Cập nhật interface OrderItem
interface OrderItem {
  isPrepared: boolean
  id: string
  name: string
  price: number
  quantity: number,
  image: string
}

// Cập nhật interface OrderHistory
interface OrderHistory {
  date: string
  status: string
  note: string
  updatedBy: string
}

// Cập nhật interface OrderDetailsDialogProps
interface OrderDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: {
    id: string
    customer: string
    customerData?: {
      id: string
      name: string
      email: string
      phone: string
      type: 'normal' | 'vip'
      status: 'active' | 'inactive'
      address: string
      avatar?: string
      note?: string
    }
    items: OrderItem[]
    subtotal: number
    discount: number
    tax: number
    total: number
    note: string
    paymentMethod: string
    status: string
    date: string
    isPrepared?: boolean
    history?: OrderHistory[]
  } | null
}

// Định nghĩa interface cho LocalOrder
interface LocalOrder {
  id?: string
  customer?: string
  customerData?: {
    id: string
    name: string
    email: string
    phone: string
    type: 'normal' | 'vip'
    status: 'active' | 'inactive'
    address: string
    avatar?: string
    note?: string
  }
  items: OrderItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  note?: string
  paymentMethod?: string
  status?: string
  date?: string
  isPrepared?: boolean
  history?: OrderHistory[]
}

const getPaymentStatus = (order: any) => {
  if (order.status === 'cancelled') return 'failed'
  if (order.status === 'completed') return 'paid'
  if (order.paymentMethod === 'cod' || order.paymentMethod === 'cash' || order.paymentMethod === 'transfer') {
    return order.status === 'completed' ? 'paid' : 'pending'
  }
  // Các phương thức thanh toán online
  if (['momo', 'vnpay', 'bank_transfer'].includes(order.paymentMethod)) {
    return order.status === 'pending' ? 'pending' : 'paid'
  }
  return 'pending'
}

export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: OrderDetailsDialogProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")
  const [localOrder, setLocalOrder] = useState<LocalOrder>(order || {
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0
  })
  const [isPrepared, setIsPrepared] = useState(order?.isPrepared || false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [preparedItems, setPreparedItems] = useState<{ [key: string]: boolean }>(
    order?.items?.reduce((acc, item) => ({
      ...acc,
      [item.id]: item.isPrepared || false
    }), {}) || {}
  )
  const [currentUser, setCurrentUser] = useState<string>("Admin")

  useEffect(() => {
    if (order) {
      setLocalOrder(order)
    }
  }, [order])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.displayName) {
          setCurrentUser(user.displayName)
        } else if (user.email) {
          // Lấy phần trước @gmail.com và capitalize chữ cái đầu
          const username = user.email.split('@')[0]
          const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1)
          setCurrentUser(capitalizedUsername)
        }
      }
    })

    return () => unsubscribe()
  }, [])

  if (!order) return null

  const StatusIcon = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.icon || AlertCircle
  const PaymentIcon = PAYMENT_METHODS[order.paymentMethod as keyof typeof PAYMENT_METHODS]?.icon || CreditCard

  const updateOrderStatus = async () => {
    if (!order || !newStatus) return
    
    try {
      setIsUpdating(true)
      const orderRef = doc(db, 'orders', order.id)
      
      const updatedHistory = [
        ...(order.history || []),
        {
          date: new Date().toISOString(),
          status: newStatus,
          note: statusNote || `Đơn hàng được chuyển sang trạng thái ${ORDER_STATUS[newStatus as keyof typeof ORDER_STATUS]?.label.toLowerCase()}`,
          updatedBy: currentUser // Sử dụng currentUser thay vì "Admin"
        }
      ]

      await updateDoc(orderRef, {
        status: newStatus,
        history: updatedHistory
      })

      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái đơn hàng đã được cập nhật"
      })

      setNewStatus("")
      setStatusNote("")
    } catch (error) {
      console.error('Error updating order status:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái đơn hàng",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1 || !localOrder) return

    const updatedItems = localOrder.items.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    )

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = subtotal * 0.1
    const total = subtotal - (localOrder.discount || 0) + tax

    setLocalOrder(prev => ({
      ...prev,
      items: updatedItems,
      subtotal,
      tax,
      total,
    }))

    setIsUpdating(true)
    try {
      const orderRef = doc(db, 'orders', order.id)
      await updateDoc(orderRef, {
        items: updatedItems,
        subtotal,
        tax,
        total
      })

      toast({
        title: "Cập nhật thành công",
        description: "Số lượng sản phẩm đã được cập nhật"
      })
    } catch (error) {
      setLocalOrder(order)
      console.error('Error updating quantity:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật số lượng sản phẩm",
        variant: "destructive"
      })
    }
    setIsUpdating(false)
  }

  const updatePreparedStatus = async (checked: boolean) => {
    setIsUpdating(true)
    try {
      const orderRef = doc(db, 'orders', order.id)
      await updateDoc(orderRef, {
        isPrepared: checked,
        history: [
          ...(order.history || []),
          {
            date: new Date().toISOString(),
            status: order.status,
            note: checked ? "Đã chuẩn bị hàng" : "Hủy chuẩn bị hàng",
            updatedBy: currentUser // Thay thế Admin bằng currentUser
          }
        ]
      })

      setIsPrepared(checked)
      toast({
        title: checked ? "Đã chuẩn bị hàng" : "Đã hủy chuẩn bị hàng",
        description: checked ? "Đơn hàng đã được chuẩn bị xong" : "Đã hủy trạng thái chuẩn bị hàng"
      })
    } catch (error) {
      console.error('Error updating prepared status:', error)
      setIsPrepared(!checked) // rollback
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái chuẩn bị hàng",
        variant: "destructive"
      })
    }
    setIsUpdating(false)
  }

  const updateItemPrepared = async (itemId: string, checked: boolean) => {
    setIsUpdating(true)
    try {
      const orderRef = doc(db, 'orders', order.id)
      const updatedItems = localOrder.items.map(item => 
        item.id === itemId ? { ...item, isPrepared: checked } : item
      )

      await updateDoc(orderRef, {
        items: updatedItems,
        history: [
          ...(order.history || []),
          {
            date: new Date().toISOString(),
            status: order.status,
            note: `${checked ? "Đã chuẩn bị" : "Hủy chuẩn bị"} sản phẩm: ${updatedItems.find(i => i.id === itemId)?.name}`,
            updatedBy: currentUser // Thay thế Admin bằng currentUser
          }
        ]
      })

      setPreparedItems(prev => ({
        ...prev,
        [itemId]: checked
      }))

      toast({
        title: "Cập nhật thành công",
        description: checked ? "Đã đánh dấu sản phẩm đã chuẩn bị" : "Đã hủy đánh dấu sản phẩm"
      })
    } catch (error) {
      console.error('Error updating item prepared status:', error)
      setPreparedItems(prev => ({
        ...prev,
        [itemId]: !checked
      }))
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái sản phẩm",
        variant: "destructive"
      })
    }
    setIsUpdating(false)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(localOrder.items.map(item => item.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId])
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId))
    }
  }

  const updateSelectedItemsPrepared = async (checked: boolean) => {
    if (selectedItems.length === 0) return

    const newPreparedItems = { ...preparedItems }
    selectedItems.forEach(itemId => {
      newPreparedItems[itemId] = checked
    })
    setPreparedItems(newPreparedItems)

    setIsUpdating(true)
    try {
      const orderRef = doc(db, 'orders', order.id)
      const updatedItems = localOrder.items.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, isPrepared: checked }
          : item
      )

      await updateDoc(orderRef, {
        items: updatedItems,
        history: [
          ...(order.history || []),
          {
            date: new Date().toISOString(),
            status: order.status,
            note: `${checked ? "Đã chuẩn bị" : "Hủy chuẩn bị"} ${selectedItems.length} sản phẩm`,
            updatedBy: "Admin"
          }
        ]
      })

      toast({
        title: "Cập nhật thành công",
        description: `Đã ${checked ? "đánh dấu" : "bỏ đánh dấu"} ${selectedItems.length} sản phẩm`
      })
      
      setSelectedItems([])
    } catch (error) {
      setPreparedItems(preparedItems)
      console.error('Error updating items prepared status:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái sản phẩm",
        variant: "destructive"
      })
    }
    setIsUpdating(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl md:text-2xl">
                Đơn hàng #{order.id}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(order.date).toLocaleString('vi-VN')}</span>
                <ChevronRight className="w-4 h-4" />
                <Badge variant={ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.color as "default" | "destructive" | "outline" | "secondary"}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.label}
                </Badge>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="flex-1 md:flex-none">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Tải PDF</span>
                <span className="md:hidden">PDF</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 md:flex-none">
                <Printer className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">In đơn hàng</span>
                <span className="md:hidden">In</span>
              </Button>
              <Button size="sm" className="flex-1 md:flex-none">
                <Send className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">Gửi email</span>
                <span className="md:hidden">Email</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-6">
          {/* Customer & Payment Info */}
          <div className="space-y-4">
            {/* Customer Info */}
            <div>
              <Label className="text-base font-semibold">Thông tin khách hàng</Label>
              <div className="mt-2 p-3 md:p-4 border rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  {order.customerData?.avatar ? (
                    <img 
                      src={order.customerData.avatar} 
                      alt={order.customerData.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{order.customerData?.name}</div>
                    <div className="text-sm text-gray-500">
                      <Badge variant={order.customerData?.type === 'vip' ? 'default' : 'secondary'}>
                        {order.customerData?.type === 'vip' ? 'Khách VIP' : 'Khách thường'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{order.customerData?.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{order.customerData?.email}</span>
                </div>
                <div className="flex items-start space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                  <span>{order.customerData?.address}</span>
                </div>
                {order.customerData?.note && (
                  <div className="flex items-start space-x-2 text-gray-600">
                    <AlertCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                    <span>{order.customerData.note}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Note */}
            {order.note && (
              <div>
                <Label className="text-base font-semibold">Ghi chú đơn hàng</Label>
                <div className="mt-2 p-3 md:p-4 border rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-600">{order.note}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div>
              <Label className="text-base font-semibold">Thông tin thanh toán</Label>
              <div className="mt-2 p-3 md:p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {React.createElement(PAYMENT_METHODS[order.paymentMethod as keyof typeof PAYMENT_METHODS]?.icon || CreditCard, {
                      className: "w-4 h-4 text-gray-500"
                    })}
                    <span>Phương thức:</span>
                  </div>
                  <span className="font-medium">
                    {PAYMENT_METHODS[order.paymentMethod as keyof typeof PAYMENT_METHODS]?.label || 'Không xác định'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Trạng thái:</span>
                  <Badge variant={PAYMENT_STATUS[getPaymentStatus(order)]?.color as "destructive" | "default" | "outline" | "secondary"}>
                    {PAYMENT_STATUS[getPaymentStatus(order)]?.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="md:col-span-2 space-y-4">
            {/* Products Table */}
            <div>
              <Label className="text-base font-semibold">Chi tiết sản phẩm</Label>
              <div className="mt-2 border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedItems.length === localOrder.items.length}
                          onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                          disabled={isUpdating}
                        />
                      </TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-center">SL</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                            disabled={isUpdating}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex-shrink-0">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="h-full w-full object-cover rounded-md"
                                />
                              ) : (
                                <Package className="h-5 w-5 m-auto text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{item.name}</div>
                              {preparedItems[item.id] && (
                                <Badge variant="default" className="text-xs mt-1">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Đã chuẩn bị
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {item.price.toLocaleString('vi-VN')}đ
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              disabled={isUpdating || item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              disabled={isUpdating}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính:</span>
                <span>{(localOrder?.subtotal || 0).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Giảm giá:</span>
                <span>-{(localOrder?.discount || 0).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT (10%):</span>
                <span>{(localOrder?.tax || 0).toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Tổng cộng:</span>
                <span>{(localOrder?.total || 0).toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>

            {/* Order Status Updates */}
            <div className="space-y-4">
              {/* Order Status Update */}
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="prepared"
                  checked={isPrepared}
                  onCheckedChange={updatePreparedStatus}
                  disabled={isUpdating}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="prepared"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Đã chuẩn bị hàng
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {isPrepared 
                      ? "Đơn hàng đã được chuẩn bị xong và sẵn sàng giao" 
                      : "Đơn hàng chưa được chuẩn bị"
                    }
                  </p>
                </div>
                {isPrepared && (
                  <Badge variant="secondary" className="ml-auto">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Đã chuẩn bị
                  </Badge>
                )}
              </div>
              {/* Order Status Update */}
              <div>
                <Label className="text-base font-semibold">Cập nhật trạng thái</Label>
                <div className="mt-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái mới" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ORDER_STATUS).map(([value, { label }]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={updateOrderStatus} 
                      disabled={isUpdating}
                    >
                      Cập nhật
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Ghi chú cập nhật trạng thái..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Order History */}
            <div>
              <Label className="text-base font-semibold">Lịch sử đơn hàng</Label>
              <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto">
                {order.history?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="mt-1">
                      {React.createElement(ORDER_STATUS[event.status as keyof typeof ORDER_STATUS]?.icon || AlertCircle, {
                        className: "w-5 h-5 text-gray-400"
                      })}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={ORDER_STATUS[event.status as keyof typeof ORDER_STATUS]?.color as "default" | "destructive" | "secondary" | "outline"}>
                          {ORDER_STATUS[event.status as keyof typeof ORDER_STATUS]?.label}
                        </Badge>
                        <span className="text-gray-500">
                          {new Date(event.date).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-gray-600">{event.note}</p>
                      <p className="text-xs text-gray-500">Cập nhật bởi: {event.updatedBy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full md:w-auto">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 