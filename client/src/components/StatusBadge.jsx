export default function StatusBadge({ status }) {
  const configs = {
    active: { label: 'Active', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', dot: '#10b981' },
    pending_seller_decision: { label: 'Decision Needed', bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
    approved: { label: 'Approved', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
    handover_pending: { label: 'Handover Pending', bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6' },
    completed: { label: 'Completed', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
    rejected: { label: 'Rejected', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
    cancelled: { label: 'Cancelled', bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' },
    unsold: { label: 'Unsold', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dot: '#64748b' },
    pickup_failed: { label: 'Pickup Failed', bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#f43f5e' },
  };

  const current = configs[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '3px 9px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: current.dot,
          display: 'inline-block',
        }}
      />
      {current.label}
    </span>
  );
}
