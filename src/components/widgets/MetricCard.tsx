export interface MetricCardProps {
  icon?: string
  label: string
  value: string
  trend?: string
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

export function MetricCard({
  icon,
  label,
  value,
  trend,
  color = 'primary',
}: MetricCardProps) {
  const colorStyles = {
    primary: {
      ring: 'ring-sky-500/30',
      badge: 'bg-sky-100 text-sky-700',
      value: 'text-sky-700',
    },
    success: {
      ring: 'ring-emerald-500/30',
      badge: 'bg-emerald-100 text-emerald-700',
      value: 'text-emerald-700',
    },
    warning: {
      ring: 'ring-amber-500/30',
      badge: 'bg-amber-100 text-amber-700',
      value: 'text-amber-700',
    },
    danger: {
      ring: 'ring-rose-500/30',
      badge: 'bg-rose-100 text-rose-700',
      value: 'text-rose-700',
    },
  }

  const style = colorStyles[color]

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm ring-1 ${style.ring} transition hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        {icon ? (
          <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${style.badge}`}>
            {icon}
          </span>
        ) : null}
      </div>

      <p className={`mt-3 text-3xl font-bold font-mono leading-none ${style.value}`}>{value}</p>

      {trend ? <p className="mt-2 text-xs text-slate-500">{trend}</p> : null}
    </div>
  )
}
