import { success, failure } from "@/lib/response";

export async function POST(req) {
  try {
    const body = await req.json();
    const { planId, doctorId } = body;

    return success("Subscription activated successfully", { planId, status: "Active" }, 200);
  } catch (error) {
    return failure("Internal Error", error.message, 500);
  }
}
