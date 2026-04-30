export type TaskStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILURE";
export type TaskType = "MIDJOURNEY_IMAGE" | "SUNO_MUSIC" | "OTHER";

export type AsyncTask = {
  id: string;
  type: TaskType;
  status: TaskStatus;
  submittedAt: string; // ISO
  completedAt: string | null; // ISO
  prompt: string;
  resultUrl?: string;
  error?: string;
  refundQuota?: number;
};

const STORAGE_KEY = "token-saas.console.tasks.v1";

export function loadTasks(): AsyncTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as AsyncTask[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: AsyncTask[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function seedDemoTasks(): AsyncTask[] {
  const now = Date.now();
  const types: TaskType[] = ["MIDJOURNEY_IMAGE", "SUNO_MUSIC"];
  const statuses: TaskStatus[] = ["PENDING", "IN_PROGRESS", "SUCCESS", "FAILURE"];

  const tasks: AsyncTask[] = Array.from({ length: 12 }).map((_, i) => {
    const type = types[i % types.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const submittedAt = new Date(now - Math.floor(Math.random() * 72 * 3600 * 1000)).toISOString();
    const completedAt =
      status === "SUCCESS" || status === "FAILURE"
        ? new Date(new Date(submittedAt).getTime() + (10 + Math.random() * 80) * 1000).toISOString()
        : null;
    return {
      id: `task_${crypto.randomUUID()}`,
      type,
      status,
      submittedAt,
      completedAt,
      prompt: type === "MIDJOURNEY_IMAGE" ? "a cyberpunk cat, neon, cinematic" : "lofi chill beat, 90bpm",
      resultUrl: status === "SUCCESS" ? "https://example.com/result" : undefined,
      error: status === "FAILURE" ? "Generation failed (demo)" : undefined,
      refundQuota: status === "FAILURE" ? 120 : undefined
    };
  });

  tasks.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  saveTasks(tasks);
  return tasks;
}

export function advanceTask(t: AsyncTask): AsyncTask {
  if (t.status === "PENDING") return { ...t, status: "IN_PROGRESS" };
  if (t.status === "IN_PROGRESS") {
    const ok = Math.random() > 0.2;
    const completedAt = new Date().toISOString();
    if (ok) {
      return { ...t, status: "SUCCESS", completedAt, resultUrl: "https://example.com/result" };
    }
    return { ...t, status: "FAILURE", completedAt, error: "Generation failed (demo)", refundQuota: 120 };
  }
  return t;
}

