// ================= BASIC TYPES =================

export type RiskPreference = "low" | "medium" | "high";
export type TimeUnit = "months" | "years";

// ================= REQUEST =================

export type RecommendRequest = {
  amount: number;
  risk_preference: RiskPreference;
  time_value: number;
  time_unit: TimeUnit;
};

// ================= ALLOCATION =================

export type AllocationItem = {
  company: string;
  amount: number;
  amount_display?: string;
  monthly_amount?: number;
  monthly_amount_display?: string;
  weight: number;
  expected_return?: number;
  historical_mean_return?: number;
  cagr_return?: number;
  trailing_one_year_return?: number;
  stock_risk_score?: number;
  stock_risk_level?: "low" | "medium" | "high";
  selection_score?: number;
  market_beta?: number;
};

// ================= PORTFOLIO =================

export type PortfolioEvaluation = {
  expected_return_pct: number;
  cagr_return_pct?: number;
  volatility_pct: number;
  sharpe_like_ratio: number;
  diversification_score: number;
};

// ================= RESPONSE =================

export type RecommendResponse = {
  service?: {
    version?: string;
    generated_for?: string;
    generated_at_utc?: string;
  };

  summary: {
    headline: string;
    market_condition?: string;
    confidence?: string;
    confidence_percent?: number;
  };

  risk_score: number;
  risk_score_basis?: string;

  investment_plan: {
    total_invested: number;
    best_company?: string;
    recommended_allocation: AllocationItem[];
  };

  why_this_decision?: string[];
  stock_analysis?: string[];

  portfolio_risk_contribution?: Record<string, number>;
  portfolio_split?: Record<string, number>;

  what_to_do?: {
    recommended_action: string;
  };

  sip?: {
    monthly_investment: number;
    months: number;
  };

  data_sources?: {
    market_data?: string;
    model?: string;
    features?: string;
  };

  evaluation?: PortfolioEvaluation;

  metadata?: {
    live_data_used?: boolean;
    fallback_reason?: string;
    considered_universe_size?: number;
    shortlisted_universe_size?: number;
    selected_stocks_count?: number;
    as_of_date?: string;
    return_basis?: string;
    market_snapshot?: string;
    macro_snapshot?: string;
  };

  generated_at?: string;

  note?: string;

  // 🔥 REQUIRED FOR FRONTEND (SHAP + UI)
  shap_plot?: string;
  portfolio_chart?: string;

  // 🔥 REQUIRED FOR BACKEND (STATIC FILES)
  charts?: {
    shap_summary?: string;
    efficient_frontier?: string;
  };
};
