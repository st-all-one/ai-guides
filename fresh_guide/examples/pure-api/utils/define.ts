import { createDefine } from "fresh";

export interface State {
  auth?: { userId: string; role: "user" | "admin"; scopes: string[] };
  requestId?: string;
  rateLimit?: { remaining: number; reset: number };
}

export const define = createDefine<State>();
