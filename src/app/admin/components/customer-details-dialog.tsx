'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, Phone, MapPin, Calendar } from 'lucide-react'

interface CustomerDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: any
}

export default function CustomerDetailsDialog({
  open,
  onOpenChange,
  customer
}: CustomerDetailsDialogProps) {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Chi tiết khách hàng</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-500">Thông tin cơ bản</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{customer.id}</Badge>
                <Badge variant={customer.orderCount > 0 ? "success" : "secondary"}>
                  {customer.orderCount > 0 ? 'Đã mua hàng' : 'Chưa mua hàng'}
                </Badge>
              </div>
              <h3 className="text-xl font-semibold">{customer.name}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{customer.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
                {customer.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{customer.address}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Tham gia: {new Date(customer.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-gray-500">Thống kê mua hàng</Label>
            <div className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Số đơn hàng</p>
                  <p className="text-2xl font-bold">{customer.orderCount || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Tổng chi tiêu</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(customer.totalSpent || 0).toLocaleString('vi-VN')} VNĐ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Label className="text-gray-500">Lịch sử đơn hàng</Label>
          <div className="mt-2">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Ngày đặt</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>{new Date(order.date).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell className="text-right">
                        {order.total.toLocaleString('vi-VN')} VNĐ
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === 'completed' ? 'success' :
                          order.status === 'cancelled' ? 'destructive' :
                          'secondary'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!customer.orders || customer.orders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        Chưa có đơn hàng nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 