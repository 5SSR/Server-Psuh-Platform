// 通用响应格式，前后端统一
export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  timestamp?: number;
}

// 商品类型枚举
export enum ProductCategory {
  Dedicated = 'dedicated',
  VPS = 'vps',
  Cloud = 'cloud',
  NAT = 'nat',
  Line = 'line'
}

// 订单状态枚举（一期）
export enum OrderStatus {
  PendingPayment = 'pending_payment',
  PaidWaitingDelivery = 'paid_waiting_delivery',
  Verifying = 'verifying',
  BuyerChecking = 'buyer_checking',
  CompletedPendingSettlement = 'completed_pending_settlement',
  Completed = 'completed',
  Refunding = 'refunding',
  Disputing = 'disputing',
  Canceled = 'canceled'
}

// 分页入参
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// 分页结果
export interface PaginationResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
