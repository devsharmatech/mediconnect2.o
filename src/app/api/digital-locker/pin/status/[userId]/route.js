import { OPTIONS, GET as baseGET } from "../route";

export const dynamic = "force-dynamic";

export { OPTIONS };

export async function GET(req, { params }) {
  const { userId } = await params;
  const url = new URL(req.url);
  url.searchParams.set("userId", userId);
  const syntheticReq = new Request(url, { method: "GET", headers: req.headers });
  return baseGET(syntheticReq);
}
