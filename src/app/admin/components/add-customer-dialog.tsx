'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast'
import { db } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'

interface AddCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddCustomerDialog({
  open,
  onOpenChange
}: AddCustomerDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { name, email, phone } = formData
      
      if (!name || !email || !phone) {
        toast({
          title: "Thiếu thông tin",
          description: "Vui lòng điền đầy đủ thông tin bắt buộc",
          variant: "destructive",
        })
        return
      }

      const newCustomer = {
        ...formData,
        createdAt: new Date().toISOString(),
        orderCount: 0,
        totalSpent: 0
      }

      await addDoc(collection(db, 'customers'), newCustomer)

      setFormData({
        name: '',
        email: '',
        phone: '',
        address: ''
      })

      onOpenChange(false)

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm khách hàng mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên khách hàng *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nhập tên khách hàng"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Nhập địa chỉ"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Thêm khách hàng</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 