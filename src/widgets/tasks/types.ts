export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

export type CompletedPosition = "top" | "bottom";
