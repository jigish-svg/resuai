import { CheckCircle2, Crown, Clock } from 'lucide-react';

const PAID_FEATURES = [
  'Unlimited jobs, matches, and tailored resumes (free plan is capped at 3 jobs)',
  'Multiple resume profiles — maintain separate resumes for different career tracks',
  'JD-Specific Tailoring — specific, reviewable resume changes for each job',
  'Interview Prep — likely questions, a full skill-gap learning journey with quizzes, and questions to ask',
  'AI-generated, evidence-based cover letters for every job',
];

const PLANS = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: 10,
    cadence: 'week',
    subtitle: 'Short job search sprint',
    perMonth: null,
    badge: null,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 20,
    cadence: 'month',
    subtitle: 'Most flexible',
    perMonth: null,
    badge: 'Popular',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 120,
    cadence: 'year',
    subtitle: 'Best value',
    perMonth: 10,
    badge: 'Save 50%',
  },
];

export default function UpgradePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="animate-fade-up text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center mx-auto mb-5 shadow-lg">
          <Crown className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Go <span className="gradient-text">Premium</span>
        </h1>
        <p className="text-gray-500">Pick the plan that fits how long you&apos;re job hunting.</p>
      </div>

      {/* Pricing plans */}
      <div className="grid md:grid-cols-3 gap-5 animate-fade-up" style={{ animationDelay: '0.06s' }}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-6 border flex flex-col ${
              plan.id === 'yearly'
                ? 'bg-brand-primary/10 border-brand-primary/30 shadow-lg'
                : 'glass border-black/[0.06]'
            }`}
          >
            {plan.badge && (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide font-semibold px-2.5 py-1 rounded-full ${
                  plan.id === 'yearly' ? 'bg-brand-primary text-white' : 'bg-brand-tertiary-light text-amber-700'
                }`}
              >
                {plan.badge}
              </span>
            )}

            <p className="text-sm font-medium text-gray-500 mt-2">{plan.name}</p>
            <div className="flex items-baseline gap-1 my-2">
              <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
              <span className="text-sm text-gray-500">/{plan.cadence}</span>
            </div>
            {plan.perMonth ? (
              <p className="text-xs text-brand-primary-dark font-medium mb-4">${plan.perMonth}/month, billed annually</p>
            ) : (
              <p className="text-xs text-gray-400 mb-4">{plan.subtitle}</p>
            )}

            <button
              disabled
              className={`mt-auto w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm cursor-not-allowed opacity-70 ${
                plan.id === 'yearly'
                  ? 'bg-brand-primary text-white'
                  : 'bg-black/[0.06] text-gray-500'
              }`}
            >
              <Clock className="w-4 h-4" />
              Coming soon
            </button>
          </div>
        ))}
      </div>

      {/* Feature list — same across all plans */}
      <div className="animate-fade-up glass rounded-2xl p-8 border border-black/[0.06]" style={{ animationDelay: '0.12s' }}>
        <p className="text-sm font-semibold text-gray-800 mb-4">Every plan unlocks:</p>
        <ul className="space-y-3 mb-6">
          {PAID_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="bg-brand-tertiary-light text-amber-800 rounded-xl p-4 text-sm text-center">
          Checkout isn&apos;t wired up yet — billing is coming next. For now, plans are upgraded manually.
        </div>
      </div>
    </div>
  );
}
