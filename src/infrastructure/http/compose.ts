export type ReqCtx = {
  requestId: string;
  userId: string | null;
};

export type Next = () => Promise<Response>;
export type Middleware = (req: Request, ctx: ReqCtx, next: Next) => Promise<Response>;
export type RouteHandler = (req: Request, ctx: ReqCtx) => Response | Promise<Response>;

export function compose(
  ...middlewares: Middleware[]
): (handler: RouteHandler) => (req: Request) => Promise<Response> {
  return handler => async req => {
    const ctx: ReqCtx = { requestId: crypto.randomUUID(), userId: null };
    let i = 0;
    const next: Next = () => {
      const mw = middlewares[i++];
      return mw ? mw(req, ctx, next) : Promise.resolve(handler(req, ctx) as Promise<Response>);
    };
    return next();
  };
}
