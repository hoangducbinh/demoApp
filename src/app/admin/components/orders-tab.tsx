'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, FileSpreadsheet, Eye, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore'
import OrderDetailsDialog from './order-details-dialog'
import { Checkbox } from "@/components/ui/checkbox"


const ORDER_STATUS = {
  pending: { label: 'Chờ xử lý', color: 'default' },
  confirmed: { label: 'Đã xác nhận', color: 'primary' },
  shipping: { label: 'Đang giao', color: 'warning' },
  completed: { label: 'Hoàn thành', color: 'success' },
  cancelled: { label: 'Đã hủy', color: 'destructive' }
}

// Thêm hàm chuyển số thành chữ
const numberToWords = (number) => {
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const positions = ["", "nghìn", "triệu", "tỷ"];

  if (number === 0) return "không";
  if (!number) return "";

  const readThreeDigits = (num) => {
    const hundred = Math.floor(num / 100);
    const ten = Math.floor((num % 100) / 10);
    const unit = num % 10;
    
    let result = "";
    
    if (hundred > 0) {
      result += digits[hundred] + " trăm ";
      if (ten === 0 && unit !== 0) {
        result += "lẻ ";
      }
    }
    
    if (ten > 0) {
      if (ten === 1) {
        result += "mười ";
      } else {
        result += digits[ten] + " mươi ";
      }
      
      if (unit === 1 && ten > 1) {
        result += "mốt";
      } else if (unit === 5 && ten >= 1) {
        result += "lăm";
      } else if (unit !== 0) {
        result += digits[unit];
      }
    } else if (unit > 0) {
      result += digits[unit];
    }
    
    return result.trim();
  };

  const groups = [];
  let tempNumber = Math.floor(Math.abs(number));
  
  while (tempNumber > 0) {
    groups.push(tempNumber % 1000);
    tempNumber = Math.floor(tempNumber / 1000);
  }

  let result = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] !== 0) {
      result += readThreeDigits(groups[i]) + " " + positions[i] + " ";
    }
  }

  return result.trim();
};

