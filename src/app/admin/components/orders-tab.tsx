'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, FileSpreadsheet, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore'
import OrderDetailsDialog from './order-details-dialog'


const ORDER_STATUS = {
  pending: { label: 'Chờ xử lý', color: 'default' },
  confirmed: { label: 'Đã xác nhận', color: 'primary' },
  shipping: { label: 'Đang giao', color: 'warning' },
  completed: { label: 'Hoàn thành', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'destructive' }
}

export default function OrdersTab() {
  const { toast } = useToast()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  useEffect(() => {
    const fetchOrders = async () => {
      const q = query(collection(db, 'orders'), orderBy('date', 'desc'))
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const ordersData = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const orderData = docSnapshot.data()
            const customerRef = doc(db, 'customers', orderData.customer)
            const customerDoc = await getDoc(customerRef)
            const customerData = customerDoc.exists() ? customerDoc.data() : null

            return {
              id: docSnapshot.id,
              ...orderData,
              customerData: customerData ? {
                id: customerDoc.id,
                ...customerData
              } : null
            }
          })
        )
        setOrders(ordersData)
      })

      return () => unsubscribe()
    }

    fetchOrders()
  }, [])

  const filteredOrders = orders.filter(order => {
    let matchesSearch = true
    let matchesStatus = true
    let matchesDate = true

    // Search filter
    if (searchTerm) {
      matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerData?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    }

    // Status filter
    if (statusFilter !== 'all') {
      matchesStatus = order.status === statusFilter
    }

    // Date filter
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.date)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      switch (dateFilter) {
        case 'today':
          matchesDate = orderDate.toDateString() === today.toDateString()
          break
        case 'yesterday':
          matchesDate = orderDate.toDateString() === yesterday.toDateString()
          break
        case 'week':
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          matchesDate = orderDate >= weekAgo
          break
        case 'month':
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          matchesDate = orderDate >= monthAgo
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const getTotalRevenue = (orders) => {
    return orders.reduce((sum, order) => sum + (order.total || 0), 0)
  }

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status).length
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng đơn hàng</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500">Doanh thu</p>
                <p className="text-xl font-bold text-green-600">
                  {getTotalRevenue(orders).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-gray-500">Chờ xử lý</p>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold">{getOrdersByStatus('pending')}</p>
              <Badge>{((getOrdersByStatus('pending') / orders.length) * 100).toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-gray-500">Đang giao</p>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold">{getOrdersByStatus('shipping')}</p>
              <Badge variant="warning">{((getOrdersByStatus('shipping') / orders.length) * 100).toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-gray-500">Hoàn thành</p>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold">{getOrdersByStatus('completed')}</p>
              <Badge variant="success">{((getOrdersByStatus('completed') / orders.length) * 100).toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách đơn hàng</CardTitle>
            <Button variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Xuất Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>Tìm kiếm</Label>
              <div className="flex w-full items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Tìm theo mã đơn hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                  {Object.entries(ORDER_STATUS).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Thời gian</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thời gian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="yesterday">Hôm qua</SelectItem>
                  <SelectItem value="week">7 ngày qua</SelectItem>
                  <SelectItem value="month">30 ngày qua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn hàng</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Ngày đặt</TableHead>
                  <TableHead>Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.customerData?.name}</TableCell>
                    <TableCell>
                      {new Date(order.date).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {order.total?.toLocaleString('vi-VN')} VNĐ
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS[order.status]?.color}>
                        {ORDER_STATUS[order.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowOrderDetails(true)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OrderDetailsDialog
        open={showOrderDetails}
        onOpenChange={setShowOrderDetails}
        order={selectedOrder}
      />
    </div>
  )
} 