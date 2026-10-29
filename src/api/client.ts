const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail ?? Object.values(body)[0] ?? `Request to ${path} failed with ${response.status}`;
    throw new ApiError(response.status, Array.isArray(detail) ? detail[0] : String(detail));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface Organization {
  id: string;
  name: string;
  ein: string;
  mission_statement: string;
  plan: "free" | "starter" | "pro";
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user: User;
  organization: Organization;
  role: "owner" | "admin" | "editor" | "viewer";
  created_at: string;
}

export interface FunderProgram {
  id: string;
  funder: string;
  name: string;
  typical_award_min: string | null;
  typical_award_max: string | null;
  next_deadline: string | null;
  deadline_recurrence: string;
  program_officer_name: string;
  program_officer_email: string;
  program_officer_notes: string;
  past_awards_summary: string;
}

export interface Funder {
  id: string;
  name: string;
  funder_type: "federal" | "foundation" | "corporate" | "state_local";
  website: string;
  focus_areas: string;
  notes: string;
  programs: FunderProgram[];
}

export interface SectionVersion {
  id: string;
  section: string;
  version_number: number;
  content: string;
  source: "human" | "ai_generated";
  created_by_email: string | null;
  word_count: number;
  created_at: string;
}

export interface GrantSection {
  id: string;
  grant: string;
  section_type: string;
  title: string;
  order: number;
  word_limit: number | null;
  current_version: SectionVersion | null;
  current_word_count: number;
  created_at: string;
}

export interface BudgetLineItem {
  id: string;
  budget: string;
  category: string;
  description: string;
  amount: string;
  is_indirect_base_exempt: boolean;
  created_at: string;
}

export interface BudgetSummary {
  total_direct_costs: string;
  indirect_cost_base_amount: string;
  indirect_cost_rate: string;
  indirect_costs: string;
  total_budget: string;
}

export interface Budget {
  id: string;
  grant: string;
  indirect_cost_rate: string;
  indirect_cost_base: "total_direct" | "mtdc" | "salaries_wages";
  notes: string;
  line_items: BudgetLineItem[];
  summary: BudgetSummary;
}

export interface OutcomeReport {
  id: string;
  grant: string;
  metric_name: string;
  target_value: string | null;
  actual_value: string | null;
  reporting_period_start: string | null;
  reporting_period_end: string | null;
  notes: string;
  percent_of_target: number | null;
}

export interface Grant {
  id: string;
  organization: string;
  funder_program: string | null;
  funder_name: string | null;
  title: string;
  status: "drafting" | "internal_review" | "submitted" | "awarded" | "rejected";
  amount_requested: string | null;
  deadline: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sections?: GrantSection[];
  outcomes?: OutcomeReport[];
  budget?: Budget;
}

export interface PlanLimits {
  max_grants: number | null;
  ai_generations_per_month: number;
  max_seats: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function registerAccount(payload: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  organization_name: string;
}): Promise<{ user: User; organization: Organization; tokens: AuthTokens }> {
  return request("/auth/register/", { method: "POST", body: JSON.stringify(payload) });
}

export function login(email: string, password: string): Promise<AuthTokens> {
  return request("/auth/login/", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function fetchMe(token: string): Promise<{ user: User; memberships: Membership[] }> {
  return request("/auth/me/", {}, token);
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export function listOrganizations(token: string): Promise<Paginated<Organization>> {
  return request("/organizations/", {}, token);
}

export function updateOrganization(
  id: string,
  payload: Partial<Pick<Organization, "name" | "ein" | "mission_statement">>,
  token: string,
): Promise<Organization> {
  return request(`/organizations/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

// ---------------------------------------------------------------------------
// Funders
// ---------------------------------------------------------------------------

export function listFunders(token: string, search?: string): Promise<Paginated<Funder>> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return request(`/funders/${qs}`, {}, token);
}

// ---------------------------------------------------------------------------
// Grants
// ---------------------------------------------------------------------------

export function listGrants(token: string, organizationId?: string): Promise<Paginated<Grant>> {
  const qs = organizationId ? `?organization=${organizationId}` : "";
  return request(`/grants/${qs}`, {}, token);
}

export function getGrant(id: string, token: string): Promise<Grant> {
  return request(`/grants/${id}/`, {}, token);
}

export function createGrant(
  payload: { organization: string; title: string; funder_program?: string; amount_requested?: string; deadline?: string },
  token: string,
): Promise<Grant> {
  return request("/grants/", { method: "POST", body: JSON.stringify(payload) }, token);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export function listSections(grantId: string, token: string): Promise<Paginated<GrantSection>> {
  return request(`/sections/?grant=${grantId}`, {}, token);
}

export function createSection(
  payload: { grant: string; section_type: string; title: string; order: number; word_limit?: number },
  token: string,
): Promise<GrantSection> {
  return request("/sections/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function saveSectionVersion(
  sectionId: string,
  content: string,
  token: string,
  source: "human" | "ai_generated" = "human",
): Promise<SectionVersion> {
  return request(`/sections/${sectionId}/versions/`, { method: "POST", body: JSON.stringify({ content, source }) }, token);
}

export function generateSectionDraft(sectionId: string, token: string, instructions = ""): Promise<SectionVersion> {
  return request(`/sections/${sectionId}/generate/`, { method: "POST", body: JSON.stringify({ instructions }) }, token);
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export function getBudgetForGrant(grantId: string, token: string): Promise<Budget> {
  return request<Paginated<Budget>>(`/budgets/?grant=${grantId}`, {}, token).then((page) => page.results[0]);
}

export function updateBudget(
  id: string,
  payload: Partial<Pick<Budget, "indirect_cost_rate" | "indirect_cost_base" | "notes">>,
  token: string,
): Promise<Budget> {
  return request(`/budgets/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }, token);
}

export function createBudgetLineItem(
  payload: { budget: string; category: string; description: string; amount: string; is_indirect_base_exempt?: boolean },
  token: string,
): Promise<BudgetLineItem> {
  return request("/budget-line-items/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function deleteBudgetLineItem(id: string, token: string): Promise<void> {
  return request(`/budget-line-items/${id}/`, { method: "DELETE" }, token);
}

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

export function listOutcomes(grantId: string, token: string): Promise<Paginated<OutcomeReport>> {
  return request(`/outcomes/?grant=${grantId}`, {}, token);
}

export function createOutcome(
  payload: { grant: string; metric_name: string; target_value?: string; actual_value?: string },
  token: string,
): Promise<OutcomeReport> {
  return request("/outcomes/", { method: "POST", body: JSON.stringify(payload) }, token);
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export function getPlans(): Promise<Record<string, PlanLimits>> {
  return request("/billing/plans/");
}

export function createCheckoutSession(
  payload: { organization_id: string; plan: "starter" | "pro"; success_url: string; cancel_url: string },
  token: string,
): Promise<{ checkout_url: string }> {
  return request("/billing/checkout-session/", { method: "POST", body: JSON.stringify(payload) }, token);
}

export function createPortalSession(
  payload: { organization_id: string; return_url: string },
  token: string,
): Promise<{ portal_url: string }> {
  return request("/billing/portal-session/", { method: "POST", body: JSON.stringify(payload) }, token);
}
