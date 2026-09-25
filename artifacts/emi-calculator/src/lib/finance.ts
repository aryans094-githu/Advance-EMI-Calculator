export type InterestMethod = 'reducing' | 'flat';
export type PaymentFrequency =
  | 'monthly'
  | 'quarterly'
  | 'half-yearly'
  | 'yearly';

export type LoanInput = {
  baseLoan: number;
  insurance: number;
  processingFee: number;
  documentationFee: number;
  otherCharges: number;
  downPayment: number;
  tenureYears: number;
  annualRate: number;
  rateReduction: number;
  method: InterestMethod;
  frequency: PaymentFrequency;
  financeInsurance: boolean;
  financeProcessingFee: boolean;
  financeDocumentationFee: boolean;
  financeOtherCharges: boolean;
};

export type AmortizationRow = {
  period: number;
  openingBalance: number;
  payment: number;
  principal: number;
  interest: number;
  charges: number;
  closingBalance: number;
};

export type LoanResult = {
  method: InterestMethod;
  frequency: PaymentFrequency;
  periodsPerYear: number;
  periods: number;
  effectiveNominalRate: number;
  periodicRate: number;
  originalLoan: number;
  amountReceived: number;
  financedPrincipal: number;
  financedCharges: number;
  upfrontCharges: number;
  totalAdditionalCharges: number;
  payment: number;
  totalInterest: number;
  scheduledRepayment: number;
  totalRepayment: number;
  totalCost: number;
  effectiveAnnualRate: number;
  interestPrincipalRatio: number;
  schedule: AmortizationRow[];
};

export const FREQUENCY_OPTIONS: Array<{
  value: PaymentFrequency;
  label: string;
  periodsPerYear: number;
}> = [
  { value: 'monthly', label: 'Monthly', periodsPerYear: 12 },
  { value: 'quarterly', label: 'Quarterly', periodsPerYear: 4 },
  { value: 'half-yearly', label: 'Half-yearly', periodsPerYear: 2 },
  { value: 'yearly', label: 'Yearly', periodsPerYear: 1 },
];

function clampNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function periodsPerYear(frequency: PaymentFrequency) {
  return FREQUENCY_OPTIONS.find((option) => option.value === frequency)
    ?.periodsPerYear ?? 12;
}

function calculateReducingPayment(
  principal: number,
  periodicRate: number,
  periods: number,
) {
  if (periods <= 0) return 0;
  if (periodicRate === 0) return principal / periods;
  const factor = Math.pow(1 + periodicRate, periods);
  return (principal * periodicRate * factor) / (factor - 1);
}

function solvePeriodicRate(
  cashReceived: number,
  payment: number,
  periods: number,
) {
  if (cashReceived <= 0 || payment <= 0 || periods <= 0) return 0;
  let low = -0.99;
  let high = 10;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const rate = (low + high) / 2;
    let presentValue = 0;
    for (let period = 1; period <= periods; period += 1) {
      presentValue += payment / Math.pow(1 + rate, period);
    }
    if (presentValue > cashReceived) low = rate;
    else high = rate;
  }
  return (low + high) / 2;
}

function buildReducingSchedule(
  principal: number,
  payment: number,
  periodicRate: number,
  periods: number,
  financedCharges: number,
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let period = 1; period <= periods; period += 1) {
    const openingBalance = balance;
    const interest = openingBalance * periodicRate;
    const scheduledPrincipal = Math.max(0, payment - interest);
    const principalComponent =
      period === periods
        ? openingBalance
        : Math.min(openingBalance, scheduledPrincipal);
    const actualPayment = principalComponent + interest;
    balance = Math.max(0, openingBalance - principalComponent);
    rows.push({
      period,
      openingBalance,
      payment: actualPayment,
      principal: principalComponent,
      interest,
      charges: period === 1 ? financedCharges : 0,
      closingBalance: balance,
    });
  }
  return rows;
}

