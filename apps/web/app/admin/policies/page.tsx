"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime
} from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type PolicyItem = {
  id: string;
  code: string;
  title: string;
  content: string;
  isActive: boolean;
  position: number;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

const policyCodeLabel: Record<string, string> = {
  RULES: '交易规则',
  AGREEMENT: '服务协议'
};

export default function AdminPoliciesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [list, setList] = useState<PolicyItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [createForm, setCreateForm] = useState({
    code: 'RULES',
    title: '平台交易规则',
    content: '',
    position: 0,
    isActive: true
  });
  const [editForm, setEditForm] = useState({
    code: 'RULES',
    title: '',
    content: '',
    position: 0,
    isActive: true
  });

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
      const res = await fetch(`${API_BASE}/admin/content/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取规则文档失败');
      setList(data || []);
    } catch (e: any) {
      setError(e.message || '读取规则文档失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!list.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !list.find((item) => item.id === selectedId)) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  const selected = useMemo(() => list.find((item) => item.id === selectedId) || null, [list, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setEditForm({
      code: selected.code,
      title: selected.title,
      content: selected.content,
      position: selected.position,
      isActive: selected.isActive
    });
  }, [selected]);

  const createPolicy = async () => {
    if (!token) return;
    if (!createForm.code.trim() || !createForm.title.trim() || !createForm.content.trim()) {
      setError('请完整填写文档编码、标题与正文');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/content/policies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: createForm.code,
          title: createForm.title,
          content: createForm.content,
          position: Number(createForm.position) || 0,
          isActive: createForm.isActive
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '创建文档失败');
      setMessage('规则文档已创建');
      setCreateForm((prev) => ({
        ...prev,
        content: ''
      }));
      await load();
    } catch (e: any) {
      setError(e.message || '创建文档失败');
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async () => {
    if (!token || !selected) return;
    if (!editForm.code.trim() || !editForm.title.trim() || !editForm.content.trim()) {
      setError('请完整填写文档编码、标题与正文');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/content/policies/${selected.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: editForm.code,
          title: editForm.title,
          content: editForm.content,
          position: Number(editForm.position) || 0,
          isActive: editForm.isActive
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '更新文档失败');
      setMessage('规则文档已更新');
      await load();
    } catch (e: any) {
      setError(e.message || '更新文档失败');
    } finally {
      setLoading(false);
    }
  };

  const removePolicy = async (id: string) => {
    if (!token) return;
    if (!window.confirm('确认删除该规则文档？')) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/content/policies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '删除文档失败');
      setMessage('规则文档已删除');
      await load();
    } catch (e: any) {
      setError(e.message || '删除文档失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 规则协议"
        title="规则与协议文档管理"
        description="统一维护平台交易规则和服务协议，前台规则页与协议页直接读取本模块数据。"
        tags={[
          { label: `文档 ${list.length} 条`, tone: 'default' },
          { label: '交易规则', tone: 'info' },
          { label: '服务协议', tone: 'warning' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新'}
          </button>
        }
      />

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="新增文档" className="stack-12">
        <div className="form-row">
          <div className="field third">
            <label>编码</label>
            <select
              value={createForm.code}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value }))}
            >
              <option value="RULES">交易规则</option>
              <option value="AGREEMENT">服务协议</option>
            </select>
          </div>
          <div className="field third">
            <label>标题</label>
            <input
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="field third">
            <label>排序</label>
            <input
              type="number"
              value={createForm.position}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, position: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="field full">
            <label>正文内容</label>
            <textarea
              rows={6}
              value={createForm.content}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="按段落编写规则内容，前台将自动按空行分段展示"
            />
          </div>
          <label className="checkbox-line" style={{ gridColumn: 'span 2' }}>
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span>立即生效</span>
          </label>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={createPolicy} disabled={loading}>
            创建文档
          </button>
        </div>
      </ConsolePanel>

      <ConsolePanel title="表格区 · 文档列表" className="stack-12">
        {list.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无文档'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>编码 / 类型</th>
                  <th>标题</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id}>
                    <td data-label="编码 / 类型">
                      <div className="console-row-primary">{item.code}</div>
                      <p className="console-row-sub">{policyCodeLabel[item.code] || '规则文档'}</p>
                    </td>
                    <td data-label="标题">{item.title}</td>
                    <td data-label="状态">
                      <StatusBadge tone={item.isActive ? 'success' : 'default'}>
                        {item.isActive ? '已生效' : '已停用'}
                      </StatusBadge>
                    </td>
                    <td data-label="更新时间">{formatDateTime(item.updatedAt)}</td>
                    <td data-label="操作">
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button
                          className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          {selectedId === item.id ? '编辑中' : '编辑'}
                        </button>
                        <button className="btn secondary btn-sm" onClick={() => removePolicy(item.id)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel title="详情操作区" className="stack-12">
        {!selected ? (
          <ConsoleEmpty text="请选择一条规则文档进行编辑" />
        ) : (
          <>
            <div className="form-row">
              <div className="field third">
                <label>编码</label>
                <select
                  value={editForm.code}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                >
                  <option value="RULES">交易规则</option>
                  <option value="AGREEMENT">服务协议</option>
                </select>
              </div>
              <div className="field third">
                <label>标题</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="field third">
                <label>排序</label>
                <input
                  type="number"
                  value={editForm.position}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, position: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="field full">
                <label>正文内容</label>
                <textarea
                  rows={8}
                  value={editForm.content}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <label className="checkbox-line" style={{ gridColumn: 'span 2' }}>
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <span>文档生效</span>
              </label>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={updatePolicy} disabled={loading}>
                保存更新
              </button>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
