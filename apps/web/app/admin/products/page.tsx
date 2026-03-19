"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime,
  formatMoney
} from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Product = {
  id: string;
  title: string;
  code: string;
  category: string;
  region: string;
  salePrice: number | string;
  description?: string | null;
  sellerId: string;
  createdAt: string;
  audits?: Array<{
    status: string;
    reason?: string | null;
    createdAt: string;
  }>;
};

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState('');

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/products/pending?page=1&pageSize=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取待审商品失败');
      setProducts(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return products.filter((item) => {
      if (category && item.category !== category) return false;
      if (region.trim() && !item.region.toLowerCase().includes(region.trim().toLowerCase())) return false;
      if (!key) return true;
      return (
        item.title.toLowerCase().includes(key) ||
        item.code.toLowerCase().includes(key) ||
        item.sellerId.toLowerCase().includes(key)
      );
    });
  }, [products, keyword, category, region]);

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredProducts.find((item) => item.id === selectedId)) {
      setSelectedId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedId]);

  const selectedProduct = filteredProducts.find((item) => item.id === selectedId) || null;

  const audit = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    const reason = (reasons[id] || '').trim();
    if (status === 'REJECTED' && !reason) {
      setError('驳回时请填写原因');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/products/${id}/audit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          reason: reason || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '审核失败');
      setMessage(status === 'APPROVED' ? '审核通过，商品已上架' : '审核驳回完成');
      await load();
    } catch (e: any) {
      setError(e.message || '审核失败');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = Array.from(new Set(products.map((item) => item.category))).sort();

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 商品审核"
        title="待审商品管理"
        description="按商品配置、地区与卖家信息进行上架审核，统一沉淀审核意见，强化担保交易前置风控。"
        tags={[
          { label: '上架审核', tone: 'info' },
          { label: '担保链路前置校验', tone: 'warning' },
          { label: `待审 ${products.length} 条`, tone: 'default' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="标题 / 编号 / 卖家 ID"
            />
          </div>
          <div className="field">
            <label>商品类型</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">全部</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>地区</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="例如：香港 / 东京" />
          </div>
          <div className="field">
            <label>审核状态</label>
            <input value="待审核" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel
        title="表格区 · 待审核商品"
        description="统一展示核心交易字段，点击“处理”进入详情操作区。"
        className="stack-12"
      >
        {filteredProducts.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '当前筛选条件下无待审商品'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>类型 / 地区</th>
                  <th>价格</th>
                  <th>卖家</th>
                  <th>担保 / 风险</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="console-row-primary">{item.title}</div>
                      <p className="console-row-sub">编号：{item.code}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.category}</div>
                      <p className="console-row-sub">{item.region || '-'}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatMoney(item.salePrice)}</div>
                      <p className="console-row-sub">发布审核阶段</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.sellerId}</div>
                      <p className="console-row-sub">待核验卖家资质</p>
                    </td>
                    <td>
                      <div className="console-inline-tags">
                        <StatusBadge tone="info">担保交易商品</StatusBadge>
                        <StatusBadge tone="warning">待审核</StatusBadge>
                      </div>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <button
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                        onClick={() => setSelectedId(item.id)}
                        type="button"
                      >
                        {selectedId === item.id ? '处理中' : '处理'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区"
        description="填写审核意见后执行通过或驳回，驳回时请明确风险/不合规原因。"
        className="console-detail stack-12"
      >
        {!selectedProduct ? (
          <ConsoleEmpty text="请选择一条商品记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">商品标题</p>
                <p className="value">{selectedProduct.title}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品编号</p>
                <p className="value">{selectedProduct.code}</p>
              </div>
              <div className="spec-item">
                <p className="label">卖家 ID</p>
                <p className="value">{selectedProduct.sellerId}</p>
              </div>
              <div className="spec-item">
                <p className="label">标价</p>
                <p className="value">{formatMoney(selectedProduct.salePrice)}</p>
              </div>
            </div>

            <div className="console-alert">
              审核建议：重点核对商品描述真实性、交付方式可执行性、风险标签是否明确，确保可进入担保交易流程。
            </div>

            <div className="form">
              <label>审核备注（驳回必填）</label>
              <textarea
                value={reasons[selectedProduct.id] || ''}
                onChange={(e) =>
                  setReasons((prev) => ({
                    ...prev,
                    [selectedProduct.id]: e.target.value
                  }))
                }
                rows={4}
                placeholder="例如：配置参数与截图不一致，需要补充证明材料"
              />
            </div>

            <p className="muted">商品说明：{selectedProduct.description || '无商品说明'}</p>

            <div className="actions">
              <button onClick={() => audit(selectedProduct.id, 'APPROVED')} disabled={loading} className="btn primary">
                通过并上架
              </button>
              <button onClick={() => audit(selectedProduct.id, 'REJECTED')} disabled={loading} className="btn secondary">
                驳回并退回修改
              </button>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
