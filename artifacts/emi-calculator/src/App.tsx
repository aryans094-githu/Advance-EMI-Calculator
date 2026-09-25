import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  IndianRupee,
  Printer,
  RotateCcw,
  Share2,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import {
  calculateLoan,
  createComparison,
  FREQUENCY_OPTIONS,
  type InterestMethod,
  type LoanInput,
  type PaymentFrequency,
} from '@/lib/finance';

const queryClient = new QueryClient();

const DEFAULTS: LoanInput = {
  baseLoan: 1200000,
  insurance: 30000,
  processingFee: 5000,
  documentationFee: 0,
  otherCharges: 0,
  downPayment: 0,
  tenureYears: 15,
  annualRate: 8.5,
  rateReduction: 0,
  method: 'reducing',
  frequency: 'monthly',
  financeInsurance: true,
  financeProcessingFee: true,
  financeDocumentationFee: false,
  financeOtherCharges: false,
};

const CURRENCIES = {
  INR: { label: 'INR', locale: 'en-IN' },
  USD: { label: 'USD', locale: 'en-US' },
  GBP: { label: 'GBP', locale: 'en-GB' },
  EUR: { label: 'EUR', locale: 'de-DE' },
  CAD: { label: 'CAD', locale: 'en-CA' },
  AUD: { label: 'AUD', locale: 'en-AU' },
} as const;

type CurrencyCode = keyof typeof CURRENCIES;

function formatMoney(value: number, currency: CurrencyCode, compact = false) {
  if (!Number.isFinite(value)) return '—';
  const amount = compact && Math.abs(value) >= 100000
    ? `${new Intl.NumberFormat(CURRENCIES[currency].locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value)}`
    : new Intl.NumberFormat(CURRENCIES[currency].locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(Math.round(value));
  return amount;
}

function formatRate(value: number) {
  return `${value.toFixed(2)}%`;
}

function Metric({
  label,
  value,
  detail,
  accent = false,
  testId,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
  testId: string;
}) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-primary-foreground/60">
        {label}
      </p>
      <p
        className={`font-mono-custom text-lg font-medium tracking-[-.04em] ${
          accent ? 'text-accent' : 'text-primary-foreground'
        }`}
      >
        {value}
      </p>
      {detail && <p className="text-xs text-primary-foreground/55">{detail}</p>}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  suffix,
  min = 0,
  max,
  step = 1000,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  suffix: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-xs font-bold text-foreground">{label}</span>
      <span className="flex h-10 items-center rounded-xl border border-input bg-background px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <input
          id={id}
          data-testid={`input-${id}`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) return;
            onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, parsed)));
          }}
          className="number-input w-full bg-transparent font-mono-custom text-sm font-medium outline-none"
        />
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
}

