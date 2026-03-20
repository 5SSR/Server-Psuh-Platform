export type EnumLabelMap = Record<string, string>;

export function labelByMap(value: string | null | undefined, map: EnumLabelMap, fallback = '-') {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (!raw) return fallback;
  if (map[raw]) return map[raw];
  const upper = raw.toUpperCase();
  if (map[upper]) return map[upper];
  const lower = raw.toLowerCase();
  if (map[lower]) return map[lower];
  return raw;
}

export const PRODUCT_CATEGORY_LABEL: EnumLabelMap = {
  DEDICATED: '独立服务器',
  VPS: 'VPS',
  CLOUD: '云服务器',
  NAT: 'NAT',
  LINE: '线路产品'
};

export const PRODUCT_STATUS_LABEL: EnumLabelMap = {
  DRAFT: '草稿',
  PENDING: '待审核',
  ONLINE: '上架中',
  OFFLINE: '已下架'
};

export const PRODUCT_AUDIT_STATUS_LABEL: EnumLabelMap = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回'
};

export const RISK_LEVEL_LABEL: EnumLabelMap = {
  LOW: '低风险',
  MEDIUM: '中风险',
  HIGH: '高风险'
};

export const USER_ROLE_LABEL: EnumLabelMap = {
  USER: '普通用户',
  BUYER: '买家',
  SELLER: '卖家',
  ADMIN: '管理员'
};

export const USER_STATUS_LABEL: EnumLabelMap = {
  ACTIVE: '正常',
  BANNED: '已封禁'
};

export const KYC_STATUS_LABEL: EnumLabelMap = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回'
};

export const SELLER_APPLICATION_STATUS_LABEL: EnumLabelMap = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回'
};

export const PAY_STATUS_LABEL: EnumLabelMap = {
  UNPAID: '待支付',
  PAID: '已支付',
  REFUNDED: '已退款',
  FAILED: '支付失败',
  CLOSED: '已关闭'
};

export const PAY_CHANNEL_LABEL: EnumLabelMap = {
  BALANCE: '余额',
  ALIPAY: '支付宝',
  WECHAT: '微信支付',
  USDT: 'USDT',
  MANUAL: '人工'
};

export const FEE_PAYER_LABEL: EnumLabelMap = {
  BUYER: '买家承担',
  SELLER: '卖家承担',
  SHARED: '买卖各半'
};

export const FEE_MODE_LABEL: EnumLabelMap = {
  FIXED: '固定金额',
  RATE: '按比例',
  TIER: '阶梯费率'
};

export const ORDER_STATUS_LABEL: EnumLabelMap = {
  PENDING_PAYMENT: '待支付',
  PAID_WAITING_DELIVERY: '待交付',
  VERIFYING: '平台核验中',
  BUYER_CHECKING: '买家验机中',
  COMPLETED_PENDING_SETTLEMENT: '待结算',
  COMPLETED: '已完成',
  REFUNDING: '退款中',
  DISPUTING: '纠纷中',
  CANCELED: '已取消'
};

export const REVIEW_STATUS_LABEL: EnumLabelMap = {
  NORMAL: '正常',
  SUSPICIOUS: '可疑',
  FRAUD: '风险'
};

export const NOTICE_STATUS_LABEL: EnumLabelMap = {
  PENDING: '待发送',
  SENT: '已发送',
  FAILED: '发送失败'
};

export const NOTICE_CHANNEL_LABEL: EnumLabelMap = {
  SITE: '站内通知',
  EMAIL: '邮件',
  TG: 'Telegram',
  SMS: '短信',
  WECHAT_TEMPLATE: '微信模板'
};

export const NOTICE_CHANNEL_MODE_LABEL: EnumLabelMap = {
  INTERNAL: '内部',
  MOCK: '模拟',
  REMOTE: '远程',
  DISABLED: '禁用',
  MANUAL_REVIEW: '人工复核'
};

export const RECONCILE_TASK_STATUS_LABEL: EnumLabelMap = {
  PENDING: '待执行',
  RUNNING: '执行中',
  COMPLETED: '已完成',
  FAILED: '执行失败'
};

export const RECONCILE_ITEM_STATUS_LABEL: EnumLabelMap = {
  OPEN: '待处理',
  RESOLVED: '已处理',
  IGNORED: '已忽略'
};

export const RECONCILE_DIFF_TYPE_LABEL: EnumLabelMap = {
  MISSING_LOCAL: '本地缺失',
  MISSING_REMOTE: '渠道缺失',
  AMOUNT_MISMATCH: '金额不一致',
  STATUS_MISMATCH: '状态不一致',
  DUPLICATE_REMOTE: '渠道重复'
};
