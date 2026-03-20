"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Product = {
  id: string;
  title: string;
  code?: string;
  status: string;
  category: string;
  region: string;
  datacenter?: string | null;
  lineType?: string | null;
  providerName?: string | null;
  providerUrl?: string | null;
  cpuModel?: string | null;
  cpuCores?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  diskType?: string | null;
  bandwidthMbps?: number | null;
  trafficLimit?: number | null;
  ipCount?: number | null;
  ddos?: number | null;
  salePrice: number | string;
  purchasePrice?: number | string | null;
  minAcceptPrice?: number | string | null;
  renewPrice?: number | string | null;
  expireAt?: string | null;
  deliveryType: string;
  feePayer?: 'BUYER' | 'SELLER' | 'SHARED' | string;
  negotiable?: boolean;
  consignment?: boolean;
  isPremium?: boolean;
  premiumRate?: number | string | null;
  canChangeEmail?: boolean;
  canChangeRealname?: boolean;
  canTest?: boolean;
  canTransfer?: boolean;
  riskTags?: string[];
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: Array<{ id: string; url: string; type: string }>;
  audits?: Array<{
    status: string;
    reason?: string | null;
    createdAt: string;
  }>;
};

type UserInfo = {
  role: string;
};

type ProductForm = {
  title: string;
  category: string;
  region: string;
  datacenter: string;
  lineType: string;
  providerName: string;
  providerUrl: string;
  cpuModel: string;
  cpuCores: string;
  memoryGb: string;
  diskGb: string;
  diskType: string;
  bandwidthMbps: string;
  trafficLimit: string;
  ipCount: string;
  ddos: string;
  salePrice: string;
  purchasePrice: string;
  minAcceptPrice: string;
  renewPrice: string;
  expireAt: string;
  deliveryType: string;
  feePayer: string;
  negotiable: boolean;
  consignment: boolean;
  canChangeEmail: boolean;
  canChangeRealname: boolean;
  canTest: boolean;
  canTransfer: boolean;
  isPremium: boolean;
  premiumRate: string;
  riskTags: string;
  description: string;
  billImages: string;
  panelImages: string;
  benchmarkImages: string;
  otherImages: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '审核中',
  ONLINE: '已上架',
  OFFLINE: '已下架'
};

const statusClass: Record<string, string> = {
  DRAFT: 'status-chip',
  PENDING: 'status-chip warning',
  ONLINE: 'status-chip success',
  OFFLINE: 'status-chip'
};

const defaultForm: ProductForm = {
  title: '',
  category: 'VPS',
  region: 'HK',
  datacenter: '',
  lineType: '',
  providerName: '',
  providerUrl: '',
  cpuModel: '',
  cpuCores: '',
  memoryGb: '',
  diskGb: '',
  diskType: 'SSD',
  bandwidthMbps: '',
  trafficLimit: '',
  ipCount: '',
  ddos: '',
  salePrice: '100',
  purchasePrice: '',
  minAcceptPrice: '',
  renewPrice: '',
  expireAt: '',
  deliveryType: 'FULL_ACCOUNT',
  feePayer: 'SELLER',
  negotiable: false,
  consignment: false,
  canChangeEmail: false,
  canChangeRealname: false,
  canTest: false,
  canTransfer: false,
  isPremium: false,
  premiumRate: '',
  riskTags: '',
  description: '',
  billImages: '',
  panelImages: '',
  benchmarkImages: '',
  otherImages: ''
};

function splitUrls(raw: string) {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value: string) {
  if (!value.trim()) return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return n;
}

