import type { Course } from "@/types/course";

export const courses: Course[] = [
  {
    code: "MAKEUP_ARTISTRY",
    slug: "makeup-artistry",
    providerCode: "ACADEMY_AUSTRALIA",
    deliveryProvider: "Bela Beauty College",
    title: "Makeup Artistry Course Bundle + Kit",
    category: "Beauty",
    shortDescription:
      "Develop practical makeup artistry skills through flexible online study, demonstrations and mentor support.",
    description:
      "A practical online course designed to introduce students to professional makeup techniques, client preparation and industry-ready application skills.",
    duration: "Self-paced",
    deliveryMode: "100% online",
    badges: ["8 modules", "Mentor support", "Kit included"],
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
      numberOfPayments: 57,
    },
    visualTone: "beauty",
    featured: true,
  },
  {
    code: "CRIMINAL_PSYCHOLOGY",
    slug: "criminal-psychology",
    providerCode: "ACADEMY_AUSTRALIA",
    deliveryProvider: "Hader Institute",
    title: "Criminal Psychology",
    category: "Psychology & Criminology",
    shortDescription:
      "Explore criminal behaviour, psychology, forensic science and the relationship between crime and law.",
    description:
      "A flexible online short course for students interested in criminology, justice, psychology-informed roles or further forensic-related study.",
    duration: "12 weeks",
    deliveryMode: "100% online",
    badges: ["Self-paced", "No exams", "Short course"],
    outcomes: [
      "Understand key theories of criminal behaviour",
      "Explore forensic psychology and offending patterns",
      "Examine the relationship between psychology, crime and law",
      "Build introductory knowledge for further study",
    ],
    paymentPlan: {
      totalFee: 1200,
      depositAmount: 25,
      repaymentAmount: 28,
      frequency: "weekly",
      numberOfPayments: 42,
    },
    visualTone: "psychology",
    featured: true,
  },
  {
    code: "FULL_STACK_DEVELOPER",
    slug: "full-stack-developer",
    providerCode: "ACADEMY_AUSTRALIA",
    title: "Advanced Full Stack Developer Accelerator",
    category: "Technology",
    shortDescription:
      "Build practical front-end and back-end development skills through project-based online learning.",
    description:
      "A career-focused development course covering modern web technologies, practical projects and core full-stack development concepts.",
    duration: "Flexible",
    deliveryMode: "Online and project-based",
    deliveryProvider: "Mission Ready",
    badges: ["Online learning", "Project-based", "Career-focused"],
    outcomes: [
      "Modern front-end development and responsive user interface design",
      "Back-end development concepts, APIs and application logic",
      "Database fundamentals and data-driven application workflows",
      "Cloud, deployment and practical software delivery practices",
    ],
    paymentPlan: {
      totalFee: 4995,
      depositAmount: 25,
      repaymentAmount: 95,
      frequency: "weekly",
    },
    visualTone: "technology",
  },
  {
    code: "VETERINARY_ASSISTANT",
    slug: "veterinary-assistant-animal-welfare",
    providerCode: "ACADEMY_AUSTRALIA",
    title: "Veterinary Assistant & Animal Welfare Bundle",
    category: "Animal Care",
    shortDescription:
      "Build introductory animal care, welfare and veterinary support knowledge through flexible online study.",
    description:
      "A practical pathway for students who want to work around animals, support animal welfare and prepare for entry-level animal care roles.",
    duration: "Self-paced",
    deliveryMode: "100% online",
    badges: ["Tutor support", "Beginner friendly", "Course bundle"],
    outcomes: [
      "Understand foundational animal care practices",
      "Explore animal welfare and handling principles",
      "Learn about veterinary support environments",
      "Prepare for further animal care study",
    ],
    paymentPlan: {
      totalFee: 1450,
      depositAmount: 25,
      repaymentAmount: 25,
      frequency: "weekly",
      numberOfPayments: 57,
    },
    visualTone: "animal",
    featured: true,
  },
];

export function getCoursesByProvider(providerCode: string): Course[] {
  return courses.filter((course) => course.providerCode === providerCode);
}

export function getFeaturedCoursesByProvider(providerCode: string): Course[] {
  return courses.filter(
    (course) => course.providerCode === providerCode && course.featured,
  );
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