function SliderField({
  id,
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
  formatValue,
  helper,
}: {
  id: string;
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  helper: string;
}) {
  return (
    <div className="space-y-3" data-testid={`field-${id}`}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-bold text-foreground">
          {label}
        </label>
        <div className="flex h-10 min-w-[130px] items-center justify-end rounded-xl border border-input bg-background px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <input
            id={id}
            data-testid={`input-${id}`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) {
                onChange(Math.min(max, Math.max(min, parsed)));
              }
            }}
            className="number-input w-full bg-transparent text-right font-mono-custom text-sm font-medium outline-none"
            aria-label={label}
          />
          <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>
        </div>
      </div>
      <input
        type="range"
        data-testid={`slider-${id}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
        aria-label={`${label} slider`}
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{formatValue(min)}</span>
        <span>{helper}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
  testId,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  testId: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        data-testid={testId}
        className="h-4 w-4 accent-[hsl(var(--accent))]"
      />
      {label}
    </label>
  );
}

function SegmentControl<T extends string>({
  value,
  options,
  onChange,
  testId,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  testId: string;
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-input bg-secondary/60 p-1" data-testid={testId}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
            value === option.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DetailRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-border/70 py-3 last:border-0 ${emphasis ? 'font-bold text-primary' : ''}`}>
      <span className="text-sm">{label}</span>
      <span className="font-mono-custom text-sm">{value}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-accent">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-[-.05em] text-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function App() {
  const [loan, setLoan] = useState<LoanInput>(DEFAULTS);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [shared, setShared] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [updated, setUpdated] = useState(false);

  const result = useMemo(() => calculateLoan(loan), [loan]);
  const comparison = useMemo(() => createComparison(loan), [loan]);
  const updateLoan = <K extends keyof LoanInput>(key: K, value: LoanInput[K]) => {
    setLoan((current) => ({ ...current, [key]: value }));
    setUpdated(false);
  };

  const principalPercent = result.totalCost > 0
    ? ((loan.baseLoan - loan.downPayment) / result.totalCost) * 100
    : 0;
  const insurancePercent = result.totalCost > 0 ? (loan.insurance / result.totalCost) * 100 : 0;
  const interestPercent = result.totalCost > 0 ? (result.totalInterest / result.totalCost) * 100 : 0;
  const visibleSchedule = showFullSchedule
    ? result.schedule
    : [
        ...result.schedule.slice(0, 5),
        ...(result.schedule.length > 6 ? [result.schedule[result.schedule.length - 1]] : []),
      ];
  const balanceChartData = result.schedule.filter(
    (row, index) =>
      result.schedule.length <= 48 ||
      index % Math.ceil(result.schedule.length / 48) === 0 ||
      index === result.schedule.length - 1,
  );

  const reset = () => {
    setLoan(DEFAULTS);
    setCurrency('INR');
    setShared(false);
    setUpdated(false);
    setShowFullSchedule(false);
  };

  const share = async () => {
    const text = `My EMI estimate: ${formatMoney(result.payment, currency)}/${loan.frequency} for ${result.periods} payments on a ${formatMoney(result.originalLoan, currency)} loan. ${formatRate(result.effectiveAnnualRate)} approximate effective annual rate.`;
    try {
      if (navigator.share) await navigator.share({ title: 'My EMI estimate', text });
      else if (navigator.clipboard) await navigator.clipboard.writeText(text);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch {
      setShared(false);
    }
  };

  const downloadCsv = () => {
    const header = 'Period,Opening balance,Payment,Principal,Interest,Financed charges,Closing balance';
    const rows = result.schedule.map((row) =>
      [
        row.period,
        row.openingBalance.toFixed(2),
        row.payment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.charges.toFixed(2),
        row.closingBalance.toFixed(2),
      ].join(','),
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'loan-amortization-schedule.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grain app-shell min-h-[100dvh]">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-3" data-testid="brand-mark">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary text-primary-foreground shadow-sm">
            <WalletCards size={18} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-[-.03em]">clearloan</p>
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
              Make the math clear
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            className="h-9 rounded-full border border-border bg-card/70 px-3 text-xs font-bold text-muted-foreground outline-none"
            aria-label="Currency"
            data-testid="select-currency"
          >
            {Object.keys(CURRENCIES).map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={reset}
            data-testid="button-reset-top"
            className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-10">
        <section className="grid gap-8 pb-12 pt-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start lg:gap-16 lg:pb-16 lg:pt-14">
          <div className="animate-rise lg:sticky lg:top-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-primary">
              <Sparkles size={13} className="text-accent" />
              The full cost, clearly
            </div>
            <h1 className="max-w-[520px] text-balance text-4xl font-extrabold leading-[1.05] tracking-[-.065em] text-primary sm:text-5xl lg:text-[4.2rem]">
              Know your number <span className="text-accent">before</span> you sign.
            </h1>
            <p className="mt-6 max-w-[470px] text-base leading-7 text-muted-foreground sm:text-lg">
              Compare the interest method, add every charge, and see what you actually repay — not just the headline EMI.
            </p>
            <div className="mt-7 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
              <div className="flex -space-x-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#c4e2d6] text-[10px] font-extrabold text-primary">A</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#f5c5a8] text-[10px] font-extrabold text-primary">R</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[#d8c9ec] text-[10px] font-extrabold text-primary">K</span>
              </div>
              <span>Simple inputs · honest math</span>
            </div>
          </div>

          <div className="animate-rise-delay rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.16em] text-accent">Loan setup</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-[-.05em] text-primary">Shape the plan</h2>
              </div>
              <div className="rounded-xl bg-secondary px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted-foreground">Live estimate</p>
                <p className="font-mono-custom text-xs font-medium text-primary">
                  {updated ? 'just updated' : 'updates instantly'}
                </p>
              </div>
            </div>

            <div className="space-y-7">
              <SliderField
                id="loan-amount"
                label="Base loan amount"
                value={loan.baseLoan}
                suffix={currency}
                min={10000}
                max={50000000}
                step={50000}
                onChange={(value) => updateLoan('baseLoan', value)}
                formatValue={(value) => formatMoney(value, currency, true)}
                helper="amount approved"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="down-payment"
                  label="Down payment"
                  value={loan.downPayment}
                  suffix={currency}
                  max={loan.baseLoan}
                  step={5000}
                  onChange={(value) => updateLoan('downPayment', value)}
                />
                <NumberField
                  id="insurance-amount"
                  label="Insurance premium"
                  value={loan.insurance}
                  suffix={currency}
                  step={1000}
                  onChange={(value) => updateLoan('insurance', value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="processing-fee"
                  label="Processing fee"
                  value={loan.processingFee}
                  suffix={currency}
                  step={500}
                  onChange={(value) => updateLoan('processingFee', value)}
                />
                <NumberField
                  id="documentation-fee"
                  label="Documentation fee"
                  value={loan.documentationFee}
                  suffix={currency}
                  step={500}
                  onChange={(value) => updateLoan('documentationFee', value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  id="other-charges"
                  label="Other charges"
                  value={loan.otherCharges}
                  suffix={currency}
                  step={500}
                  onChange={(value) => updateLoan('otherCharges', value)}
                />
                <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/35 p-3">
                  <p className="text-xs font-bold text-foreground">Finance charges?</p>
                  <div className="grid gap-2">
                    <Toggle checked={loan.financeInsurance} onChange={(value) => updateLoan('financeInsurance', value)} label="Insurance" testId="toggle-finance-insurance" />
                    <Toggle checked={loan.financeProcessingFee} onChange={(value) => updateLoan('financeProcessingFee', value)} label="Processing fee" testId="toggle-finance-processing" />
                    <Toggle checked={loan.financeDocumentationFee} onChange={(value) => updateLoan('financeDocumentationFee', value)} label="Documentation fee" testId="toggle-finance-documentation" />
                    <Toggle checked={loan.financeOtherCharges} onChange={(value) => updateLoan('financeOtherCharges', value)} label="Other charges" testId="toggle-finance-other" />
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold text-foreground">Interest method</p>
                  <SegmentControl<InterestMethod>
                    value={loan.method}
                    onChange={(value) => updateLoan('method', value)}
                    testId="control-interest-method"
                    options={[
                      { value: 'reducing', label: 'Reducing balance' },
                      { value: 'flat', label: 'Flat rate' },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold text-foreground">Payment frequency</p>
                  <SegmentControl<PaymentFrequency>
                    value={loan.frequency}
                    onChange={(value) => updateLoan('frequency', value)}
                    testId="control-payment-frequency"
                    options={FREQUENCY_OPTIONS.map(({ value, label }) => ({ value, label }))}
                  />
                </div>
              </div>
              <SliderField
                id="interest-rate"
                label={loan.method === 'flat' ? 'Flat annual rate' : 'Annual interest rate'}
                value={loan.annualRate}
                suffix="%"
                min={0}
                max={30}
                step={0.1}
                onChange={(value) => updateLoan('annualRate', value)}
                formatValue={(value) => `${value}%`}
                helper="nominal rate"
              />
              <SliderField
                id="rate-reduction"
                label="Rate reduction"
                value={loan.rateReduction}
                suffix="%"
                min={0}
                max={5}
                step={0.1}
                onChange={(value) => updateLoan('rateReduction', value)}
                formatValue={(value) => `${value}%`}
                helper={`${formatRate(result.effectiveNominalRate)} used`}
              />
              <SliderField
                id="loan-tenure"
                label="Loan tenure"
                value={loan.tenureYears}
                suffix="yrs"
                min={1}
                max={30}
                step={1}
                onChange={(value) => updateLoan('tenureYears', value)}
                formatValue={(value) => `${value} yrs`}
                helper={`${result.periods} ${loan.frequency} payments`}
              />
              <button
                type="button"
                onClick={() => setUpdated(true)}
                data-testid="button-calculate"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Check size={16} /> Calculate this estimate
              </button>
            </div>
          </div>
        </section>

        <section className="animate-rise-late overflow-hidden rounded-[1.75rem] bg-primary text-primary-foreground shadow-[0_26px_80px_rgba(8,60,69,.2)]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="border-b border-primary-foreground/10 p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-11">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-foreground/60">Your estimated payment</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <IndianRupee size={28} className="text-accent" strokeWidth={2.5} />
                    <p key={result.payment} className="animate-count font-mono-custom text-5xl font-medium tracking-[-.08em] text-primary-foreground sm:text-6xl" data-testid="value-monthly-emi">
                      {Math.round(result.payment).toLocaleString(CURRENCIES[currency].locale)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-primary-foreground/60">
                    {loan.frequency} for {result.periods} payments · {formatRate(result.effectiveNominalRate)} nominal
                  </p>
                </div>
                <div className="hidden h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accent/10 sm:flex">
                  <ArrowDown size={24} className="text-accent" />
                </div>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-7 border-t border-primary-foreground/10 pt-6 sm:grid-cols-4">
                <Metric label="Financed principal" value={formatMoney(result.financedPrincipal, currency, true)} detail="interest base" testId="metric-principal" />
                <Metric label="Total interest" value={formatMoney(result.totalInterest, currency, true)} detail="cost of borrowing" accent testId="metric-interest" />
                <Metric label="Total repayment" value={formatMoney(result.totalRepayment, currency, true)} detail="scheduled + upfront" testId="metric-repayment" />
                <Metric label="Effective annual rate" value={formatRate(result.effectiveAnnualRate)} detail="cash-flow estimate" accent testId="metric-effective-rate" />
              </div>
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-9 lg:p-11">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-foreground/60">Where your money goes</p>
                  <CircleHelp size={16} className="text-primary-foreground/40" />
                </div>
                <div className="mt-7 flex items-center gap-6">
                  <div
                    className="donut relative h-32 w-32 shrink-0 rounded-full"
                    style={{
                      '--principal': 'hsl(163 47% 72%)',
                      '--insurance': 'hsl(42 90% 72%)',
                      '--interest': 'hsl(14 78% 63%)',
                      '--principal-stop': `${principalPercent}%`,
                      '--insurance-stop': `${principalPercent + insurancePercent}%`,
                    } as CSSProperties}
                    data-testid="chart-breakdown"
                  >
                    <div className="absolute inset-[13px] flex flex-col items-center justify-center rounded-full bg-primary">
                      <span className="font-mono-custom text-xl font-medium">{Math.round(principalPercent)}%</span>
                      <span className="text-[10px] text-primary-foreground/50">base loan</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#a5d6c3]" />
                      <div><p className="text-sm font-bold">Base loan</p><p className="font-mono-custom text-xs text-primary-foreground/55">{formatMoney(Math.max(0, loan.baseLoan - loan.downPayment), currency)}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#f5d474]" />
                      <div><p className="text-sm font-bold">Insurance + fees</p><p className="font-mono-custom text-xs text-primary-foreground/55">{formatMoney(result.totalAdditionalCharges, currency)}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                      <div><p className="text-sm font-bold">Interest</p><p className="font-mono-custom text-xs text-primary-foreground/55">{formatMoney(result.totalInterest, currency)}</p></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="max-w-[390px] text-sm leading-6 text-primary-foreground/60">
                Flat and reducing-balance rates are not directly comparable by the headline percentage. Use the comparison below to see the numerical difference.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 pt-8 lg:grid-cols-[.85fr_1.15fr] lg:pt-10">
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-7">
            <SectionHeading eyebrow="Transparent by design" title="Where the amount goes" />
            <div className="mt-6">
              <DetailRow label="Base loan after down payment" value={formatMoney(Math.max(0, loan.baseLoan - loan.downPayment), currency)} />
              <DetailRow label="Insurance" value={`${formatMoney(loan.insurance, currency)} ${loan.financeInsurance ? '(financed)' : '(upfront)'}`} />
              <DetailRow label="Processing fee" value={`${formatMoney(loan.processingFee, currency)} ${loan.financeProcessingFee ? '(financed)' : '(upfront)'}`} />
              <DetailRow label="Documentation + other" value={formatMoney(loan.documentationFee + loan.otherCharges, currency)} />
              <DetailRow label="Total financed principal" value={formatMoney(result.financedPrincipal, currency)} emphasis />
              <DetailRow label="Amount received by customer" value={formatMoney(result.amountReceived, currency)} />
              <DetailRow label="Total cost of borrowing" value={formatMoney(result.totalCost, currency)} emphasis />
            </div>
            <p className="mt-5 rounded-xl bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
              The amount received and the amount on which interest is calculated can differ when charges are financed or paid separately.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-7">
            <SectionHeading eyebrow="Balance over time" title="Outstanding balance">
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">
                {result.periods} periods
              </span>
            </SectionHeading>
            <div className="mt-5 h-[250px] w-full" data-testid="chart-balance">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(163 47% 72%)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(163 47% 72%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(160 18% 83% / .65)" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(193 18% 43%)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(193 18% 43%)' }} tickFormatter={(value: number) => formatMoney(value, currency, true)} />
                  <Tooltip formatter={(value: number) => formatMoney(value, currency)} labelFormatter={(label) => `Period ${label}`} />
                  <Area type="monotone" dataKey="closingBalance" stroke="hsl(192 73% 23%)" strokeWidth={2.5} fill="url(#balanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-7">
          <SectionHeading eyebrow="Numerical comparison" title="Flat rate vs reducing balance">
            <p className="max-w-[340px] text-right text-xs leading-5 text-muted-foreground">
              Neither method is labelled better. Compare the payment and borrowing cost using the same loan inputs.
            </p>
          </SectionHeading>
          <div className="table-scroll mt-6 overflow-x-auto">
            <table className="w-full min-w-[660px] border-collapse text-left" data-testid="table-comparison">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                  <th className="pb-3 pl-1">Parameter</th>
                  <th className="pb-3 text-right">Flat rate</th>
                  <th className="pb-3 pr-1 text-right">Reducing balance</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['Financed principal', formatMoney(comparison.flat.financedPrincipal, currency), formatMoney(comparison.reducing.financedPrincipal, currency)],
                  ['Nominal interest rate', formatRate(comparison.flat.effectiveNominalRate), formatRate(comparison.reducing.effectiveNominalRate)],
                  ['Payment', formatMoney(comparison.flat.payment, currency), formatMoney(comparison.reducing.payment, currency)],
                  ['Total interest', formatMoney(comparison.flat.totalInterest, currency), formatMoney(comparison.reducing.totalInterest, currency)],
                  ['Total repayment', formatMoney(comparison.flat.totalRepayment, currency), formatMoney(comparison.reducing.totalRepayment, currency)],
                  ['Interest / principal', `${(comparison.flat.interestPrincipalRatio * 100).toFixed(1)}%`, `${(comparison.reducing.interestPrincipalRatio * 100).toFixed(1)}%`],
                  ['Approx. effective annual rate', formatRate(comparison.flat.effectiveAnnualRate), formatRate(comparison.reducing.effectiveAnnualRate)],
                ].map(([label, flat, reducing]) => (
                  <tr key={label} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pl-1 text-muted-foreground">{label}</td>
                    <td className="py-3 text-right font-mono-custom text-xs">{flat}</td>
                    <td className="py-3 pr-1 text-right font-mono-custom text-xs text-primary">{reducing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 pt-8 lg:grid-cols-[1.28fr_.72fr] lg:pt-10">
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-7">
            <SectionHeading eyebrow="A period-by-period view" title="Amortization schedule">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={downloadCsv} data-testid="button-download-csv" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-secondary">
                  <Download size={14} /> CSV
                </button>
                <button type="button" onClick={() => window.print()} data-testid="button-print-report" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-secondary">
                  <Printer size={14} /> Print
                </button>
                <button type="button" onClick={() => setShowFullSchedule((current) => !current)} data-testid="button-toggle-schedule" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-primary transition-colors hover:border-primary hover:bg-secondary">
                  {showFullSchedule ? 'Show preview' : 'View full schedule'}
                  <ChevronDown size={14} className={`transition-transform ${showFullSchedule ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </SectionHeading>
            <div className="table-scroll mt-6 overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                    <th className="pb-3 pl-1">Period</th>
                    <th className="pb-3 text-right">Opening balance</th>
                    <th className="pb-3 text-right">Payment</th>
                    <th className="pb-3 text-right">Principal</th>
                    <th className="pb-3 text-right">Interest</th>
                    <th className="pb-3 text-right">Charges</th>
                    <th className="pb-3 pr-1 text-right">Closing balance</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSchedule.map((row, index) => (
                    <tr key={row.period} className={`border-b border-border/70 text-sm last:border-0 ${index === visibleSchedule.length - 1 && !showFullSchedule ? 'bg-secondary/40' : ''}`}>
                      <td className="py-3 pl-1 font-mono-custom text-xs text-muted-foreground">{String(row.period).padStart(2, '0')}</td>
                      <td className="py-3 text-right font-mono-custom text-xs">{formatMoney(row.openingBalance, currency)}</td>
                      <td className="py-3 text-right font-mono-custom text-xs font-medium">{formatMoney(row.payment, currency)}</td>
                      <td className="py-3 text-right font-mono-custom text-xs text-primary">{formatMoney(row.principal, currency)}</td>
                      <td className="py-3 text-right font-mono-custom text-xs text-accent">{formatMoney(row.interest, currency)}</td>
                      <td className="py-3 text-right font-mono-custom text-xs text-muted-foreground">{formatMoney(row.charges, currency)}</td>
                      <td className="py-3 pr-1 text-right font-mono-custom text-xs text-muted-foreground">{formatMoney(row.closingBalance, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showFullSchedule && result.periods > 6 && (
              <p className="mt-4 text-xs text-muted-foreground">Showing the first five periods and your final payment. View the full schedule for every period.</p>
            )}
          </div>

          <aside className="flex flex-col justify-between rounded-[1.5rem] border border-accent/25 bg-[#fff5ed] p-6 sm:p-7">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <ArrowUpRight size={19} />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold leading-tight tracking-[-.05em] text-primary">Keep the full picture</h2>
              <p className="mt-3 text-sm leading-6 text-primary/70">
                Your estimate uses the selected interest method, payment frequency, charges, and financing choices. Actual lender terms may differ.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              <button type="button" onClick={share} data-testid="button-share-estimate" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">
                {shared ? <Check size={16} /> : <Share2 size={16} />}
                {shared ? 'Estimate copied' : 'Share this estimate'}
              </button>
              <button type="button" onClick={reset} data-testid="button-reset-estimate" className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/15 bg-transparent px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-white/60">
                <RotateCcw size={15} /> Start over
              </button>
            </div>
          </aside>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-accent/25 bg-[#fff5ed] p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <CircleHelp size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h2 className="text-lg font-extrabold text-primary">How to read this estimate</h2>
              <p className="mt-2 text-sm leading-6 text-primary/75">
                Your base loan is {formatMoney(Math.max(0, loan.baseLoan - loan.downPayment), currency)} after the down payment. You chose to {loan.financeInsurance ? 'finance' : 'pay separately for'} {formatMoney(loan.insurance, currency)} of insurance and {loan.financeProcessingFee ? 'finance' : 'pay separately for'} {formatMoney(loan.processingFee, currency)} of processing fees, making the financed principal {formatMoney(result.financedPrincipal, currency)}. At a {loan.method} rate of {formatRate(result.effectiveNominalRate)} for {result.periods} {loan.frequency} payments, the estimated payment is {formatMoney(result.payment, currency)} and estimated interest is {formatMoney(result.totalInterest, currency)}.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-3 border-t border-border/70 pb-2 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>This calculator provides estimates. Actual lender calculations may differ due to fees, taxes, dates, rounding, and contractual terms.</p>
          <p className="font-mono-custom text-[10px] uppercase tracking-[.12em]">simple inputs · honest math</p>
        </footer>
      </main>
    </div>
  );
}

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default Root;