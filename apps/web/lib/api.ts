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
  negotiable?: boolean;
  consignment?: boolean;
  canChangeEmail?: boolean;
  canChangeRealname?: boolean;
  riskTags?: string[];
  expireAt?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  images?: { id: string; url: string; type: string }[];
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
  homeContent: () => request<HomeContent>('/content/home', undefined, { banners: [], faqs: [], helps: [], tags: [] }),
  helpArticles: () => request<HelpArticle[]>('/content/help', undefined, [])
};
