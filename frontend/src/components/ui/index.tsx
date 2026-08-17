import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

// --- Button ---------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white border border-brand hover:bg-brand-hover hover:border-brand-hover disabled:bg-brand/40 disabled:border-brand/40',
  secondary:
    'bg-white text-ink border border-line hover:bg-surface disabled:text-muted disabled:hover:bg-white',
  ghost:
    'bg-transparent text-muted border border-transparent hover:bg-surface hover:text-ink',
  danger:
    'bg-white text-danger border border-danger/30 hover:bg-danger-soft disabled:text-danger/40',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  block = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {loading && <Spinner size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  )
}

// --- Spinner --------------------------------------------------------------

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cx('animate-spin', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  )
}

// --- Card -----------------------------------------------------------------

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={cx(
        'rounded-lg border border-line bg-white shadow-card',
        interactive && 'transition-shadow hover:shadow-lift',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// --- Page scaffolding -----------------------------------------------------

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// --- Form fields ----------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx('field-base', className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx('field-base resize-y', className)} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx('field-base cursor-pointer pr-8', className)}>
      {children}
    </select>
  )
}

// --- Badges ---------------------------------------------------------------

type Tone = 'neutral' | 'green' | 'amber' | 'blue' | 'red'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface text-muted border-line',
  green: 'bg-brand-soft text-brand-text border-brand-border',
  amber: 'bg-warn-soft text-warn border-warn-border',
  blue: 'bg-info-soft text-info border-info-border',
  red: 'bg-danger-soft text-danger border-danger-border',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Single source of truth for how backend status strings are coloured. */
const STATUS_TONES: Record<string, Tone> = {
  pending: 'amber',
  reserved: 'amber',
  accepted: 'blue',
  connected: 'blue',
  completed: 'green',
  confirmed: 'green',
  sold: 'green',
  cancelled: 'red',
  active: 'neutral',
  open: 'neutral',
  suggested: 'neutral',
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONES[status] ?? 'neutral'}>{label}</Badge>
}

// --- Empty / error states -------------------------------------------------

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 flex justify-center text-muted">{icon}</div>}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorNote({ message, className }: { message: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cx(
        'rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger',
        className,
      )}
    >
      {message}
    </div>
  )
}

export function InfoNote({
  children,
  tone = 'blue',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  const style =
    tone === 'amber'
      ? 'border-warn-border bg-warn-soft text-warn'
      : tone === 'green'
        ? 'border-brand-border bg-brand-soft text-brand-text'
        : 'border-info-border bg-info-soft text-info'
  return (
    <div className={cx('rounded-md border px-3 py-2 text-sm', style, className)}>{children}</div>
  )
}

// --- Modal ----------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Kept in a ref so the effect below never has to depend on onClose.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
    // Depends on `open` ONLY. Callers pass an inline arrow for onClose, so a
    // new identity arrives on every parent render — including every keystroke
    // in a form inside the modal. Re-running this effect would call
    // panelRef.focus() again and steal focus mid-typing, dropping characters.
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-modal sm:rounded-xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  )
}

// --- Tabs -----------------------------------------------------------------

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => {
        const selected = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cx(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              selected
                ? 'border-brand text-brand-text'
                : 'border-transparent text-muted hover:border-line hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cx(
                  'ml-1.5 rounded-full px-1.5 py-0.5 text-xs',
                  selected ? 'bg-brand-soft text-brand-text' : 'bg-surface text-muted',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// --- Meter (confidence bars, quality metrics) -----------------------------

export function Meter({
  value,
  tone = 'green',
  label,
  valueLabel,
}: {
  /** 0–100. */
  value: number
  tone?: 'green' | 'amber' | 'red' | 'blue'
  label?: string
  valueLabel?: string
}) {
  const fill = {
    green: 'bg-brand',
    amber: 'bg-warn',
    red: 'bg-danger',
    blue: 'bg-info',
  }[tone]
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div>
      {(label || valueLabel) && (
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          {label && <span className="truncate text-ink">{label}</span>}
          {valueLabel && <span className="shrink-0 font-medium text-muted">{valueLabel}</span>}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cx('h-full rounded-full transition-all', fill)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

// --- Star rating ----------------------------------------------------------

export function Stars({
  value,
  size = 14,
  onChange,
}: {
  value: number
  size?: number
  onChange?: (value: number) => void
}) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className="inline-flex items-center gap-0.5">
      {stars.map((star) => {
        const filled = star <= value
        const icon = (
          <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"
              fill={filled ? '#f59e0b' : 'none'}
              stroke={filled ? '#f59e0b' : '#d1d5db'}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        )
        return onChange ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded p-0.5 transition-transform hover:scale-110"
            aria-label={`${star}`}
          >
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        )
      })}
    </div>
  )
}

// --- Toasts ---------------------------------------------------------------

interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const ToastContext = createContext<{
  success: (message: string) => void
  error: (message: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback((message: string, tone: Toast['tone']) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cx(
              'pointer-events-auto w-full max-w-sm rounded-md border px-3 py-2 text-sm shadow-lift',
              toast.tone === 'success'
                ? 'border-brand-border bg-brand-soft text-brand-text'
                : 'border-danger-border bg-danger-soft text-danger',
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
