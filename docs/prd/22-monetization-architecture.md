# 22. Monetization architecture

**DECISION.** Payment is not built. The architecture must not block it. Pricing is not decided.

## 22A. Free experience and paywall candidates

| **Item** | **Definition** | **Tag** |
|---|---|---|
| MVP experience | All features are available to every signed-in user within cost caps. No purchase exists. Entitlement checks return the free_beta entitlement. | DECISION |
| Why | Payment is last. Caps protect cost while experiments run. | DECISION |
| Free-tier caps | Analyses per day, letters per day, interview preps per day, voice minutes. Values set after cost is measured (OQ-5). | DECISION |
| A. After the first change | The fit and one usable evidence-backed change are free. The rest of the pack asks for entitlement. | HYPOTHESIS |
| B. At export | Building is free. Export of the tailored resume asks for entitlement. Risk: a surprise after effort. | HYPOTHESIS |
| C. Per component | Each pack item unlocks separately. | HYPOTHESIS |
| Never | The fit score, the evidence and the reasons are never gated. | DECISION |

## 22B. Entitlement and provider architecture

| **Part** | **Definition** |
|---|---|
| Entitlement | user, kind (free_beta, application_pack, time_pass, subscription), scope (an application or a time window), starts, ends, status, source, provider reference. |
| Feature gates | Server code asks "is this user entitled to X for application Y?" It never reads a plan name or a price. |
| Application-level | An application_pack entitlement has scope_application_id. A time_pass has starts and ends. A subscription has a rolling end. |
| Usage tracking | The Usage table records every metered action from the first day, so caps and future metering use real data. |
| Provider boundary | A PaymentProvider interface: create checkout for an entitlement intent; handle a provider event and grant or revoke an entitlement. Nothing else in the code references a provider. Provider choice depends on the seller entity and country (OQ-2). **DECISION:** the interface is defined now; nothing is implemented. |
| Subscription placeholder | The Entitlement kind subscription and a settings line. No Subscription table until Phase 6. |
| Pricing | Not decided. Units to test: per application, time-boxed pass, subscription. |
| Billing principles (**HYPOTHESIS**) | Show the end date before paying. No auto-renewal by default in early tests. A reminder before any renewal. Clear refund words. **FACT:** Teal's policy puts the burden of confirming cancellation on the customer. |
| Removed | The plan column check on profiles and the hard-coded free limits (**FACT:** 1 resume, 3 jobs, no cover letters) are replaced by entitlements and caps. |
