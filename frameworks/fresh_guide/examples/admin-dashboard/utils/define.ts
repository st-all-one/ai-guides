import { createDefine } from "fresh";

export interface State {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "editor" | "viewer";
    avatar?: string;
  };
  sidebarOpen?: boolean;
  toast?: {
    type: "success" | "error";
    message: string;
  };
}

export const define = createDefine<State>();
