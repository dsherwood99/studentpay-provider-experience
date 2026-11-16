import { academyAuEnrolmentReady } from "@/lib/au-enrolment/readiness";

export const runtime = "nodejs";

function held() {
  return Response.json(
    {
      success: false,
      error: {
        code: "AU_ENROLMENT_NOT_ACTIVATED",
        message: "This Academy Australia enrolment is held and cannot be submitted.",
      },
    },
    { status: 403 },
  );
}

export async function POST() {
  if (!academyAuEnrolmentReady()) {
    return held();
  }

  return held();
}

export async function GET() {
  return held();
}
