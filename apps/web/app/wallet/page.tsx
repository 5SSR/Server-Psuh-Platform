"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type WalletSummary = {
  balance: number | string;
  frozen: number | string;
  currency: string;
};

type WalletLedger = {
  id: string;
  type: string;
  amount: number | string;
  memo?: string | null;
  createdAt: string;
};

type Withdrawal = {
  id: string;
  amount: number | string;
  fee: number | string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  channel: string;
  accountInfo: string;
  createdAt: string;
  processedAt?: string | null;
};

type UserInfo = {
  role: string;
};

const withdrawStatusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '待打款',
  paid: '已打款',
  rejected: '已驳回'
};

const withdrawStatusClass: Record<string, string> = {
  pending: 'status-chip warning',
  approved: 'status-chip info',
  paid: 'status-chip success',
  rejected: 'status-chip danger'
};

export default function WalletPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [ledgerList, setLedgerList] = useState<WalletLedger[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const [rechargeAmount, setRechargeAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawChannel, setWithdrawChannel] = useState('ALIPAY');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const summary = useMemo(() => {
    const balance = Number(wallet?.balance || 0);
    const frozen = Number(wallet?.frozen || 0);
    const total = balance + frozen;
    return { balance, frozen, total };
  }, [wallet?.balance, wallet?.frozen]);

  const loadAll = useCallback(async () => {
    if (!token) {
      setError('请先登录后查看钱包');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [walletRes, ledgerRes, withdrawRes, meRes] = await Promise.all([
        fetch(`${API_BASE}/wallet`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/wallet/ledger?page=1&pageSize=20`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/wallet/withdrawals?page=1&pageSize=20`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const walletData = await walletRes.json();
      const ledgerData = await ledgerRes.json();
      const withdrawData = await withdrawRes.json();
      const meData = await meRes.json();

      if (!walletRes.ok) throw new Error(walletData.message || '读取钱包失败');
      if (!ledgerRes.ok) throw new Error(ledgerData.message || '读取流水失败');
      if (!withdrawRes.ok) throw new Error(withdrawData.message || '读取提现记录失败');
      if (!meRes.ok) throw new Error(meData.message || '读取用户信息失败');

      setWallet(walletData);
      setLedgerList(ledgerData.list || []);
      setWithdrawals(withdrawData.list || []);
      setUserInfo(meData);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const recharge = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/wallet/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(rechargeAmount) || 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '充值失败');
      setMessage('测试充值成功，余额已更新。');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '充值失败');
    } finally {
      setLoading(false);
    }
  };

  const applyWithdraw = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/wallet/withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(withdrawAmount) || 0,
          channel: withdrawChannel,
          accountInfo: withdrawAccount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提现申请失败');
      setMessage(data.message || '提现申请成功');
      await loadAll();
    } catch (e: any) {
      setError(e.message || '提现申请失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">资金中心</p>
          <h1>钱包 / 结算 / 提现</h1>
          <p className="muted">身份：{userInfo?.role || '未知'}，资金流水与结算记录可追踪。</p>
        </div>
        <button onClick={loadAll} className="btn secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">可用余额</p>
          <p className="metric-value">¥{summary.balance.toFixed(2)}</p>
          <p className="metric-tip">可用于支付或提现</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">冻结金额</p>
          <p className="metric-value">¥{summary.frozen.toFixed(2)}</p>
          <p className="metric-tip">托管订单资金与风控冻结</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">账户总资产</p>
          <p className="metric-value">¥{summary.total.toFixed(2)}</p>
          <p className="metric-tip">币种：{wallet?.currency || 'CNY'}</p>
        </article>
      </section>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="grid">
        <article className="card stack-12" style={{ gridColumn: 'span 6' }}>
          <h3>钱包充值（测试）</h3>
          <div className="form-row">
            <div className="field half">
              <label>充值金额</label>
              <input type="number" min="1" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
            </div>
            <div className="field half">
              <label>操作</label>
              <button onClick={recharge} className="btn primary" disabled={loading}>
                {loading ? '处理中...' : '确认充值'}
              </button>
            </div>
          </div>
        </article>

        <article className="card stack-12" style={{ gridColumn: 'span 6' }}>
          <h3>提现申请</h3>
          <div className="form-row">
            <div className="field third">
              <label>提现金额</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="field third">
              <label>提现渠道</label>
              <select value={withdrawChannel} onChange={(e) => setWithdrawChannel(e.target.value)}>
                <option value="ALIPAY">ALIPAY</option>
                <option value="WECHAT">WECHAT</option>
                <option value="BANK">BANK</option>
              </select>
            </div>
            <div className="field third">
              <label>收款账户</label>
              <input
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                placeholder="例如：支付宝 138xxxxxx"
              />
            </div>
          </div>
          <div className="actions">
            <button onClick={applyWithdraw} className="btn primary" disabled={loading || !withdrawAccount.trim()}>
              {loading ? '处理中...' : '提交提现申请'}
            </button>
          </div>
        </article>
      </section>

      <section className="card stack-16">
        <div className="section-head">
          <h3>提现记录</h3>
          <span className="muted">共 {withdrawals.length} 条</span>
        </div>

        {withdrawals.length === 0 ? (
          <div className="empty-state">暂无提现记录</div>
        ) : (
          <div className="cards">
            {withdrawals.map((item) => (
              <article className="card nested stack-8" key={item.id}>
                <div className="card-header">
                  <strong>¥{Number(item.amount).toFixed(2)}</strong>
                  <span className={withdrawStatusClass[item.status] || 'status-chip'}>
                    {withdrawStatusLabel[item.status] || item.status}
                  </span>
                </div>
                <p className="muted">手续费：¥{Number(item.fee).toFixed(2)}</p>
                <p className="muted">渠道：{item.channel}</p>
                <p className="muted">账号：{item.accountInfo}</p>
                <p className="muted">申请时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                {item.processedAt && (
                  <p className="muted">处理时间：{new Date(item.processedAt).toLocaleString('zh-CN')}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack-16">
        <div className="section-head">
          <h3>钱包流水</h3>
          <span className="muted">共 {ledgerList.length} 条</span>
        </div>

        {ledgerList.length === 0 ? (
          <div className="empty-state">暂无流水</div>
        ) : (
          <div className="cards">
            {ledgerList.map((item) => (
              <article className="card nested stack-8" key={item.id}>
                <div className="card-header">
                  <span className="status-chip">{item.type}</span>
                  <strong className="price">¥{Number(item.amount).toFixed(2)}</strong>
                </div>
                <p className="muted">{item.memo || '无备注'}</p>
                <p className="muted">{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
