import { validateGymIdentity } from './gym-onboarding';

export type SignupState = { error?: string; success?: boolean; whatsappUrl?: string; gymName?: string; slug?: string; requiresPayment?: boolean };
const plans: Record<string, { price: number; label: string }> = {
  base_1m: {price:999,label:'Base: 1 Month'}, base_6m: {price:2399,label:'Base: 6 Months + 1 Month Demo'},
  base_1y: {price:3499,label:'Base: 1 Year + 1 Month Demo'}, pro_6m: {price:3499,label:'Pro: 6 Months'},
  pro_1y: {price:5499,label:'Pro: 1 Year'},
};

// Public enquiry only. No Auth, database, password, or session mutation.
export function prepareGymEnquiry(form: FormData): SignupState {
  const get = (key: string) => String(form.get(key) || '').trim();
  const gymName=get('gymName'), slug=get('slug').toLowerCase(), name=get('name'), email=get('email').toLowerCase(), phone=get('phone');
  const selected=get('plan');
  const alias: Record<string,string>={monthly:'base_1m','6months':'base_6m','1year':'base_1y'};
  const plan=plans[alias[selected] || selected];
  if (!plan) return {error:'Please select a valid paid plan.'};
  if (!gymName || !name) return {error:'Enter the gym name and owner name.'};
  const invalid=validateGymIdentity(slug,email);
  if (invalid) return {error:invalid};
  if (!/^\+?[\d\s()-]{10,20}$/.test(phone)) return {error:'Enter a valid WhatsApp / mobile number.'};
  const message = `Hi NeuraFitness Team! I want to onboard my gym.\n\nGym: ${gymName}\nRequested gym code: ${slug}\nOwner: ${name}\nEmail: ${email}\nWhatsApp: ${phone}\nPlan: ${plan.label}\nAmount: ₹${plan.price.toLocaleString('en-IN')}\n\nPlease confirm availability, share UPI payment details, and create my gym owner account after verification.`;
  return {success:true,whatsappUrl:`https://wa.me/919351219914?text=${encodeURIComponent(message)}`,gymName,slug,requiresPayment:true};
}
