"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime
} from '../../../components/admin/console-primitives';
import {
  NOTICE_CHANNEL_LABEL,
  NOTICE_CHANNEL_MODE_LABEL,
  NOTICE_STATUS_LABEL,
  labelByMap
} from '../../../lib/admin-enums';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Notice = {
  id: string;
  userId?: string | null;
  channel?: 'SITE' | 'EMAIL' | 'TG' | 'SMS' | 'WECHAT_TEMPLATE' | string;
  type: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  payload?: {
    title?: string | null;
    content?: string;
  } | null;
  createdAt: string;
  user?: {
    email?: string;
  } | null;
};

type ChannelHealth = {
  channel: 'SITE' | 'EMAIL' | 'TG' | 'SMS' | 'WECHAT_TEMPLATE' | string;
  mode: 'INTERNAL' | 'MOCK' | 'REMOTE' | 'DISABLED' | string;
  configured: boolean;
  enabled: boolean;
  metrics24h?: {
    pending: number;
    sent: number;
    failed: number;
  };
  latest?: {
    status: 'PENDING' | 'SENT' | 'FAILED' | string;
    createdAt: string;
    sentAt?: string | null;
  } | null;
};

function statusTone(status: string) {
  if (status === 'SENT') return 'success' as const;
  if (status === 'FAILED') return 'danger' as const;
  return 'info' as const;
}

