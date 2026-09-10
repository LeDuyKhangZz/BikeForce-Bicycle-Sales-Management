import type { MonthlySummaryCardModel } from '@/lib/reports/monthly-summary-card';

type Props = { model: MonthlySummaryCardModel };

const COLOR = {
  background: '#f8fafc',
  card: '#ffffff',
  primary: '#0f5265',
  accent: '#c78b36',
  text: '#172b35',
  muted: '#64748b',
  border: '#dbe4e8',
  success: '#15803d',
  warning: '#b45309',
  danger: '#b91c1c',
} as const;

function achievementColor(status: string): string {
  if (status === 'EXCEEDED') return COLOR.success;
  if (status === 'NEAR') return COLOR.warning;
  if (status === 'MISSED') return COLOR.danger;
  return COLOR.muted;
}

export function MonthlySummaryCard({ model }: Props) {
  return (
    <div
      style={{
        width: '1080px',
        height: '1920px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLOR.background,
        color: COLOR.text,
        padding: '72px 70px 58px',
        fontFamily: 'Inter',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: `3px solid ${COLOR.primary}`, paddingBottom: '28px' }}>
        <div style={{ display: 'flex', color: COLOR.primary, fontSize: '46px', fontWeight: 800, letterSpacing: '2px' }}>BIKEFORCE</div>
        <div style={{ display: 'flex', color: COLOR.accent, fontSize: '24px', fontWeight: 700, letterSpacing: '5px', marginTop: '8px' }}>TỔNG KẾT THÁNG</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '28px 0 30px' }}>
        <div style={{ display: 'flex', color: COLOR.muted, fontSize: '28px' }}>{model.monthText}</div>
        <div style={{ display: 'flex', color: COLOR.primary, fontSize: '52px', fontWeight: 800, marginTop: '8px' }}>{model.salesName}</div>
        {model.employeeCode && <div style={{ display: 'flex', color: COLOR.muted, fontSize: '25px', marginTop: '6px' }}>{model.employeeCode}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: '18px', padding: '28px 30px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', color: COLOR.primary, fontSize: '25px', fontWeight: 800, letterSpacing: '2px', marginBottom: '18px' }}>HOẠT ĐỘNG ONLINE TRONG THÁNG</div>
        {model.saleWorkMetrics === null ? (
          <div style={{ display: 'flex', color: COLOR.muted, fontSize: '25px' }}>Chưa có dữ liệu SaleWork của tháng này.</div>
        ) : model.saleWorkMetrics.map((metric) => (
          <div key={metric.label} style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${COLOR.border}`, padding: '12px 0', fontSize: '24px' }}>
            <div style={{ display: 'flex', color: COLOR.muted }}>{metric.label}</div>
            <div style={{ display: 'flex', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{metric.valueText}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff8ec', borderLeft: `7px solid ${COLOR.accent}`, borderRadius: '12px', padding: '28px 30px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', color: COLOR.primary, fontSize: '25px', fontWeight: 800, letterSpacing: '2px' }}>TÌNH TRẠNG THỰC HIỆN</div>
        {model.performance === null ? (
          <div style={{ display: 'flex', color: COLOR.muted, fontSize: '25px', marginTop: '18px' }}>Chưa có dữ liệu AMIS của tháng này.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '10px' }}>
            <div style={{ display: 'flex', color: COLOR.muted, fontSize: '20px', marginBottom: '12px' }}>{model.performance.rangeText}</div>
            {model.performance.rows.map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', borderTop: `1px solid ${COLOR.border}`, padding: '14px 0', fontSize: '22px' }}>
                <div style={{ display: 'flex', width: '35%', fontWeight: 600 }}>{row.label}</div>
                <div style={{ display: 'flex', width: '22%', justifyContent: 'flex-end', fontVariantNumeric: 'tabular-nums' }}>{row.targetText}</div>
                <div style={{ display: 'flex', width: '22%', justifyContent: 'flex-end', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{row.actualText}</div>
                <div style={{ display: 'flex', width: '21%', justifyContent: 'flex-end', color: achievementColor(row.achievement.status), fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{row.achievement.display}</div>
              </div>
            ))}
            {model.performance.supplementaryMetrics.map((metric) => (
              <div key={metric.label} style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${COLOR.border}`, padding: '12px 0', fontSize: '22px' }}>
                <div style={{ display: 'flex', color: COLOR.muted }}>{metric.label}</div>
                <div style={{ display: 'flex', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{metric.valueText}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: COLOR.card, border: `1px solid ${COLOR.border}`, borderRadius: '18px', padding: '26px 30px', fontSize: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px' }}><div style={{ display: 'flex' }}>Công tác phí</div><div style={{ display: 'flex', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{model.travelExpenseText}</div></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${COLOR.border}`, paddingTop: '16px' }}><div style={{ display: 'flex' }}>Lương</div><div style={{ display: 'flex', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{model.salaryText}</div></div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', color: COLOR.muted, fontSize: '20px', marginTop: 'auto' }}>BikeForce · Báo cáo tổng hợp tự động theo tháng</div>
    </div>
  );
}
