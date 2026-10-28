export default function StatusBadge({ status }) {
  const configs = {
    active: { label: 'Active', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    pending_seller_decision: { label: 'Awaiting Decision', bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    approved: { label: 'Approved', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    handover_pending: { label: 'Handover Pending', bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
    completed: { label: 'Completed', bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    rejected: { label: 'Rejected', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    cancelled: { label: 'Cancelled', bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
    unsold: { label: 'Unsold', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
    pickup_failed: { label: 'Pickup Failed', bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  };

  const current = configs[status] || { label: status, bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '3px 9px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
      }}
    >
      {current.label}
    </span>
  );
}
