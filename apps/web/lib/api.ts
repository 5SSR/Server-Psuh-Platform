const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

function isServerSide() {
  return typeof window === 'undefined';
}

function isConnectionRefused(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return /ECONNREFUSED|fetch failed|connect ECONNREFUSED/i.test(msg);
}

async function request<T>(path: string, init?: RequestInit, fallback?: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      },
      // 在 Next.js 服务器端使用缓存控制，可按需调整
      next: { revalidate: 30 }
    });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    // 构建期或服务端 API 不可达时返回兜底，避免页面构建失败
    if (fallback !== undefined && isServerSide() && isConnectionRefused(error)) {
      return fallback;
    }
    // 静态构建阶段统一兜底，避免预渲染因临时接口波动失败
    if (
      fallback !== undefined &&
      isServerSide() &&
      process.env.NODE_ENV === 'production'
    ) {
      return fallback;
    }
    throw error;
  }
}

export interface Product {
  id: string;
  code?: string;
  title: string;
  salePrice: number;
  renewPrice?: number;
  category: string;
  region: string;
  status?: string;
  datacenter?: string;
  lineType?: string;
  providerName?: string;
  providerUrl?: string;
  cpuModel?: string;
  cpuCores?: number;
  memoryGb?: number;
  diskGb?: number;
  diskType?: string;
  bandwidthMbps?: number;
  trafficLimit?: number;
  ipCount?: number;
  ddos?: number;
  purchasePrice?: number;
  minAcceptPrice?: number;
  deliveryType?: string;
  feePayer?: 'BUYER' | 'SELLER' | 'SHARED' | string;
  negotiable?: boolean;
  consignment?: boolean;
  isPremium?: boolean;
  premiumRate?: number;
  canChangeEmail?: boolean;
  canChangeRealname?: boolean;
  canTest?: boolean;
  canTransfer?: boolean;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  riskTags?: string[];
  expireAt?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: { id: string; url: string; type: string }[];
  consignmentApplications?: Array<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
    sellerNote?: string | null;
    adminRemark?: string | null;
    reviewedAt?: string | null;
    createdAt?: string;
    reviewer?: {
      id: string;
      email: string;
    } | null;
  }>;
  seller?: {
    id: string;
    email: string;
    createdAt?: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      disputeRate: number;
      refundRate?: number;
      avgDeliveryMinutes: number;
      positiveRate: number;
    } | null;
  };
  _count?: {
    browsingHistory?: number;
    orders?: number;
    favorites?: number;
  };
}

export interface StoreReview {
  id: string;
  orderId: string;
  rating: number;
  content?: string | null;
  tags?: string[];
  createdAt: string;
  buyer: {
    id: string;
    email: string;
  };
}

export interface StorePublicData {
  store: {
    id: string;
    userId: string;
    name: string;
    slug: string;
    logo?: string | null;
    banner?: string | null;
    intro?: string | null;
    notice?: string | null;
    verifiedBadge: boolean;
    responseMinutes: number;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      email: string;
      createdAt: string;
      sellerProfile?: {
        level: number;
        tradeCount: number;
        disputeRate: number;
        refundRate?: number;
        avgDeliveryMinutes: number;
        positiveRate: number;
      } | null;
    };
  };
  stats: {
    onlineProducts: number;
    reviewCount: number;
    estimatedVisits: number;
  };
  products: Product[];
  reviews: StoreReview[];
}

export interface ProductListResponse {
  list: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContentBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  linkUrl?: string | null;
}

export interface ContentFaq {
  id: string;
  category?: string | null;
  question: string;
  answer: string;
}

export interface HelpArticle {
  id: string;
  category?: string | null;
  title: string;
  content: string;
}

export interface MarketTag {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  linkUrl?: string | null;
}

export interface PolicyDocument {
  id: string;
  code: string;
  title: string;
  content: string;
  position?: number;
  isActive?: boolean;
  updatedAt?: string;
}

