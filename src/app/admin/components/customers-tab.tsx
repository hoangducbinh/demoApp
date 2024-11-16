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
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore'
import AddCustomerDialog from './add-customer-dialog'
import CustomerDetailsDialog from './customer-details-dialog'



export default function CustomersTab() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name_asc")
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setCustomers(customersData)
    })

    return () => unsubscribe()
  }, [])

  const handleDeleteCustomer = async (customerId) => {
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

  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'name_desc':
          return b.name.localeCompare(a.name)
        case 'orders_desc':
          return (b.orderCount || 0) - (a.orderCount || 0)
        case 'spent_desc':
          return (b.totalSpent || 0) - (a.totalSpent || 0)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Tổng khách hàng</p>
                <p className="text-2xl font-bold">{getTotalCustomers()}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
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
          <div className="flex items-center justify-between">
            <CardTitle>Danh sách khách hàng</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Xuất Excel
              </Button>
              <Button onClick={() => setShowAddCustomer(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Thêm khách hàng
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Tìm kiếm</Label>
              <div className="flex w-full items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Tìm theo tên, email, số điện thoại..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Sắp xếp</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn cách sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Tên A-Z</SelectItem>
                  <SelectItem value="name_desc">Tên Z-A</SelectItem>
                  <SelectItem value="orders_desc">Đơn hàng nhiều nhất</SelectItem>
                  <SelectItem value="spent_desc">Chi tiêu nhiều nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
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
                      <Badge variant={customer.orderCount > 0 ? "success" : "secondary"}>
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
      />
    </div>
  )
} 