import { createDefine } from "fresh";

export interface State {
  contactSubmitted?: boolean;
  newsletterEmail?: string;
  pricingInterval?: "monthly" | "yearly";
}

export const define = createDefine<State>();
