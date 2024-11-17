'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  FileSpreadsheet, 
  UserPlus, 
  Users, 
  ShoppingBag, 
  DollarSign,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where, addDoc, updateDoc, getDocs } from 'firebase/firestore'
import AddCustomerDialog from './add-customer-dialog'
import CustomerDetailsDialog from './customer-details-dialog'

interface CustomerOrder {
  id: string
  total: number
  date: string
  status: string
}

interface Customer {
  orderCount: number
  id: string
  name: string
  email: string
  phone: string
  type: 'normal' | 'vip'
  status: 'active' | 'inactive'
  address: string
  avatar?: string
  note?: string
  createdAt: string
  orders?: CustomerOrder[]
  totalSpent?: number
  lastOrder?: string
}

interface CustomerFormData {
  name: string
  email: string
  phone: string
  type: 'normal' | 'vip'
  status: 'active' | 'inactive'
  address: string
  note?: string
}

interface CustomerStats {
  total: number
  active: number
  vip: number
  newThisMonth: number
}

export default function CustomersTab() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<'all' | 'normal' | 'vip'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastOrder'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)

  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    type: 'normal',
    status: 'active',
    address: '',
    note: ''
  })

  useEffect(() => {
    const fetchCustomers = async () => {
      const q = query(collection(db, 'customers'))
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const customersData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const customer = doc.data() as Omit<Customer, 'id'>
            const ordersQuery = query(
              collection(db, 'orders'),
              where('customer', '==', doc.id),
              orderBy('date', 'desc')
            )
            const ordersSnapshot = await getDocs(ordersQuery)
            const orders = ordersSnapshot.docs.map(orderDoc => ({
              id: orderDoc.id,
              ...orderDoc.data()
            })) as CustomerOrder[]

            const totalSpent = orders.reduce((sum, order) => sum + order.total, 0)
            const lastOrder = orders[0]?.date || null

            return {
              id: doc.id,
              ...customer,
              orders,
              totalSpent,
              lastOrder
            } as Customer
          })
        )
        setCustomers(customersData)
      })

      return () => unsubscribe()
    }

    fetchCustomers()
  }, [])

  const getCustomerStats = (customers: Customer[]): CustomerStats => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      vip: customers.filter(c => c.type === 'vip').length,
      newThisMonth: customers.filter(c => 
        new Date(c.createdAt) >= firstDayOfMonth
      ).length
    }
  }

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const newCustomer: Omit<Customer, 'id'> = {
        ...formData,
        createdAt: new Date().toISOString(),
        totalSpent: 0,
        orderCount: 0
      }

      const docRef = await addDoc(collection(db, 'customers'), newCustomer)
      
      toast({
        title: "Thêm khách hàng thành công",
        description: `Đã thêm khách hàng ${formData.name}`
      })

      setShowAddCustomer(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        type: 'normal',
        status: 'active',
        address: '',
        note: ''
      })
    } catch (error) {
      console.error('Error adding customer:', error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm khách hàng",
        variant: "destructive"
      })
    }
    setIsLoading(false)
  }

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    try {
      const customerRef = doc(db, 'customers', customerId)
      await updateDoc(customerRef, updates)
      
      toast({
        title: "Cập nhật thành công",
        description: "Thông tin khách hàng đã được cập nhật"
      })
    } catch (error) {
      console.error('Error updating customer:', error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật thông tin khách hàng",
        variant: "destructive"
      })
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
      try {
        await deleteDoc(doc(db, 'customers', customerId))
        toast({
          title: "Đã xóa khách hàng",
          description: "Khách hàng đã được xóa thành công.",
        })
      } catch (error) {
        console.error('Error deleting customer:', error)
        toast({
          title: "Lỗi",
          description: "Không thể xóa khách hàng. Vui lòng thử lại.",
          variant: "destructive",
        })
      }
    }
  }

  const fetchCustomerOrders = async (customerId: string) => {
    const q = query(
      collection(db, 'orders'),
      where('customer', '==', customerId),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CustomerOrder[]
      setCustomerOrders(ordersData)
    })

    return unsubscribe
  }

  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'totalSpent':
          return (b.totalSpent || 0) - (a.totalSpent || 0)
        case 'lastOrder':
          return (b.lastOrder || '').localeCompare(a.lastOrder || '')
        default:
          return 0
      }
    })

  const getTotalCustomers = () => customers.length
  const getActiveCustomers = () => customers.filter(c => c.orderCount > 0).length
  const getTotalRevenue = () => customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const getAverageOrderValue = () => {
    const totalOrders = customers.reduce((sum, c) => sum + (c.orderCount || 0), 0)
    return totalOrders > 0 ? getTotalRevenue() / totalOrders : 0
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Tổng khách hàng</p>
                <p className="text-lg md:text-2xl font-bold">{getTotalCustomers()}</p>
              </div>
              <Users className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Khách hàng đã mua</p>
                <p className="text-2xl font-bold text-blue-600">{getActiveCustomers()}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng doanh thu</p>
                <p className="text-2xl font-bold text-green-600">
                  {getTotalRevenue().toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Giá trị đơn TB</p>
                <p className="text-2xl font-bold text-purple-600">
                  {getAverageOrderValue().toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Danh sách khách hàng</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 md:flex-none">
                <FileSpreadsheet className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Xuất Excel</span>
              </Button>
              <Button 
                size="sm"
                onClick={() => setShowAddCustomer(true)}
                className="flex-1 md:flex-none"
              >
                <UserPlus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Thêm khách hàng</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label className="text-sm">Tìm kiếm</Label>
                <div className="flex w-full items-center space-x-2 mt-1">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-[200px]">
                <Label className="text-sm">Sắp xếp</Label>
                <Select 
                  value={sortBy} 
                  onValueChange={(value: "name" | "totalSpent" | "lastOrder") => setSortBy(value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Tên A-Z</SelectItem>
                    <SelectItem value="totalSpent">Tổng chi tiêu</SelectItem>
                    <SelectItem value="lastOrder">Đơn hàng mới</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile Customer List */}
            <div className="block md:hidden">
              {filteredCustomers.map(customer => (
                <Card key={customer.id} className="mb-2">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={customer.orderCount > 0 ? "default" : "secondary"}>
                            {customer.orderCount > 0 ? 'Đã mua hàng' : 'Chưa mua hàng'}
                          </Badge>
                          <Badge variant="secondary">{customer.orderCount || 0} đơn</Badge>
                        </div>
                        <p className="text-sm font-medium mt-2">
                          Tổng chi tiêu: {(customer.totalSpent || 0).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            fetchCustomerOrders(customer.id)
                            setShowCustomerDetails(true)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Liên hệ</TableHead>
                    <TableHead className="text-center">Số đơn hàng</TableHead>
                    <TableHead className="text-right">Tổng chi tiêu</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-500">ID: {customer.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">{customer.email}</p>
                          <p className="text-sm">{customer.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{customer.orderCount || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(customer.totalSpent || 0).toLocaleString('vi-VN')} VNĐ
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={customer.orderCount > 0 ? "default" : "secondary"}>
                          {customer.orderCount > 0 ? 'Đã mua hàng' : 'Chưa mua hàng'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCustomer(customer)
                              fetchCustomerOrders(customer.id)
                              setShowCustomerDetails(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddCustomerDialog
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
      />

      <CustomerDetailsDialog
        open={showCustomerDetails}
        onOpenChange={setShowCustomerDetails}
        customer={selectedCustomer}
        orders={customerOrders}
      />
    </div>
  )
} 