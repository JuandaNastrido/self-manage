/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared API client for frontend components.
 * Provides typed fetch wrappers for all API endpoints.
 */
export interface ApiResponseWrapper<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json: ApiResponseWrapper<T> = await res.json();

  if (!json.success) {
    throw new ApiError(json.error || "Request failed", res.status, json.errors);
  }

  return json.data as T;
}

/**
 * Base fetch wrapper with error handling.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  return parseResponse<T>(res);
}

/**
 * Response shape of GET /api/transactions — the list plus the all-time
 * balance figures computed by the server.
 */
export interface TransactionsResponse {
  transactions: any[];
  balance: number;
  totalIncome: number;
  totalExpenses: number;
}

/**
 * API client for transactions
 */
export const transactionsApi = {
  list: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return apiFetch<TransactionsResponse>(
      `/api/transactions${qs ? `?${qs}` : ""}`
    );
  },

  get: (id: string) => apiFetch<any>(`/api/transactions/${id}`),

  create: (data: any) =>
    apiFetch<any>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/transactions/${id}`, {
      method: "DELETE",
    }),
};

/**
 * API client for categories
 */
export const categoriesApi = {
  list: (type?: string) => {
    const qs = type ? `?type=${type}` : "";
    return apiFetch<any[]>(`/api/categories${qs}`);
  },

  get: (id: string) => apiFetch<any>(`/api/categories/${id}`),

  create: (data: any) =>
    apiFetch<any>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/categories/${id}`, {
      method: "DELETE",
    }),
};

/**
 * API client for tasks
 */
export const tasksApi = {
  list: (params?: URLSearchParams) => {
    const qs = params?.toString();
    return apiFetch<any[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => apiFetch<any>(`/api/tasks/${id}`),

  create: (data: any) =>
    apiFetch<any>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/api/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/tasks/${id}`, {
      method: "DELETE",
    }),
};

/**
 * API client for budgets
 */
export const budgetsApi = {
  list: (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year !== undefined) params.set("year", String(year));
    if (month !== undefined) params.set("month", String(month));
    const qs = params.toString();
    return apiFetch<any[]>(`/api/budgets${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => apiFetch<any>(`/api/budgets/${id}`),

  create: (data: any) =>
    apiFetch<any>("/api/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/api/budgets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/budgets/${id}`, {
      method: "DELETE",
    }),
};

/**
 * API client for savings goals
 */
export const savingsGoalsApi = {
  list: () => apiFetch<any[]>("/api/savings-goals"),

  get: (id: string) => apiFetch<any>(`/api/savings-goals/${id}`),

  create: (data: any) =>
    apiFetch<any>("/api/savings-goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/api/savings-goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/savings-goals/${id}`, {
      method: "DELETE",
    }),

  allocation: {
    list: (goalId: string) =>
      apiFetch<any[]>(
        `/api/savings-allocations${goalId ? `?goalId=${goalId}` : ""}`
      ),

    create: (data: any) =>
      apiFetch<any>("/api/savings-allocations", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/savings-allocations/${id}`, {
        method: "DELETE",
      }),
  },
};

/**
 * API client for timer
 */
export const timerApi = {
  getState: () => apiFetch<any>("/api/timer"),

  start: (taskId: string) =>
    apiFetch<any>("/api/timer", {
      method: "POST",
      body: JSON.stringify({ action: "start", taskId }),
    }),

  pause: () =>
    apiFetch<any>("/api/timer", {
      method: "POST",
      body: JSON.stringify({ action: "pause" }),
    }),

  resume: () =>
    apiFetch<any>("/api/timer", {
      method: "POST",
      body: JSON.stringify({ action: "resume" }),
    }),

  stop: () =>
    apiFetch<any>("/api/timer", {
      method: "POST",
      body: JSON.stringify({ action: "stop" }),
    }),
};

export const dashboardApi = {
  getSummary: () => apiFetch<any>("/api/dashboard/summary"),
};

export const userPreferencesApi = {
  get: () => apiFetch<any>("/api/user-preferences"),
  update: (data: any) =>
    apiFetch<any>("/api/user-preferences", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
