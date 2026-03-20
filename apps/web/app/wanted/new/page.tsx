'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toLocaleHref, toLocaleRoute } from '../../../lib/locale';
import { useLocale } from '../../../lib/use-locale';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

const CATEGORIES = ['VPS', 'DEDICATED', 'CLOUD', 'NAT', 'LINE'];

export default function WantedCreatePage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [lineType, setLineType] = useState('');
  const [cpuCores, setCpuCores] = useState('');
  const [memoryGb, setMemoryGb] = useState('');
  const [diskGb, setDiskGb] = useState('');
  const [bandwidthMbps, setBandwidthMbps] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [acceptPremium, setAcceptPremium] = useState(false);
  const [description, setDescription] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('idc_token');
    if (!token) {
      setError(t('请先登录后发布求购', 'Please sign in before posting wanted requests'));
      return;
    }

    if (!title.trim() || !region.trim()) {
      setError(t('请填写求购标题和目标地区', 'Please fill in title and target region'));
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API}/wanted`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          category: category || undefined,
          region: region.trim(),
          lineType: lineType.trim() || undefined,
          cpuCores: cpuCores ? Number(cpuCores) : undefined,
          memoryGb: memoryGb ? Number(memoryGb) : undefined,
          diskGb: diskGb ? Number(diskGb) : undefined,
          bandwidthMbps: bandwidthMbps ? Number(bandwidthMbps) : undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          acceptPremium,
          description: description.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('发布求购失败', 'Failed to create wanted request'));

      setMessage(t('求购需求已发布，卖家可开始匹配报价', 'Wanted request published. Sellers can now submit offers.'));
      setTimeout(() => {
        router.replace(toLocaleRoute('/wanted/mine', locale));
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('发布求购失败', 'Failed to create wanted request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">发布求购</p>
          <h1>创建服务器求购需求</h1>
          <p className="sub">描述你希望采购的配置、预算和线路偏好，平台将保留担保交易闭环。</p>
        </div>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <Link href={toLocaleHref('/wanted', locale)} className="btn secondary">返回求购市场</Link>
          <Link href={toLocaleHref('/wanted/mine', locale)} className="btn secondary">我的求购</Link>
        </div>
      </header>

      <form className="card stack-16" onSubmit={submit}>
        <div className="field">
          <label>求购标题</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：求购香港 CN2 高频 VPS（8核16G）" />
        </div>

        <div className="spec-grid">
          <div className="field">
            <label>目标分类</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">不限</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>地区</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="香港 / 东京 / 新加坡" />
          </div>
          <div className="field">
            <label>线路</label>
            <input value={lineType} onChange={(e) => setLineType(e.target.value)} placeholder="CN2 / CMI / 4837" />
          </div>
          <div className="field">
            <label>接受溢价</label>
            <select value={acceptPremium ? 'yes' : 'no'} onChange={(e) => setAcceptPremium(e.target.value === 'yes')}>
              <option value="no">否</option>
              <option value="yes">是</option>
            </select>
          </div>
        </div>

        <div className="spec-grid">
          <div className="field">
            <label>CPU（核）</label>
            <input type="number" min="1" value={cpuCores} onChange={(e) => setCpuCores(e.target.value)} placeholder="如 8" />
          </div>
          <div className="field">
            <label>内存（GB）</label>
            <input type="number" min="1" value={memoryGb} onChange={(e) => setMemoryGb(e.target.value)} placeholder="如 16" />
          </div>
          <div className="field">
            <label>硬盘（GB）</label>
            <input type="number" min="1" value={diskGb} onChange={(e) => setDiskGb(e.target.value)} placeholder="如 500" />
          </div>
          <div className="field">
            <label>带宽（Mbps）</label>
            <input type="number" min="1" value={bandwidthMbps} onChange={(e) => setBandwidthMbps(e.target.value)} placeholder="如 30" />
          </div>
        </div>

        <div className="spec-grid">
          <div className="field">
            <label>预算下限（元）</label>
            <input type="number" min="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="如 100" />
          </div>
          <div className="field">
            <label>预算上限（元）</label>
            <input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="如 300" />
          </div>
        </div>

        <div className="field">
          <label>需求补充说明</label>
          <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例如：偏好可改邮箱、可转面板、到期至少 20 天以上" />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <div className="toolbar">
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? '提交中...' : '提交求购'}
          </button>
          <span className="muted">提交后会在求购大厅展示，卖家可基于担保流程进行报价。</span>
        </div>
      </form>
    </main>
  );
}
