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
  cash: { label: 'Tiền mặt', icon: CreditCard },
  bank_transfer: { label: 'Chuyển khoản', icon: CreditCard },
  momo: { label: 'Ví MoMo', icon: CreditCard },
  vnpay: { label: 'VNPay', icon: CreditCard },
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
  id: string
  name: string
  price: number
  quantity: number
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
  }
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
}

export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
  customerData
}: OrderDetailsDialogProps) {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")
  const [localOrder, setLocalOrder] = useState(order || {
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

  useEffect(() => {
    if (order) {
      setLocalOrder(order)
    }
  }, [order])

  if (!order) return null

  const StatusIcon = ORDER_STATUS[order.status]?.icon || AlertCircle
  const PaymentIcon = PAYMENT_METHODS[order.paymentMethod]?.icon || CreditCard

  const updateOrderStatus = async () => {
    if (!newStatus || !statusNote) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn trạng thái và nhập ghi chú",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)
    try {
      const orderRef = doc(db, 'orders', order.id)
      const newHistory = [
        ...(order.history || []),
        {
          status: newStatus,
          note: statusNote,
          date: new Date().toISOString(),
          updatedBy: "Admin" // Thay thế bằng thông tin người dùng thực
        }
      ]

      await updateDoc(orderRef, {
        status: newStatus,
        history: newHistory
      })

      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái đơn hàng đã được cập nhật"
      })

      setNewStatus("")
      setStatusNote("")
    } catch (error) {
      console.error('Error updating order:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái đơn hàng",
        variant: "destructive"
      })
    }
    setIsUpdating(false)
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
      total
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
            updatedBy: "Admin" // Thay thế bằng thông tin người dùng thực
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
            updatedBy: "Admin"
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
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">
                Đơn hàng #{order.id}
              </DialogTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{new Date(order.date).toLocaleString('vi-VN')}</span>
                <ChevronRight className="w-4 h-4" />
                <Badge variant={ORDER_STATUS[order.status]?.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {ORDER_STATUS[order.status]?.label}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Tải PDF
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                In đơn hàng
              </Button>
              <Button size="sm">
                <Send className="w-4 h-4 mr-2" />
                Gửi email
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 mt-6">
          {/* Thông tin khách hàng */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Thông tin khách hàng</Label>
              <div className="mt-2 p-4 border rounded-lg space-y-3">
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
                      <Badge variant={order.customerData?.type === 'vip' ? 'success' : 'secondary'}>
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

            {/* Thông tin thanh toán */}
            <div>
              <Label className="text-base font-semibold">Thông tin thanh toán</Label>
              <div className="mt-2 p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PaymentIcon className="w-4 h-4 text-gray-500" />
                    <span>Phương thức:</span>
                  </div>
                  <span className="font-medium">
                    {PAYMENT_METHODS[order.paymentMethod]?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Trạng thái:</span>
                  <Badge variant="success">Đã thanh toán</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Chi tiết đơn hàng */}
          <div className="col-span-2 space-y-6">
            {/* Sản phẩm */}
            <div>
              <Label className="text-base font-semibold">Chi tiết sản phẩm</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
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
                      <TableHead className="text-center">Số lượng</TableHead>
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
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="h-full w-full object-cover rounded-md"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium flex items-center space-x-2">
                                <span>{item.name}</span>
                                {preparedItems[item.id] && (
                                  <Badge variant="success" className="text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Đã chuẩn bị
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.price.toLocaleString('vi-VN')} VNĐ
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              disabled={isUpdating || item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              disabled={isUpdating}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(item.price * item.quantity).toLocaleString('vi-VN')} VNĐ
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tổng tiền */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
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
            

            {/* Chuẩn bị hàng */}
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
      <Badge variant="success" className="ml-auto">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Đã chuẩn bị
      </Badge>
    )}
  </div>
            {/* Cập nhật trạng thái */}
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

            {/* Lịch sử đơn hàng */}
            <div>
              <Label className="text-base font-semibold">Lịch sử đơn hàng</Label>
              <div className="mt-2 space-y-3">
                {order.history?.map((event, index) => (
                  <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="mt-1">
                      {React.createElement(ORDER_STATUS[event.status]?.icon || AlertCircle, {
                        className: "w-5 h-5 text-gray-400"
                      })}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={ORDER_STATUS[event.status]?.color}>
                          {ORDER_STATUS[event.status]?.label}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 