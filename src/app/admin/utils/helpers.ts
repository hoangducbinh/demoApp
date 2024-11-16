export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'processing': return 'default'
    case 'completed': return 'success'
    case 'cancelled': return 'destructive'
    default: return 'secondary'
  }
}

export const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Chờ xử lý'
    case 'processing': return 'Đang xử lý'
    case 'completed': return 'Hoàn thành'
    case 'cancelled': return 'Đã hủy'
    default: return 'Không xác định'
  }
}

export const getPaymentBadgeVariant = (method: string) => {
  switch (method) {
    case 'cash': return 'default'
    case 'bank_transfer': return 'info'
    case 'card': return 'success'
    case 'momo': return 'warning'
    default: return 'secondary'
  }
}

export const getPaymentMethodText = (method: string) => {
  switch (method) {
    case 'cash': return 'Tiền mặt'
    case 'bank_transfer': return 'Chuyển khoản'
    case 'card': return 'Thẻ tín dụng'
    case 'momo': return 'Ví MoMo'
    default: return 'Không xác định'
  }
} 