export default function AdminNoticesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<Notice[]>([]);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [type, setType] = useState('SYSTEM_NOTICE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState('');
  const [sendSite, setSendSite] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendTg, setSendTg] = useState(false);
  const [sendSms, setSendSms] = useState(false);
  const [sendWechatTemplate, setSendWechatTemplate] = useState(false);
  const [tgChatId, setTgChatId] = useState('');
  const [channelHealth, setChannelHealth] = useState<ChannelHealth[]>([]);
  const [testChannel, setTestChannel] = useState('SITE');
  const [testTargetUserId, setTestTargetUserId] = useState('');
  const [testTgChatId, setTestTgChatId] = useState('');
  const [testMobile, setTestMobile] = useState('');
  const [testOpenId, setTestOpenId] = useState('');
  const [testTemplateCode, setTestTemplateCode] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/notices?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取通知列表失败');
      setItems(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  const loadChannelHealth = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/notices/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取通知通道状态失败');
      setChannelHealth(Array.isArray(data.channels) ? data.channels : []);
    } catch (e: any) {
      setError(e.message || '读取通知通道状态失败');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadChannelHealth();
  }, [loadChannelHealth]);

  const filteredItems = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((item) => {
      return (
        item.id.toLowerCase().includes(key) ||
        item.type.toLowerCase().includes(key) ||
        (item.payload?.title || '').toLowerCase().includes(key) ||
        (item.payload?.content || '').toLowerCase().includes(key) ||
        (item.user?.email || '').toLowerCase().includes(key) ||
        (item.userId || '').toLowerCase().includes(key)
      );
    });
  }, [items, keyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredItems.find((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

  const submit = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const channels = [
        ...(sendSite ? ['SITE'] : []),
        ...(sendEmail ? ['EMAIL'] : []),
        ...(sendTg ? ['TG'] : []),
        ...(sendSms ? ['SMS'] : []),
        ...(sendWechatTemplate ? ['WECHAT_TEMPLATE'] : [])
      ];
      if (!channels.length) {
        throw new Error('至少选择一个通知渠道');
      }
      const res = await fetch(`${API_BASE}/admin/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId || undefined,
          type,
          title: title || undefined,
          content,
          channels,
          tgChatId: sendTg ? tgChatId || undefined : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '发送失败');
      setMessage(data.message || '发送成功');
      setContent('');
      setTitle('');
      setUserId('');
      await load();
    } catch (e: any) {
      setError(e.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const sendChannelTest = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/notices/channels/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          channel: testChannel,
          userId: testTargetUserId || undefined,
          tgChatId: testTgChatId || undefined,
          mobile: testMobile || undefined,
          openId: testOpenId || undefined,
          templateCode: testTemplateCode || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '通道测试失败');
      setMessage(data.message || '通道测试已触发');
      await Promise.all([load(), loadChannelHealth()]);
    } catch (e: any) {
      setError(e.message || '通道测试失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 通知管理"
        title="多渠道通知与触达记录"
        description="支持面向全体用户或指定用户发送站内 / 邮件 / Telegram 通知，并统一查看触达状态。"
        tags={[
          { label: '交易通知', tone: 'info' },
          { label: '系统公告', tone: 'warning' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel
        title="发送区"
        description="`userId` 留空则广播给全部正常用户，建议公告内容简明清晰并标注处理指引。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>通知类型</label>
            <input value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="field">
            <label>标题（可选）</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>指定用户 ID（可选）</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="留空即广播" />
          </div>
          <div className="field">
            <label>Telegram ChatId（可选）</label>
            <input value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="未填则用服务端默认" />
          </div>
        </div>

        <div className="status-line">
          <label><input type="checkbox" checked={sendSite} onChange={(e) => setSendSite(e.target.checked)} /> 站内通知</label>
          <label><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> 邮件通知</label>
          <label><input type="checkbox" checked={sendTg} onChange={(e) => setSendTg(e.target.checked)} /> Telegram</label>
          <label><input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} /> SMS</label>
          <label><input type="checkbox" checked={sendWechatTemplate} onChange={(e) => setSendWechatTemplate(e.target.checked)} /> 微信模板</label>
        </div>

        <div className="form">
          <label>通知内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="例如：订单核验流程升级，请卖家及时补充交付凭证"
          />
        </div>

        <div className="actions">
          <button onClick={submit} disabled={loading || !type || !content} className="btn primary">
            {loading ? '发送中...' : '发送通知'}
          </button>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="通道健康与测试"
        description="查看各通知通道运行模式（INTERNAL/MOCK/REMOTE/DISABLED）与近 24h 发送状态，并支持单通道测试。"
        className="stack-12"
      >
        <div className="console-table-wrap">
          <table className="console-table console-table-mobile">
            <thead>
              <tr>
                <th>通道</th>
                <th>模式 / 配置</th>
                <th>近 24h 状态</th>
                <th>最近记录</th>
              </tr>
            </thead>
            <tbody>
              {channelHealth.length ? (
                channelHealth.map((item) => (
                  <tr key={item.channel}>
                    <td data-label="通道">
                      <div className="console-row-primary">{labelByMap(item.channel, NOTICE_CHANNEL_LABEL, item.channel)}</div>
                    </td>
                    <td data-label="模式 / 配置">
                      <div className="console-inline-tags">
                        <StatusBadge tone={item.mode === 'DISABLED' ? 'warning' : item.mode === 'REMOTE' ? 'success' : 'info'}>
                          {labelByMap(item.mode, NOTICE_CHANNEL_MODE_LABEL, item.mode)}
                        </StatusBadge>
                        <StatusBadge tone={item.configured ? 'success' : 'warning'}>
                          {item.configured ? '已配置' : '未配置'}
                        </StatusBadge>
                      </div>
                    </td>
                    <td data-label="近 24h 状态">
                      <p className="console-row-sub">
                        已发送 {item.metrics24h?.sent || 0} / 失败 {item.metrics24h?.failed || 0} / 待发送 {item.metrics24h?.pending || 0}
                      </p>
                    </td>
                    <td data-label="最近记录">
                      {item.latest ? (
                        <p className="console-row-sub">
                          {labelByMap(item.latest.status, NOTICE_STATUS_LABEL, item.latest.status)} · {formatDateTime(item.latest.sentAt || item.latest.createdAt)}
                        </p>
                      ) : (
                        <p className="console-row-sub">暂无记录</p>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <ConsoleEmpty text="暂无通道状态数据" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="console-filter-grid">
          <div className="field">
            <label>测试通道</label>
            <select value={testChannel} onChange={(e) => setTestChannel(e.target.value)}>
              <option value="SITE">站内通知</option>
              <option value="EMAIL">邮件</option>
              <option value="TG">Telegram</option>
              <option value="SMS">短信</option>
              <option value="WECHAT_TEMPLATE">微信模板</option>
            </select>
          </div>
          <div className="field">
            <label>测试目标用户 ID（可选）</label>
            <input value={testTargetUserId} onChange={(e) => setTestTargetUserId(e.target.value)} placeholder="留空默认当前管理员" />
          </div>
          <div className="field">
            <label>TG ChatId（可选）</label>
            <input value={testTgChatId} onChange={(e) => setTestTgChatId(e.target.value)} placeholder="仅 TG 使用" />
          </div>
          <div className="field">
            <label>手机号（可选）</label>
            <input value={testMobile} onChange={(e) => setTestMobile(e.target.value)} placeholder="仅 SMS 使用" />
          </div>
          <div className="field">
            <label>OpenId（可选）</label>
            <input value={testOpenId} onChange={(e) => setTestOpenId(e.target.value)} placeholder="仅微信模板使用" />
          </div>
          <div className="field">
            <label>模板编码（可选）</label>
            <input value={testTemplateCode} onChange={(e) => setTestTemplateCode(e.target.value)} placeholder="仅微信模板使用" />
          </div>
        </div>

        <div className="actions">
          <button onClick={sendChannelTest} className="btn secondary" disabled={loading}>
            {loading ? '测试发送中...' : '执行通道测试'}
          </button>
          <button onClick={loadChannelHealth} className="btn ghost" disabled={loading}>
            刷新通道状态
          </button>
        </div>
      </ConsolePanel>

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>状态筛选</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="PENDING">待发送</option>
              <option value="SENT">已发送</option>
              <option value="FAILED">发送失败</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="标题 / 内容 / 用户 / 类型"
            />
          </div>
          <div className="field">
            <label>触达范围</label>
            <input value="全体 / 指定用户" disabled />
          </div>
          <div className="field">
            <label>通知渠道</label>
            <input value="站内 / 邮件 / Telegram / SMS / 微信模板" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 通知记录" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无通知记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>通知</th>
                  <th>目标用户</th>
                  <th>类型</th>
                  <th>渠道 / 状态</th>
                  <th>发送时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td data-label="通知">
                      <div className="console-row-primary">{item.payload?.title || item.type}</div>
                      <p className="console-row-sub">{item.payload?.content || '无内容'}</p>
                    </td>
                    <td data-label="目标用户">
                      <div className="console-row-primary">{item.user?.email || item.userId || '广播记录'}</div>
                    </td>
                    <td data-label="类型">
                      <div className="console-row-primary">{item.type}</div>
                    </td>
                    <td data-label="渠道 / 状态">
                      <div className="console-inline-tags">
                        <StatusBadge tone="info">{labelByMap(item.channel || 'SITE', NOTICE_CHANNEL_LABEL, item.channel || 'SITE')}</StatusBadge>
                        <StatusBadge tone={statusTone(item.status)}>{labelByMap(item.status, NOTICE_STATUS_LABEL, item.status)}</StatusBadge>
                      </div>
                    </td>
                    <td data-label="发送时间">{formatDateTime(item.createdAt)}</td>
                    <td data-label="操作">
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedId === item.id ? '查看中' : '查看'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel title="详情操作区" className="console-detail stack-12">
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条通知记录查看详情" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">通知 ID</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">目标用户</p>
                <p className="value">{selectedItem.user?.email || selectedItem.userId || '广播记录'}</p>
              </div>
              <div className="spec-item">
                <p className="label">通知类型</p>
                <p className="value">{selectedItem.type}</p>
              </div>
              <div className="spec-item">
                <p className="label">状态</p>
                <p className="value">{labelByMap(selectedItem.status, NOTICE_STATUS_LABEL, selectedItem.status)}</p>
              </div>
              <div className="spec-item">
                <p className="label">通知渠道</p>
                <p className="value">{labelByMap(selectedItem.channel || 'SITE', NOTICE_CHANNEL_LABEL, selectedItem.channel || 'SITE')}</p>
              </div>
            </div>

            <div className="console-alert">通知建议：涉及订单、支付、风控处理时，尽量明确下一步操作入口与处理时限。</div>

            <div className="form">
              <label>通知内容</label>
              <textarea value={selectedItem.payload?.content || ''} rows={6} disabled />
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
