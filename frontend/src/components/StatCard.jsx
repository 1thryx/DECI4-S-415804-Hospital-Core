export default function StatCard({ label, value, hint, tone = 'default', loading = false }) {
  return (
    <article className={`stat-card tone-${tone}`} aria-busy={loading}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{loading ? <span className="skeleton" aria-label="Loading" /> : value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </article>
  );
}
