import { FastifyReply } from "fastify";

export interface ApiResponsePayload<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[] | string>;
  statusCode?: number;
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data?: T,
  message?: string,
  statusCode: number = 200
) {
  const payload: ApiResponsePayload<T> = {
    success: true,
  };

  if (message !== undefined) {
    payload.message = message;
  }

  if (data !== undefined) {
    payload.data = data;
  }

  return reply.status(statusCode).send(payload);
}

