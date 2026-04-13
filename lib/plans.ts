export const plans = [
  {
    id: "basic",
    name: "Basic Plan",
    monthlyPrice: 499,
    yearlyPrice: 4999,
    setupFee: 2999,
    features: ["Up to 10 tables", "Up to 50 menu items", "QR code ordering", "Basic analytics", "Standard support"],
    tableLimit: 10,
    menuLimit: 50,
    supportType: "standard",
    analytics: "basic",
    multiOutlet: false,
  },
  {
    id: "pro",
    name: "Pro Plan",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    setupFee: 4999,
    features: ["Up to 25 tables", "Unlimited menu items", "Advanced analytics", "Priority support", "Custom branding"],
    tableLimit: 25,
    menuLimit: 999999,
    supportType: "priority",
    analytics: "advanced",
    multiOutlet: false,
  },
  {
    id: "premium",
    name: "Premium Plan",
    monthlyPrice: 1999,
    yearlyPrice: 19999,
    setupFee: 7999,
    features: ["Up to 100 tables", "Full analytics dashboard", "Multi-outlet support", "Custom branding", "Dedicated support"],
    tableLimit: 100,
    menuLimit: 999999,
    supportType: "dedicated",
    analytics: "full",
    multiOutlet: true,
  }
];

export const lifetimePlan = {
  id: "lifetime",
  name: "Lifetime Plan",
  price: 24999,
  setupFee: 0,
  features: ["Core features only", "No free future updates", "Limited support (6 months)", "Paid upgrades required"],
  tableLimit: 50,
  menuLimit: 999999,
  supportType: "limited",
  analytics: "advanced",
  multiOutlet: false,
};

export const trialPlan = {
  id: "trial",
  name: "7 Day Trial",
  price: 49,
  setupFee: 0,
  tableLimit: 10,
  menuLimit: 50,
  analytics: "basic",
  multiOutlet: false,
};

export const getPlanLimits = (planId: string) => {
  if (planId === "lifetime") return lifetimePlan;
  if (planId === "trial") return trialPlan;
  const p = plans.find(p => p.id === planId);
  return p || plans[0]; // default to basic
};
