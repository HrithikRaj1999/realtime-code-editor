import axios from "axios";

interface QueueRunJobInput {
  code: string;
  language: string;
  roomId: string;
}

interface QueueRunJobResponse {
  status?: string;
  [key: string]: unknown;
}

export async function queueRunJob({
  code,
  language,
  roomId,
}: QueueRunJobInput): Promise<QueueRunJobResponse> {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const response = await axios.post<QueueRunJobResponse>(`${apiUrl}/run`, {
    code,
    language,
    roomId,
  });
  return response.data;
}
