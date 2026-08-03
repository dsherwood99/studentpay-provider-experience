import type { Course } from "@/types/course";

export const courses: Course[] = [
  {
    code: "MAKEUP_ARTISTRY",
    slug: "makeup-artistry",
    providerCode: "ACADEMY_AUSTRALIA",
    title: "Makeup Artistry",
    category: "Beauty",
    shortDescription:
      "Build practical makeup artistry skills and start preparing for work with clients or your own beauty business.",
    description:
      "A practical, flexible course designed to introduce students to professional makeup techniques, client preparation and industry-ready application skills.",
    duration: "Self-paced",
    deliveryMode: "Online",
    outcomes: [
      "Develop foundation, contouring and colour-matching techniques",
      "Create makeup looks for different clients and occasions",
      "Understand hygiene, preparation and professional practice",
      "Build confidence working with clients",
    ],
    paymentPlan: {
      totalFee: 1499,
      depositAmount: 25,
      repaymentAmount: 25,
      frequency: "weekly",
    },
    featured: true,
  },
];

export function getCoursesByProvider(providerCode: string): Course[] {
  return courses.filter((course) => course.providerCode === providerCode);
}

export function getCourseBySlug(
  providerCode: string,
  courseSlug: string,
): Course | undefined {
  return courses.find(
    (course) =>
      course.providerCode === providerCode && course.slug === courseSlug,
  );
}