import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** An error that maps directly to an HTTP response. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new AppError(404, "Document not found");
export const forbidden = (msg = "You do not have permission to do that") => new AppError(403, msg);

/** Wrap a route handler so thrown AppErrors / ZodErrors become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const msg = err.issues.map((i) => i.message).join("; ");
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}
