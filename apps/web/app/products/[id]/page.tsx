import Link from 'next/link';
import { api } from '../../../lib/api';
import { PurchaseBox } from '../../../components/purchase-box';
import { BargainBox } from '../../../components/bargain-box';
import { FavoriteButton, ImageGallery } from '../../../components/product-detail-extras';
import { RecordProductView } from '../../../components/record-product-view';

export const dynamic = 'force-dynamic';

function yesNo(v?: boolean | null) {
  if (v === undefined || v === null) return '未说明';
  return v ? '支持' : '不支持';
}

const CONSIGNMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: '寄售审核中',
  APPROVED: '寄售已通过',
  REJECTED: '寄售已驳回',
  CANCELED: '寄售已撤销'
};

function consignmentTone(status?: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warning';
  return '';
}

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const detail = await api.productDetail(params.id);
  const latestConsignment = detail.consignmentApplications?.[0];

  return (
    <main className="page page-shell">
      <RecordProductView productId={detail.id} />
      <Link href="/products" className="back-link">
        ← 返回交易列表
      </Link>

      <header className="section-head">
        <div className="stack-12">
          <p className="eyebrow">
            {detail.category} · {detail.region || '地区待补充'}
          </p>
          <h1>{detail.title}</h1>
          <div className="status-line">
            <span className="status-chip info">平台担保交易</span>
            <span className="status-chip">线路：{detail.lineType || '未标注'}</span>
            <span className="status-chip">交付方式：{detail.deliveryType || '未标注'}</span>
            <span className="status-chip">服务费：{detail.feePayer || 'SELLER'}</span>
            {detail.consignment ? <span className="status-chip success">平台寄售</span> : null}
            {latestConsignment?.status ? (
              <span className={`status-chip ${consignmentTone(latestConsignment.status)}`}>
                {CONSIGNMENT_STATUS_LABEL[latestConsignment.status] || latestConsignment.status}
              </span>
            ) : null}
            <span className="status-chip success">卖家 Lv.{detail.seller?.sellerProfile?.level ?? 1}</span>
            {!!detail.riskTags?.length && <span className="status-chip warning">存在风险提示</span>}
          </div>
        </div>
        <div className="stack-12" style={{ alignItems: 'flex-end' }}>
          <p className="price-lg">¥{Number(detail.salePrice).toFixed(2)}</p>
          <FavoriteButton productId={detail.id} />
        </div>
      </header>

      <div className="grid" style={{ alignItems: 'start' }}>
        <div style={{ gridColumn: 'span 8' }} className="stack-16">
          {detail.images && detail.images.length > 0 && <ImageGallery images={detail.images} />}

          <section className="card stack-12">
            <h3>服务器配置详情</h3>
            <div className="spec-grid">
              <div className="spec-item">
                <p className="label">CPU 型号</p>
                <p className="value">{detail.cpuModel || '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">CPU 核数</p>
                <p className="value">{detail.cpuCores ? `${detail.cpuCores} Core` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">内存</p>
                <p className="value">{detail.memoryGb ? `${detail.memoryGb} GB` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">硬盘</p>
                <p className="value">
                  {detail.diskGb ? `${detail.diskGb} GB` : '未填写'} {detail.diskType || ''}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">带宽</p>
                <p className="value">{detail.bandwidthMbps ? `${detail.bandwidthMbps} Mbps` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">流量</p>
                <p className="value">{detail.trafficLimit ? `${detail.trafficLimit} GB/月` : '不限/未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">IP 数量</p>
                <p className="value">{detail.ipCount || '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">DDoS 防护</p>
                <p className="value">{detail.ddos ? `${detail.ddos} G` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">机房 / 区域</p>
                <p className="value">{detail.datacenter || detail.region || '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">到期时间</p>
                <p className="value">
                  {detail.expireAt ? new Date(detail.expireAt).toLocaleDateString('zh-CN') : '未填写'}
                </p>
              </div>
            </div>
          </section>

          <section className="card stack-12">
            <h3>商品说明</h3>
            <p className="muted">{detail.description || '卖家暂未补充更多说明。'}</p>
            <div className="spec-grid">
              <div className="spec-item">
                <p className="label">可改邮箱</p>
                <p className="value">{yesNo(detail.canChangeEmail)}</p>
              </div>
              <div className="spec-item">
                <p className="label">可改实名</p>
                <p className="value">{yesNo(detail.canChangeRealname)}</p>
              </div>
              <div className="spec-item">
                <p className="label">支持议价</p>
                <p className="value">{yesNo(detail.negotiable)}</p>
              </div>
              <div className="spec-item">
                <p className="label">支持测试</p>
                <p className="value">{yesNo(detail.canTest)}</p>
              </div>
              <div className="spec-item">
                <p className="label">支持过户</p>
                <p className="value">{yesNo(detail.canTransfer)}</p>
              </div>
              <div className="spec-item">
                <p className="label">寄售模式</p>
                <p className="value">
                  {detail.consignment
                    ? '已启用（平台代管交付）'
                    : latestConsignment?.status
                      ? `${CONSIGNMENT_STATUS_LABEL[latestConsignment.status] || latestConsignment.status}`
                      : '未启用'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">续费价格</p>
                <p className="value">{detail.renewPrice ? `¥${Number(detail.renewPrice).toFixed(2)}` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">原购入价</p>
                <p className="value">{detail.purchasePrice ? `¥${Number(detail.purchasePrice).toFixed(2)}` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">最低接受价</p>
                <p className="value">{detail.minAcceptPrice ? `¥${Number(detail.minAcceptPrice).toFixed(2)}` : '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">服务商</p>
                <p className="value">{detail.providerName || '未填写'}</p>
              </div>
              <div className="spec-item">
                <p className="label">服务费承担方</p>
                <p className="value">{detail.feePayer || 'SELLER'}</p>
              </div>
            </div>
          </section>

          <section className="card stack-12">
            <h3>风险提示与交易规则</h3>
            <div className="status-line">
              {detail.riskTags?.length ? (
                detail.riskTags.map((tag) => (
                  <span key={tag} className="status-chip warning">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="status-chip success">当前无明显风险标签</span>
              )}
            </div>
            <div className="stack-8 muted">
              <p>1. 平台担保订单中，资金将先托管，待交付核验后结算给卖家。</p>
              <p>2. 买家需在验机窗口内确认配置、线路、到期与交付信息是否一致。</p>
              <p>3. 发现不一致可提交退款或发起纠纷，并上传证据链接。</p>
              <p>4. 平台将依据订单记录、交付记录、核验结果与证据进行仲裁处理。</p>
            </div>
          </section>

          <section className="card stack-12">
            <h3>商品记录</h3>
            <div className="spec-grid">
              <div className="spec-item">
                <p className="label">发布时间</p>
                <p className="value">{detail.createdAt ? new Date(detail.createdAt).toLocaleString('zh-CN') : '未知'}</p>
              </div>
              <div className="spec-item">
                <p className="label">最近更新</p>
                <p className="value">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString('zh-CN') : '未知'}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品编号</p>
                <p className="value">{detail.code || detail.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{detail.status || '未知'}</p>
              </div>
            </div>
          </section>

          {(detail.consignment || latestConsignment) && (
            <section className="card stack-12">
              <h3>寄售审核信息</h3>
              <div className="spec-grid">
                <div className="spec-item">
                  <p className="label">审核状态</p>
                  <p className="value">
                    {latestConsignment?.status
                      ? CONSIGNMENT_STATUS_LABEL[latestConsignment.status] || latestConsignment.status
                      : detail.consignment
                        ? '寄售已启用'
                        : '未申请'}
                  </p>
                </div>
                <div className="spec-item">
                  <p className="label">申请时间</p>
                  <p className="value">
                    {latestConsignment?.createdAt
                      ? new Date(latestConsignment.createdAt).toLocaleString('zh-CN')
                      : '未记录'}
                  </p>
                </div>
                <div className="spec-item">
                  <p className="label">审核时间</p>
                  <p className="value">
                    {latestConsignment?.reviewedAt
                      ? new Date(latestConsignment.reviewedAt).toLocaleString('zh-CN')
                      : '待审核/未记录'}
                  </p>
                </div>
                <div className="spec-item">
                  <p className="label">审核人</p>
                  <p className="value">{latestConsignment?.reviewer?.email || '未记录'}</p>
                </div>
              </div>
              {latestConsignment?.adminRemark ? (
                <p className="muted">审核备注：{latestConsignment.adminRemark}</p>
              ) : null}
              {latestConsignment?.sellerNote ? (
                <p className="muted">卖家申请说明：{latestConsignment.sellerNote}</p>
              ) : null}
            </section>
          )}
        </div>

        <aside style={{ gridColumn: 'span 4' }} className="stack-16">
          <section className="card stack-12">
            <h3>下单与担保</h3>
            <p className="muted">下单后进入平台担保流程，交付核验完成后才会放款，保障资金安全。</p>
            <PurchaseBox productId={detail.id} price={Number(detail.salePrice)} />
            <Link href={`/profile/alerts?productId=${detail.id}`} className="btn ghost">
              设置降价提醒
            </Link>
          </section>

          <section className="card stack-12">
            <h3>议价协商</h3>
            <p className="muted">支持多轮还价，议价达成后自动生成担保订单，保持交易链路可追溯。</p>
            <BargainBox
              productId={detail.id}
              listPrice={Number(detail.salePrice)}
              negotiable={detail.negotiable}
            />
          </section>

          <section className="card stack-12">
            <h3>卖家信誉</h3>
            <div className="spec-grid">
              <div className="spec-item">
                <p className="label">卖家账号</p>
                <p className="value">{detail.seller?.email || '未知'}</p>
              </div>
              <div className="spec-item">
                <p className="label">信誉等级</p>
                <p className="value">Lv.{detail.seller?.sellerProfile?.level ?? 1}</p>
              </div>
              <div className="spec-item">
                <p className="label">累计成交</p>
                <p className="value">{detail.seller?.sellerProfile?.tradeCount ?? 0} 单</p>
              </div>
              <div className="spec-item">
                <p className="label">平均交付</p>
                <p className="value">{detail.seller?.sellerProfile?.avgDeliveryMinutes ?? 0} 分钟</p>
              </div>
              <div className="spec-item">
                <p className="label">纠纷率</p>
                <p className="value">{((detail.seller?.sellerProfile?.disputeRate ?? 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="spec-item">
                <p className="label">退款率</p>
                <p className="value">{((detail.seller?.sellerProfile?.refundRate ?? 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="spec-item">
                <p className="label">好评率</p>
                <p className="value">{((detail.seller?.sellerProfile?.positiveRate ?? 0) * 100).toFixed(2)}%</p>
              </div>
            </div>
            {detail.seller?.id ? (
              <Link href={`/stores/${detail.seller.id}`} className="btn secondary">
                进入店铺主页
              </Link>
            ) : null}
          </section>

          <section className="card stack-12">
            <h3>平台保障说明</h3>
            <div className="stack-8 muted">
              <p>1. 资金托管，避免私下转账风险。</p>
              <p>2. 核验记录留痕，交易过程可追溯。</p>
              <p>3. 纠纷仲裁机制，保障买卖双方权益。</p>
            </div>
            <Link href="/rules" className="btn secondary">
              查看交易规则
            </Link>
            <Link href="/agreement" className="btn ghost">
              服务协议
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