function buildFlatSchedule(
  principal: number,
  payment: number,
  totalInterest: number,
  periods: number,
  financedCharges: number,
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  let balance = principal;
  const flatPrincipal = periods > 0 ? principal / periods : 0;
  const flatInterest = periods > 0 ? totalInterest / periods : 0;

  for (let period = 1; period <= periods; period += 1) {
    const openingBalance = balance;
    const principalComponent =
      period === periods ? openingBalance : Math.min(openingBalance, flatPrincipal);
    const interest = period === periods ? totalInterest - flatInterest * (periods - 1) : flatInterest;
    const actualPayment = principalComponent + interest;
    balance = Math.max(0, openingBalance - principalComponent);
    rows.push({
      period,
      openingBalance,
      payment: actualPayment,
      principal: principalComponent,
      interest,
      charges: period === 1 ? financedCharges : 0,
      closingBalance: balance,
    });
  }
  return rows;
}

export function calculateLoan(input: LoanInput): LoanResult {
  const baseLoan = clampNonNegative(input.baseLoan);
  const downPayment = Math.min(baseLoan, clampNonNegative(input.downPayment));
  const insurance = clampNonNegative(input.insurance);
  const processingFee = clampNonNegative(input.processingFee);
  const documentationFee = clampNonNegative(input.documentationFee);
  const otherCharges = clampNonNegative(input.otherCharges);
  const periodsPerYearValue = periodsPerYear(input.frequency);
  const periods = Math.max(1, Math.round(clampNonNegative(input.tenureYears) * periodsPerYearValue));
  const effectiveNominalRate = Math.max(0, input.annualRate - input.rateReduction);
  const periodicRate = effectiveNominalRate / 100 / periodsPerYearValue;

  const financedCharges =
    (input.financeInsurance ? insurance : 0) +
    (input.financeProcessingFee ? processingFee : 0) +
    (input.financeDocumentationFee ? documentationFee : 0) +
    (input.financeOtherCharges ? otherCharges : 0);
  const totalAdditionalCharges = insurance + processingFee + documentationFee + otherCharges;
  const upfrontCharges = totalAdditionalCharges - financedCharges;
  const financedPrincipal = Math.max(0, baseLoan - downPayment + financedCharges);
  const amountReceived = Math.max(0, baseLoan - downPayment - upfrontCharges);

  let payment = 0;
  let totalInterest = 0;
  if (input.method === 'flat') {
    totalInterest = financedPrincipal * (effectiveNominalRate / 100) * input.tenureYears;
    payment = (financedPrincipal + totalInterest) / periods;
  } else {
    payment = calculateReducingPayment(financedPrincipal, periodicRate, periods);
    totalInterest = Math.max(0, payment * periods - financedPrincipal);
  }

  const scheduledRepayment = payment * periods;
  const totalRepayment = scheduledRepayment + upfrontCharges;
  const schedule =
    input.method === 'flat'
      ? buildFlatSchedule(financedPrincipal, payment, totalInterest, periods, financedCharges)
      : buildReducingSchedule(financedPrincipal, payment, periodicRate, periods, financedCharges);
  const internalRate = solvePeriodicRate(amountReceived, payment, periods);
  const effectiveAnnualRate = Math.max(
    0,
    (Math.pow(1 + internalRate, periodsPerYearValue) - 1) * 100,
  );

  return {
    method: input.method,
    frequency: input.frequency,
    periodsPerYear: periodsPerYearValue,
    periods,
    effectiveNominalRate,
    periodicRate,
    originalLoan: baseLoan,
    amountReceived,
    financedPrincipal,
    financedCharges,
    upfrontCharges,
    totalAdditionalCharges,
    payment,
    totalInterest,
    scheduledRepayment,
    totalRepayment,
    totalCost: totalRepayment,
    effectiveAnnualRate,
    interestPrincipalRatio:
      financedPrincipal > 0 ? totalInterest / financedPrincipal : 0,
    schedule,
  };
}

export function createComparison(input: LoanInput) {
  return {
    flat: calculateLoan({ ...input, method: 'flat' }),
    reducing: calculateLoan({ ...input, method: 'reducing' }),
  };
}