export interface HomeContent {
  banners: ContentBanner[];
  faqs: ContentFaq[];
  helps: HelpArticle[];
  tags: MarketTag[];
  policies?: PolicyDocument[];
  announcements?: Announcement[];
}

export interface Announcement {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  isActive: boolean;
  isPinned: boolean;
  position: number;
  startsAt?: string | null;
  endsAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WantedRequest {
  id: string;
  title: string;
  category?: string | null;
  region: string;
  lineType?: string | null;
  cpuCores?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  bandwidthMbps?: number | null;
  budgetMin?: number | string | null;
  budgetMax?: number | string | null;
  acceptPremium?: boolean;
  description?: string | null;
  expireAt?: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  buyer?: {
    id: string;
    email: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      positiveRate: number;
      disputeRate: number;
    } | null;
  };
  _count?: {
    offers: number;
  };
}

export interface WantedListResponse {
  list: WantedRequest[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WantedSummary {
  openCount: number;
  closedCount: number;
  categories: Array<{
    category: string | null;
    _count: { _all: number };
  }>;
}

function createProductFallback(id: string): Product {
  return {
    id,
    code: id,
    title: '商品信息暂不可用',
    salePrice: 0,
    category: 'UNKNOWN',
    region: '',
    status: 'OFFLINE'
  };
}

export const api = {
  products: (query = '') =>
    request<ProductListResponse>(
      `/products${query ? `?${query}` : ''}`,
      undefined,
      { list: [], total: 0, page: 1, pageSize: 0 }
    ),
  productDetail: (id: string) => request<Product>(`/products/${id}`, undefined, createProductFallback(id)),
  wantedList: (query = '') =>
    request<WantedListResponse>(
      `/wanted${query ? `?${query}` : ''}`,
      undefined,
      { list: [], total: 0, page: 1, pageSize: 0 }
    ),
  wantedSummary: () =>
    request<WantedSummary>(
      '/wanted/summary',
      undefined,
      { openCount: 0, closedCount: 0, categories: [] }
    ),
  storeBySeller: (sellerId: string) =>
    request<StorePublicData>(
      `/stores/seller/${sellerId}`,
      undefined,
      {
        store: {
          id: `fallback-${sellerId}`,
          userId: sellerId,
          name: '店铺信息暂不可用',
          slug: sellerId,
          logo: null,
          banner: null,
          intro: null,
          notice: null,
          verifiedBadge: false,
          responseMinutes: 30,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
          user: {
            id: sellerId,
            email: 'unknown@example.com',
            createdAt: new Date(0).toISOString(),
            sellerProfile: null
          }
        },
        stats: {
          onlineProducts: 0,
          reviewCount: 0,
          estimatedVisits: 0
        },
        products: [],
        reviews: []
      }
    ),
  homeContent: () =>
    request<HomeContent>('/content/home', undefined, {
      banners: [],
      faqs: [],
      helps: [],
      tags: [],
      policies: [],
      announcements: []
    }),
  helpArticles: () => request<HelpArticle[]>('/content/help', undefined, []),
  announcements: (limit = 20) =>
    request<Announcement[]>(`/content/announcements?limit=${limit}`, undefined, []),
  announcementById: (id: string) =>
    request<Announcement>(
      `/content/announcements/${id}`,
      undefined,
      {
        id,
        title: '公告暂不可用',
        summary: '',
        content: '当前环境暂未读取到公告详情，请稍后重试。',
        isActive: false,
        isPinned: false,
        position: 0,
        publishedAt: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      }
    ),
  policies: () => request<PolicyDocument[]>('/content/policies', undefined, []),
  policyByCode: (code: string) =>
    request<PolicyDocument>(
      `/content/policies/${encodeURIComponent(code)}`,
      undefined,
      {
        id: `fallback-${code}`,
        code,
        title: code.toUpperCase() === 'AGREEMENT' ? '平台服务协议（暂未发布）' : '平台交易规则（暂未发布）',
        content: '当前环境暂未获取到规则文档，请稍后重试或联系管理员发布内容。'
      }
    )
};
