"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { Business, BrandSettings, FeatureToggles } from "@/types";

interface AppState {
  business: Business | null;
  brand: BrandSettings | null;
  features: FeatureToggles | null;
  userId: string | null;
  loading: boolean;

  setBusiness: (b: Business | null) => void;
  setBrand: (b: BrandSettings | null) => void;
  setFeatures: (f: FeatureToggles | null) => void;
  setUserId: (id: string | null) => void;
  fetchBusiness: () => Promise<void>;
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  business: null,
  brand: null,
  features: null,
  userId: null,
  loading: false,

  setBusiness: (business) => set({ business }),
  setBrand:    (brand)    => set({ brand }),
  setFeatures: (features) => set({ features }),
  setUserId:   (userId)   => set({ userId }),

  reset: () => set({ business: null, brand: null, features: null, userId: null }),

  fetchBusiness: async () => {
    set({ loading: true });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ loading: false }); return; }

    set({ userId: user.id });

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (biz) {
      set({ business: biz as Business });

      const [{ data: brand }, { data: features }] = await Promise.all([
        supabase
          .from("brand_settings")
          .select("*")
          .eq("business_id", biz.id)
          .single(),
        supabase
          .from("feature_toggles")
          .select("*")
          .eq("business_id", biz.id)
          .single(),
      ]);

      if (brand)    set({ brand: brand as BrandSettings });
      if (features) set({ features: features as FeatureToggles });
    }

    set({ loading: false });
  },
}));
