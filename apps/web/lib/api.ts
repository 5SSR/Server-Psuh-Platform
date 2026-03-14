const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
}

export interface Product {
  id: string;
  title: string;
  salePrice: number;
  category: string;
  region: string;
  lineType?: string;
  riskTags?: string[];
  expireAt?: string;
}

export interface ProductListResponse {
  list: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export const api = {
  products: (query = '') =>
    request<ProductListResponse>(`/products${query ? `?${query}` : ''}`),
  productDetail: (id: string) => request<Product>(`/products/${id}`)
};