function parseRiskTags(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPayload(form: ProductForm) {
  return {
    title: form.title,
    category: form.category,
    region: form.region,
    datacenter: form.datacenter || undefined,
    lineType: form.lineType || undefined,
    providerName: form.providerName || undefined,
    providerUrl: form.providerUrl || undefined,
    cpuModel: form.cpuModel || undefined,
    cpuCores: toNumber(form.cpuCores),
    memoryGb: toNumber(form.memoryGb),
    diskGb: toNumber(form.diskGb),
    diskType: form.diskType || undefined,
    bandwidthMbps: toNumber(form.bandwidthMbps),
    trafficLimit: toNumber(form.trafficLimit),
    ipCount: toNumber(form.ipCount),
    ddos: toNumber(form.ddos),
    salePrice: Number(form.salePrice) || 0,
    purchasePrice: toNumber(form.purchasePrice),
    minAcceptPrice: toNumber(form.minAcceptPrice),
    renewPrice: toNumber(form.renewPrice),
    expireAt: form.expireAt || undefined,
    deliveryType: form.deliveryType,
    feePayer: form.feePayer || 'SELLER',
    negotiable: form.negotiable,
    consignment: form.consignment,
    canChangeEmail: form.canChangeEmail,
    canChangeRealname: form.canChangeRealname,
    canTest: form.canTest,
    canTransfer: form.canTransfer,
    isPremium: form.isPremium,
    premiumRate: toNumber(form.premiumRate),
    riskTags: parseRiskTags(form.riskTags),
    description: form.description || undefined
  };
}

function fromProduct(product: Product): ProductForm {
  return {
    title: product.title || '',
    category: product.category || 'VPS',
    region: product.region || '',
    datacenter: product.datacenter || '',
    lineType: product.lineType || '',
    providerName: product.providerName || '',
    providerUrl: '',
    cpuModel: product.cpuModel || '',
    cpuCores: product.cpuCores ? String(product.cpuCores) : '',
    memoryGb: product.memoryGb ? String(product.memoryGb) : '',
    diskGb: product.diskGb ? String(product.diskGb) : '',
    diskType: product.diskType || 'SSD',
    bandwidthMbps: product.bandwidthMbps ? String(product.bandwidthMbps) : '',
    trafficLimit: product.trafficLimit ? String(product.trafficLimit) : '',
    ipCount: product.ipCount ? String(product.ipCount) : '',
    ddos: product.ddos ? String(product.ddos) : '',
    salePrice: String(product.salePrice ?? ''),
    purchasePrice: product.purchasePrice ? String(product.purchasePrice) : '',
    minAcceptPrice: product.minAcceptPrice ? String(product.minAcceptPrice) : '',
    renewPrice: product.renewPrice ? String(product.renewPrice) : '',
    expireAt: product.expireAt ? product.expireAt.slice(0, 10) : '',
    deliveryType: product.deliveryType || 'FULL_ACCOUNT',
    feePayer: product.feePayer || 'SELLER',
    negotiable: !!product.negotiable,
    consignment: !!product.consignment,
    canChangeEmail: !!product.canChangeEmail,
    canChangeRealname: !!product.canChangeRealname,
    canTest: !!product.canTest,
    canTransfer: !!product.canTransfer,
    isPremium: !!product.isPremium,
    premiumRate: product.premiumRate ? String(product.premiumRate) : '',
    riskTags: (product.riskTags || []).join(', '),
    description: product.description || '',
    billImages: '',
    panelImages: '',
    benchmarkImages: '',
    otherImages: ''
  };
}

async function uploadImages(
  token: string,
  productId: string,
  raw: string,
  type: 'BILL' | 'PANEL' | 'BENCHMARK' | 'OTHER'
) {
  const urls = splitUrls(raw);
  if (!urls.length) return;

  for (const url of urls) {
    await fetch(`${API_BASE}/products/${productId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ type, url })
    });
  }
}

export default function SellerProductsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ProductForm>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(defaultForm);
  const [syncForm, setSyncForm] = useState({
    panelType: 'generic',
    endpoint: '',
    apiKey: '',
    serverId: ''
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const stats = useMemo(() => {
    return products.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'ONLINE') acc.online += 1;
        if (item.status === 'PENDING') acc.pending += 1;
        if (item.status === 'OFFLINE') acc.offline += 1;
        if (item.status === 'DRAFT') acc.draft += 1;
        return acc;
      },
      { total: 0, online: 0, pending: 0, offline: 0, draft: 0 }
    );
  }, [products]);

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录用户账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [meRes, listRes] = await Promise.all([
        fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(
          `${API_BASE}/products/mine?page=1&pageSize=50${status ? `&status=${status}` : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      ]);
      const meData = await meRes.json();
      const listData = await listRes.json();

      if (!meRes.ok) throw new Error(meData.message || '读取用户信息失败');
      if (!listRes.ok) throw new Error(listData.message || '读取商品失败');
      setUserInfo(meData);
      setProducts(listData.list || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFormValue = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditFormValue = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const syncProviderConfig = async () => {
    if (!token) return;
    if (!syncForm.endpoint.trim()) {
      setError('请先填写上游接口地址');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/provider/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(syncForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '拉取失败');
      const detected = data.detected || {};
      setForm((prev) => ({
        ...prev,
        providerName: detected.providerName || prev.providerName,
        providerUrl: detected.providerUrl || prev.providerUrl,
        cpuModel: detected.cpuModel || prev.cpuModel,
        cpuCores: detected.cpuCores !== undefined ? String(detected.cpuCores) : prev.cpuCores,
        memoryGb: detected.memoryGb !== undefined ? String(detected.memoryGb) : prev.memoryGb,
        diskGb: detected.diskGb !== undefined ? String(detected.diskGb) : prev.diskGb,
        diskType: detected.diskType || prev.diskType,
        bandwidthMbps:
          detected.bandwidthMbps !== undefined
            ? String(detected.bandwidthMbps)
            : prev.bandwidthMbps,
        trafficLimit:
          detected.trafficLimit !== undefined
            ? String(detected.trafficLimit)
            : prev.trafficLimit,
        ipCount: detected.ipCount !== undefined ? String(detected.ipCount) : prev.ipCount,
        ddos: detected.ddos !== undefined ? String(detected.ddos) : prev.ddos,
        expireAt:
          typeof detected.expireAt === 'string' && detected.expireAt.length >= 10
            ? detected.expireAt.slice(0, 10)
            : prev.expireAt
      }));
      setMessage(data.message || '已自动回填参数，请检查后保存商品');
    } catch (e: any) {
      setError(e.message || '拉取失败');
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async () => {
    if (!token) return;
    if (!form.title.trim()) {
      setError('请填写商品标题');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(toPayload(form))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '创建失败');

      await uploadImages(token, data.id, form.billImages, 'BILL');
      await uploadImages(token, data.id, form.panelImages, 'PANEL');
      await uploadImages(token, data.id, form.benchmarkImages, 'BENCHMARK');
      await uploadImages(token, data.id, form.otherImages, 'OTHER');

      setMessage('商品创建成功，已保存为待审核状态，可继续补充或提交审核。');
      setForm(defaultForm);
      await load();
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const submitAudit = async (id: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remark: remarks[id] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交审核失败');
      setMessage('已提交审核，等待平台处理。');
      await load();
    } catch (e: any) {
      setError(e.message || '提交审核失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async (id: string, next: 'online' | 'offline') => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${id}/${next}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '操作失败');
      setMessage(next === 'online' ? '商品已上架' : '商品已下架');
      await load();
    } catch (e: any) {
      setError(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleUrgent = async (id: string, urgent: boolean) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${id}/urgent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ urgent })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '急售状态更新失败');
      setMessage(urgent ? '已设为急售商品' : '已取消急售');
      await load();
    } catch (e: any) {
      setError(e.message || '急售状态更新失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!token) return;
    if (!window.confirm('确认删除该商品？删除后不可恢复。')) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '删除失败');
      setMessage('商品已删除');
      if (editingId === id) setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm(fromProduct(product));
  };

  const updateProduct = async () => {
    if (!token || !editingId) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(toPayload(editForm))
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '更新失败');

      await uploadImages(token, editingId, editForm.billImages, 'BILL');
      await uploadImages(token, editingId, editForm.panelImages, 'PANEL');
      await uploadImages(token, editingId, editForm.benchmarkImages, 'BENCHMARK');
      await uploadImages(token, editingId, editForm.otherImages, 'OTHER');

      setMessage('商品已更新，可重新提交审核。');
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">卖家中心 · 发布与管理</p>
          <h1>发布商品 / 我的商品</h1>
          <p className="muted">身份：{userInfo?.role || '未知'}，支持草稿编辑、提审、上下架与凭证补充。</p>
        </div>
        <button onClick={load} className="btn secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">商品总数</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已上架</p>
          <p className="metric-value">{stats.online}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">审核中</p>
          <p className="metric-value">{stats.pending}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">草稿/下架</p>
          <p className="metric-value">{stats.draft + stats.offline}</p>
        </article>
      </section>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card stack-16">
        <div className="section-head">
          <div>
            <h3>发布商品</h3>
            <p className="muted">按分区填写，先保存商品，再提交审核。平台会按配置与风险规则进行校验。</p>
          </div>
          <div className="status-line">
            <span className="status-chip">填写信息</span>
            <span className="status-chip">保存商品</span>
            <span className="status-chip warning">提交审核</span>
            <span className="status-chip success">审核通过后上架</span>
          </div>
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>基础信息</h3>
          <div className="form-row">
            <div className="field full">
              <label>商品标题 *</label>
              <input
                value={form.title}
                onChange={(e) => updateFormValue('title', e.target.value)}
                placeholder="例如：香港 CN2 VPS 2C4G / 年付可过户"
              />
            </div>
            <div className="field third">
              <label>商品类型 *</label>
              <select value={form.category} onChange={(e) => updateFormValue('category', e.target.value)}>
                <option value="DEDICATED">DEDICATED</option>
                <option value="VPS">VPS</option>
                <option value="CLOUD">CLOUD</option>
                <option value="NAT">NAT</option>
                <option value="LINE">LINE</option>
              </select>
            </div>
            <div className="field third">
              <label>地区 *</label>
              <input value={form.region} onChange={(e) => updateFormValue('region', e.target.value)} />
            </div>
            <div className="field third">
              <label>机房</label>
              <input value={form.datacenter} onChange={(e) => updateFormValue('datacenter', e.target.value)} />
            </div>
            <div className="field half">
              <label>线路</label>
              <input value={form.lineType} onChange={(e) => updateFormValue('lineType', e.target.value)} />
            </div>
            <div className="field half">
              <label>服务商名称</label>
              <input value={form.providerName} onChange={(e) => updateFormValue('providerName', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>上游面板 API 自动拉取</h3>
          <p className="input-help">
            填写上游接口后可自动回填 CPU/内存/硬盘/带宽等字段，减少手工录入误差。
          </p>
          <div className="form-row">
            <div className="field third">
              <label>面板类型</label>
              <input
                value={syncForm.panelType}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, panelType: e.target.value }))}
                placeholder="generic/proxmox/solusvm..."
              />
            </div>
            <div className="field full">
              <label>上游接口地址</label>
              <input
                value={syncForm.endpoint}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, endpoint: e.target.value }))}
                placeholder="https://provider.example.com/api/server/info"
              />
            </div>
            <div className="field half">
              <label>API Key（可选）</label>
              <input
                value={syncForm.apiKey}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div className="field half">
              <label>服务器 ID（可选）</label>
              <input
                value={syncForm.serverId}
                onChange={(e) => setSyncForm((prev) => ({ ...prev, serverId: e.target.value }))}
              />
            </div>
          </div>
          <div className="actions">
            <button className="btn secondary" type="button" onClick={syncProviderConfig} disabled={loading}>
              拉取并回填配置
            </button>
          </div>
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>服务器配置</h3>
          <div className="form-row">
            <div className="field half">
              <label>CPU 型号</label>
              <input value={form.cpuModel} onChange={(e) => updateFormValue('cpuModel', e.target.value)} />
            </div>
            <div className="field half">
              <label>CPU 核数</label>
              <input type="number" value={form.cpuCores} onChange={(e) => updateFormValue('cpuCores', e.target.value)} />
            </div>
            <div className="field third">
              <label>内存（GB）</label>
              <input type="number" value={form.memoryGb} onChange={(e) => updateFormValue('memoryGb', e.target.value)} />
            </div>
            <div className="field third">
              <label>硬盘（GB）</label>
              <input type="number" value={form.diskGb} onChange={(e) => updateFormValue('diskGb', e.target.value)} />
            </div>
            <div className="field third">
              <label>硬盘类型</label>
              <input value={form.diskType} onChange={(e) => updateFormValue('diskType', e.target.value)} />
            </div>
            <div className="field third">
              <label>IP 数量</label>
              <input type="number" value={form.ipCount} onChange={(e) => updateFormValue('ipCount', e.target.value)} />
            </div>
            <div className="field third">
              <label>DDoS（G）</label>
              <input type="number" value={form.ddos} onChange={(e) => updateFormValue('ddos', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>网络与线路</h3>
          <div className="form-row">
            <div className="field third">
              <label>带宽（Mbps）</label>
              <input
                type="number"
                value={form.bandwidthMbps}
                onChange={(e) => updateFormValue('bandwidthMbps', e.target.value)}
              />
            </div>
            <div className="field third">
              <label>流量（GB/月）</label>
              <input
                type="number"
                value={form.trafficLimit}
                onChange={(e) => updateFormValue('trafficLimit', e.target.value)}
              />
            </div>
            <div className="field third">
              <label>到期日期</label>
              <input type="date" value={form.expireAt} onChange={(e) => updateFormValue('expireAt', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>交易信息</h3>
          <div className="form-row">
            <div className="field third">
              <label>售价（元）*</label>
              <input type="number" value={form.salePrice} onChange={(e) => updateFormValue('salePrice', e.target.value)} />
            </div>
            <div className="field third">
              <label>原购入价（元）</label>
              <input type="number" value={form.purchasePrice} onChange={(e) => updateFormValue('purchasePrice', e.target.value)} />
            </div>
            <div className="field third">
              <label>最低接受价（元）</label>
              <input type="number" value={form.minAcceptPrice} onChange={(e) => updateFormValue('minAcceptPrice', e.target.value)} />
            </div>
            <div className="field third">
              <label>续费参考价（元）</label>
              <input type="number" value={form.renewPrice} onChange={(e) => updateFormValue('renewPrice', e.target.value)} />
            </div>
            <div className="field third">
              <label>交付方式</label>
              <select value={form.deliveryType} onChange={(e) => updateFormValue('deliveryType', e.target.value)}>
                <option value="FULL_ACCOUNT">FULL_ACCOUNT</option>
                <option value="PANEL_TRANSFER">PANEL_TRANSFER</option>
                <option value="SUB_ACCOUNT">SUB_ACCOUNT</option>
                <option value="EMAIL_CHANGE">EMAIL_CHANGE</option>
              </select>
            </div>
            <div className="field third">
              <label>服务费承担方</label>
              <select value={form.feePayer} onChange={(e) => updateFormValue('feePayer', e.target.value)}>
                <option value="SELLER">SELLER（卖家）</option>
                <option value="BUYER">BUYER（买家）</option>
                <option value="SHARED">SHARED（分摊）</option>
              </select>
            </div>
          </div>
          <div className="status-line">
            <label><input type="checkbox" checked={form.negotiable} onChange={(e) => updateFormValue('negotiable', e.target.checked)} /> 支持议价</label>
            <label><input type="checkbox" checked={form.consignment} onChange={(e) => updateFormValue('consignment', e.target.checked)} /> 寄售模式</label>
            <label><input type="checkbox" checked={form.isPremium} onChange={(e) => updateFormValue('isPremium', e.target.checked)} /> 设为急售</label>
            <label><input type="checkbox" checked={form.canChangeEmail} onChange={(e) => updateFormValue('canChangeEmail', e.target.checked)} /> 可改邮箱</label>
            <label><input type="checkbox" checked={form.canChangeRealname} onChange={(e) => updateFormValue('canChangeRealname', e.target.checked)} /> 可改实名</label>
            <label><input type="checkbox" checked={form.canTest} onChange={(e) => updateFormValue('canTest', e.target.checked)} /> 支持测试</label>
            <label><input type="checkbox" checked={form.canTransfer} onChange={(e) => updateFormValue('canTransfer', e.target.checked)} /> 支持过户</label>
          </div>
          {form.isPremium ? (
            <div className="field third">
              <label>急售溢价比例（0-1，可选）</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.premiumRate}
                onChange={(e) => updateFormValue('premiumRate', e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>风险说明</h3>
          <div className="form-row">
            <div className="field full">
              <label>风险标签（逗号分隔）</label>
              <input
                value={form.riskTags}
                onChange={(e) => updateFormValue('riskTags', e.target.value)}
                placeholder="例如：临近到期, 限制改实名"
              />
            </div>
            <div className="field full">
              <label>商品说明</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateFormValue('description', e.target.value)}
                placeholder="说明配置来源、交付方式、可协商事项、注意事项等"
              />
            </div>
          </div>
        </div>

        <div className="card nested stack-12">
          <h3 style={{ fontSize: 16 }}>图片 / 凭证 / 说明材料</h3>
          <p className="input-help">支持填写多个链接，使用逗号或换行分隔，保存后会自动追加到商品附件。</p>
          <div className="form-row">
            <div className="field full">
              <label>账单凭证（BILL）</label>
              <textarea rows={2} value={form.billImages} onChange={(e) => updateFormValue('billImages', e.target.value)} />
            </div>
            <div className="field full">
              <label>面板截图（PANEL）</label>
              <textarea rows={2} value={form.panelImages} onChange={(e) => updateFormValue('panelImages', e.target.value)} />
            </div>
            <div className="field full">
              <label>性能测试截图（BENCHMARK）</label>
              <textarea
                rows={2}
                value={form.benchmarkImages}
                onChange={(e) => updateFormValue('benchmarkImages', e.target.value)}
              />
            </div>
            <div className="field full">
              <label>其他材料（OTHER）</label>
              <textarea rows={2} value={form.otherImages} onChange={(e) => updateFormValue('otherImages', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="sticky-actions">
          <button onClick={createProduct} className="btn primary" disabled={loading || !form.title.trim()}>
            {loading ? '处理中...' : '保存并创建商品'}
          </button>
          <button onClick={() => setForm(defaultForm)} className="btn secondary" type="button">
            清空重填
          </button>
          <p className="footer-note">创建后可在下方商品卡继续编辑并提交审核。</p>
        </div>
      </section>

      <section className="card stack-16">
        <div className="section-head">
          <h3>我的商品</h3>
          <div className="toolbar">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="PENDING">审核中</option>
              <option value="ONLINE">已上架</option>
              <option value="OFFLINE">已下架</option>
              <option value="DRAFT">草稿</option>
            </select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">暂无商品，先发布第一条交易信息吧。</div>
        ) : (
          <div className="cards">
            {products.map((item) => (
              <article className="card nested stack-12" key={item.id}>
                <div className="card-header">
                  <div className="stack-8">
                    <h3 style={{ fontSize: 16 }}>{item.title}</h3>
                    <p className="muted">
                      编号：{item.code || item.id} · {item.category} · {item.region}
                    </p>
                    {item.isPremium ? <span className="status-chip danger">急售</span> : null}
                  </div>
                  <span className={statusClass[item.status] || 'status-chip'}>
                    {statusLabel[item.status] || item.status}
                  </span>
                </div>

                <div className="spec-grid">
                  <div className="spec-item">
                    <p className="label">售价</p>
                    <p className="value">¥{Number(item.salePrice).toFixed(2)}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">原购入价</p>
                    <p className="value">
                      {item.purchasePrice ? `¥${Number(item.purchasePrice).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div className="spec-item">
                    <p className="label">最低接受价</p>
                    <p className="value">
                      {item.minAcceptPrice ? `¥${Number(item.minAcceptPrice).toFixed(2)}` : '-'}
                    </p>
                  </div>
                  <div className="spec-item">
                    <p className="label">交付方式</p>
                    <p className="value">{item.deliveryType}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">服务费承担</p>
                    <p className="value">{item.feePayer || 'SELLER'}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">线路</p>
                    <p className="value">{item.lineType || '-'}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">更新时间</p>
                    <p className="value">{new Date(item.updatedAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>

                <div className="status-line">
                  {item.canTest ? <span className="status-chip info">支持测试</span> : null}
                  {item.canTransfer ? <span className="status-chip info">支持过户</span> : null}
                </div>

                {!!item.riskTags?.length && (
                  <div className="tags">
                    {item.riskTags.map((tag) => (
                      <span key={tag} className="status-chip warning">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {item.audits?.[0]?.reason && <p className="muted">最近审核备注：{item.audits[0].reason}</p>}

                <div className="form">
                  <label>提交审核备注（可选）</label>
                  <input
                    value={remarks[item.id] || ''}
                    onChange={(e) =>
                      setRemarks((prev) => ({
                        ...prev,
                        [item.id]: e.target.value
                      }))
                    }
                  />
                </div>

                <div className="actions">
                  <button onClick={() => startEdit(item)} disabled={loading} className="btn secondary">
                    编辑
                  </button>
                  {item.status !== 'ONLINE' && (
                    <button onClick={() => submitAudit(item.id)} disabled={loading} className="btn primary">
                      提交审核
                    </button>
                  )}
                  {item.status === 'ONLINE' && (
                    <button onClick={() => toggleOnline(item.id, 'offline')} disabled={loading} className="btn secondary">
                      下架
                    </button>
                  )}
                  {item.status === 'OFFLINE' && (
                    <button onClick={() => toggleOnline(item.id, 'online')} disabled={loading} className="btn primary">
                      上架
                    </button>
                  )}
                  <button
                    onClick={() => toggleUrgent(item.id, !item.isPremium)}
                    disabled={loading}
                    className="btn secondary"
                    type="button"
                  >
                    {item.isPremium ? '取消急售' : '设为急售'}
                  </button>
                  <button
                    onClick={() => deleteProduct(item.id)}
                    disabled={loading || item.status === 'ONLINE'}
                    className="btn secondary"
                    type="button"
                    title={item.status === 'ONLINE' ? '请先下架再删除' : '删除商品'}
                  >
                    删除
                  </button>
                </div>

                {editingId === item.id && (
                  <div className="card stack-12">
                    <h3 style={{ fontSize: 15 }}>编辑商品</h3>
                    <div className="form-row">
                      <div className="field full">
                        <label>标题</label>
                        <input value={editForm.title} onChange={(e) => updateEditFormValue('title', e.target.value)} />
                      </div>
                      <div className="field third">
                        <label>分类</label>
                        <select value={editForm.category} onChange={(e) => updateEditFormValue('category', e.target.value)}>
                          <option value="DEDICATED">DEDICATED</option>
                          <option value="VPS">VPS</option>
                          <option value="CLOUD">CLOUD</option>
                          <option value="NAT">NAT</option>
                          <option value="LINE">LINE</option>
                        </select>
                      </div>
                      <div className="field third">
                        <label>地区</label>
                        <input value={editForm.region} onChange={(e) => updateEditFormValue('region', e.target.value)} />
                      </div>
                      <div className="field third">
                        <label>售价</label>
                        <input
                          type="number"
                          value={editForm.salePrice}
                          onChange={(e) => updateEditFormValue('salePrice', e.target.value)}
                        />
                      </div>
                      <div className="field third">
                        <label>原购入价</label>
                        <input
                          type="number"
                          value={editForm.purchasePrice}
                          onChange={(e) => updateEditFormValue('purchasePrice', e.target.value)}
                        />
                      </div>
                      <div className="field third">
                        <label>最低接受价</label>
                        <input
                          type="number"
                          value={editForm.minAcceptPrice}
                          onChange={(e) => updateEditFormValue('minAcceptPrice', e.target.value)}
                        />
                      </div>
                      <div className="field half">
                        <label>线路</label>
                        <input value={editForm.lineType} onChange={(e) => updateEditFormValue('lineType', e.target.value)} />
                      </div>
                      <div className="field half">
                        <label>交付方式</label>
                        <select
                          value={editForm.deliveryType}
                          onChange={(e) => updateEditFormValue('deliveryType', e.target.value)}
                        >
                          <option value="FULL_ACCOUNT">FULL_ACCOUNT</option>
                          <option value="PANEL_TRANSFER">PANEL_TRANSFER</option>
                          <option value="SUB_ACCOUNT">SUB_ACCOUNT</option>
                          <option value="EMAIL_CHANGE">EMAIL_CHANGE</option>
                        </select>
                      </div>
                      <div className="field half">
                        <label>服务费承担方</label>
                        <select
                          value={editForm.feePayer}
                          onChange={(e) => updateEditFormValue('feePayer', e.target.value)}
                        >
                          <option value="SELLER">SELLER（卖家）</option>
                          <option value="BUYER">BUYER（买家）</option>
                          <option value="SHARED">SHARED（分摊）</option>
                        </select>
                      </div>
                      <div className="field full">
                        <div className="status-line">
                          <label><input type="checkbox" checked={editForm.canTest} onChange={(e) => updateEditFormValue('canTest', e.target.checked)} /> 支持测试</label>
                          <label><input type="checkbox" checked={editForm.canTransfer} onChange={(e) => updateEditFormValue('canTransfer', e.target.checked)} /> 支持过户</label>
                        </div>
                      </div>
                      <div className="field full">
                        <label>风险标签</label>
                        <input
                          value={editForm.riskTags}
                          onChange={(e) => updateEditFormValue('riskTags', e.target.value)}
                          placeholder="逗号分隔"
                        />
                      </div>
                      <div className="field full">
                        <label>描述</label>
                        <textarea
                          rows={3}
                          value={editForm.description}
                          onChange={(e) => updateEditFormValue('description', e.target.value)}
                        />
                      </div>
                      <div className="field full">
                        <label>账单凭证链接（BILL）</label>
                        <textarea
                          rows={2}
                          value={editForm.billImages}
                          onChange={(e) => updateEditFormValue('billImages', e.target.value)}
                          placeholder="多个链接用逗号或换行分隔"
                        />
                      </div>
                      <div className="field full">
                        <label>面板截图链接（PANEL）</label>
                        <textarea
                          rows={2}
                          value={editForm.panelImages}
                          onChange={(e) => updateEditFormValue('panelImages', e.target.value)}
                          placeholder="多个链接用逗号或换行分隔"
                        />
                      </div>
                      <div className="field full">
                        <label>性能测试截图（BENCHMARK）</label>
                        <textarea
                          rows={2}
                          value={editForm.benchmarkImages}
                          onChange={(e) => updateEditFormValue('benchmarkImages', e.target.value)}
                          placeholder="多个链接用逗号或换行分隔"
                        />
                      </div>
                      <div className="field full">
                        <label>其他材料链接（OTHER）</label>
                        <textarea
                          rows={2}
                          value={editForm.otherImages}
                          onChange={(e) => updateEditFormValue('otherImages', e.target.value)}
                          placeholder="多个链接用逗号或换行分隔"
                        />
                      </div>
                    </div>
                    <div className="actions">
                      <button onClick={updateProduct} disabled={loading} className="btn primary">
                        保存修改
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn secondary" type="button">
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
