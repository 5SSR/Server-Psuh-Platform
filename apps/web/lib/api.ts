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
      avgDeliveryMinutes: number;
      positiveRate: number;
    } | null;
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
}

export interface HomeContent {
  banners: ContentBanner[];
  faqs: ContentFaq[];
  helps: HelpArticle[];
  tags: MarketTag[];
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
  homeContent: () => request<HomeContent>('/content/home', undefined, { banners: [], faqs: [], helps: [], tags: [] }),
  helpArticles: () => request<HelpArticle[]>('/content/help', undefined, [])
};
