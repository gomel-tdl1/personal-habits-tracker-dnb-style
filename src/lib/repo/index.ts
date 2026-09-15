import { isDemo } from "../supabase/env";
import { demoRepo } from "./demo";
import { supabaseRepo } from "./supabase";

export const repo = isDemo ? demoRepo : supabaseRepo;
export type { Repo } from "./types";