export default function OrdersTab() {
  const { toast } = useToast()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [selectedOrders, setSelectedOrders] = useState([])

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

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId)
      }
      return [...prev, orderId]
    })
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id))
    }
  }

  const printOrders = (ordersToPrint) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Lỗi",
        description: "Không thể mở cửa sổ in. Vui lòng kiểm tra trình duyệt của bạn.",
        variant: "destructive",
      });
      return;
    }

    const html = `
      <html>
        <head>
          <title>In đơn hàng</title>
          <style>
            /* Cài đặt chung */
            body { 
              font-family: Times New Roman, serif;
              margin: 0;
              padding: 0;
              color: black;
              line-height: 1.3;
            }
            
            /* Cài đặt cho A4 */
            @page {
              size: A4;
              margin: 15mm 10mm;
            }
            @media print and (width: 210mm) {
              .order { font-size: 13pt; }
              .company-name { font-size: 16pt; }
              .document-title { font-size: 18pt; }
              .document-number { font-size: 13pt; }
              table { margin: 20px 0; }
              th, td { padding: 8px; }
              .signature-section { margin-top: 40px; }
            }
            
            /* Cài đặt cho A5 */
            @media print and (width: 148mm) {
              .order { font-size: 11pt; }
              .company-name { font-size: 14pt; }
              .document-title { font-size: 16pt; }
              .document-number { font-size: 11pt; }
              table { margin: 15px 0; }
              th, td { padding: 5px; }
              .signature-section { margin-top: 30px; }
            }

            .order { 
              page-break-after: always;
            }
            .header-section {
              text-align: center;
              margin-bottom: 15px;
            }
            .company-name {
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .company-info {
              margin-bottom: 2px;
            }
            .document-title {
              font-weight: bold;
              text-transform: uppercase;
              margin: 20px 0 3px 0;
              text-align: center;
            }
            .document-number, .document-date {
              text-align: center;
              margin-bottom: 3px;
            }
            .info-section {
              margin: 15px 0;
            }
            .info-row {
              margin-bottom: 5px;
              display: flex;
            }
            .info-label {
              font-weight: bold;
              width: 100px;
            }
            .info-value {
              flex: 1;
            }
            table { 
              width: 100%;
              border-collapse: collapse;
            }
            th, td { 
              border: 1px solid black;
            }
            th { 
              font-weight: bold;
              text-align: center;
              background-color: #f0f0f0;
            }
            .centered { text-align: center; }
            .amount { text-align: right; }
            .total-section {
              margin: 10px 0;
            }
            .total-number {
              font-weight: bold;
              margin-bottom: 3px;
            }
            .total-words {
              font-style: italic;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 32%;
              text-align: center;
            }
            .signature-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .signature-date {
              font-style: italic;
              margin-bottom: 40px;
            }
            .note-section {
              margin-top: 20px;
              font-style: italic;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          ${ordersToPrint.map((order, pageIndex) => `
            <div class="order">
              <div class="header-section">
                <div class="company-name">Nhà Phân Phối Hàng Hóa Vũ Lệ</div>
                <div class="company-info">Địa chỉ: DT757, An Khương, Hớn Quản, Bình Phước</div>
                <div class="company-info">Điện thoại: 0976.002.102</div>
              </div>

              <div class="document-title">PHIẾU XUẤT KHO</div>
              <div class="document-number">Số: ${order.id}</div>
              <div class="document-date">Ngày ${new Date(order.date).getDate()} tháng ${new Date(order.date).getMonth() + 1} năm ${new Date(order.date).getFullYear()}</div>

              <div class="info-section">
                <div class="info-row">
                  <div class="info-label">Khách hàng:</div>
                  <div class="info-value">${order.customerData?.name || 'N/A'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Địa chỉ:</div>
                  <div class="info-value">${order.customerData?.address || 'N/A'}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Điện thoại:</div>
                  <div class="info-value">${order.customerData?.phone || 'N/A'}</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width: 5%">STT</th>
                    <th style="width: 45%">Tên hàng hóa</th>
                    <th style="width: 15%">Số lượng</th>
                    <th style="width: 15%">Đơn giá</th>
                    <th style="width: 20%">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items?.map((item, index) => `
                    <tr>
                      <td class="centered">${index + 1}</td>
                      <td>${item.name}</td>
                      <td class="centered">${item.quantity}</td>
                      <td class="amount">${item.price?.toLocaleString('vi-VN')}</td>
                      <td class="amount">${(item.quantity * item.price)?.toLocaleString('vi-VN')}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td colspan="4" class="amount" style="font-weight: bold; border-bottom: 2px solid black;">Tổng cộng:</td>
                    <td class="amount" style="font-weight: bold; border-bottom: 2px solid black;">${order.total?.toLocaleString('vi-VN')}</td>
                  </tr>
                </tbody>
              </table>

              <div class="total-section">
                <div class="total-number">Tổng số tiền: ${order.total?.toLocaleString('vi-VN')} đồng</div>
                <div class="total-words">Bằng chữ: ${numberToWords(order.total)} đồng</div>
              </div>

              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-title">Người lập phiếu</div>
                  <div class="signature-date">Ngày .... tháng .... năm ....</div>
                  <div class="signature-name">(Ký, họ tên)</div>
                </div>
                <div class="signature-box">
                  <div class="signature-title">Người giao hàng</div>
                  <div class="signature-date">Ngày .... tháng .... năm ....</div>
                  <div class="signature-name">(Ký, họ tên)</div>
                </div>
                <div class="signature-box">
                  <div class="signature-title">Người nhận hàng</div>
                  <div class="signature-date">Ngày .... tháng .... năm ....</div>
                  <div class="signature-name">(Ký, họ tên)</div>
                </div>
              </div>

              <div class="note-section">
                <div>Ghi chú:</div>
                <div>- Phiếu xuất kho được lập thành 02 bản: 01 bản lưu tại kho, 01 bản giao cho khách hàng</div>
                <div>- Phiếu có giá trị xuất hóa đơn trong ngày</div>
              </div>

            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  const handlePrintSelected = () => {
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
    
    if (selectedOrdersData.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một đơn hàng để in",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Đang chuẩn bị in",
      description: `Đang in ${selectedOrders.length} đơn hàng`,
    });

    printOrders(selectedOrdersData);
  };

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
            <div className="flex gap-2">
              {selectedOrders.length > 0 && (
                <Button variant="secondary" onClick={handlePrintSelected}>
                  <Printer className="w-4 h-4 mr-2" />
                  In {selectedOrders.length} đơn hàng
                </Button>
              )}
              <Button variant="outline">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Xuất Excel
              </Button>
            </div>
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrders.length === filteredOrders.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
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
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => handleSelectOrder(order.id)}
                      />
                    </TableCell>
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