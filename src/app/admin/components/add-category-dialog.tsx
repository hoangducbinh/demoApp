'use client'

import React from 'react'
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

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newCategory: {
    name: string
  }
  setNewCategory: (category: { name: string }) => void
  addCategory: () => Promise<void>
}

export default function AddCategoryDialog({
  open,
  onOpenChange,
  newCategory,
  setNewCategory,
  addCategory
}: AddCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm danh mục mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên danh mục</Label>
            <Input
              id="name"
              placeholder="Nhập tên danh mục..."
              value={newCategory.name}
              onChange={(e) => setNewCategory({ name: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={addCategory}>
            Thêm danh mục
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 