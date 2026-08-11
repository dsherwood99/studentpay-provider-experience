import type { SimpleCourseContent } from "@/components/courses/SimpleEnrolmentCoursePage";

export const fullStackCourseContent: SimpleCourseContent = {
  breadcrumbLabel: "Technology",
  breadcrumbHref: "/providers/academy-australia/courses",
  script: "Technology accelerator",
  heroLead:
    "Build practical software development capability through an industry-focused programme designed for students moving toward full stack developer roles.",
  providerName: "Mission Ready",
  providerBlurb: [
    "Mission Ready is a technology education provider focused on helping students build practical, job-ready digital skills. Its accelerator-style programmes are designed to connect learning with real-world software development, project work and industry-aligned capability.",
    "This demonstration page shows how StudentPay can be embedded into a provider's course marketing and enrolment journey, allowing students to choose between upfront payment and flexible payment plans while keeping the provider's existing digital experience intact.",
  ],
  overview: [
    "This demo product page shows how a technology education provider can present a polished, high-conversion course page with clear course outcomes and StudentPay payment choices visible before checkout.",
    "The course is positioned for students looking to grow practical full stack development capability, strengthen project experience and prepare for opportunities in software development teams.",
  ],
  visual: {
    toneClass: "simple-course-visual--technology",
    eyebrow: "Technology pathway",
    title: "Build. Ship. Iterate.",
    description:
      "Practical full stack development skills supported by real-world project workflows and flexible payment options.",
    codeLines: [
      { keyword: "const", value: 'pathway = "developer";' },
      { keyword: "build", value: '("frontend");' },
      { keyword: "connect", value: '("backend-api");' },
      { keyword: "deploy", value: '("cloud");' },
      { keyword: "graduate", value: '("job-ready");' },
    ],
  },
  highlights: [
    "Full stack development pathway",
    "Practical project experience",
    "Designed for career transition",
    "Mentor and industry support",
  ],
  learnExtra:
    "Portfolio-ready project work aligned to full stack developer pathways",
  detailsIntro:
    "The programme is presented as a practical technology accelerator, combining structured learning, development projects and applied skills practice to help students build confidence across the full software development lifecycle.",
  details: [
    { label: "Programme type", value: "Advanced developer accelerator" },
    { label: "Format", value: "Online + project-based learning" },
    { label: "Focus", value: "Full stack development" },
    { label: "Outcome", value: "Portfolio and job-ready capability" },
  ],
};

export const photographyCourseContent: SimpleCourseContent = {
  breadcrumbLabel: "New Zealand",
  breadcrumbHref: "/#nz-courses",
  script: "Professional photography",
  heroLead:
    "Turn a passion for capturing the world into professional skill — with flexible online study, tutor support and payment options that fit real life.",
  providerName: "Careers Collectiv",
  providerBlurb: [
    "Careers Collectiv specialises in 100% online short courses that let students study when it suits them, with 24/7 access to expert tutor support. Courses are chosen to help people develop a new career, deepen a skill, or explore a passion.",
    "This demonstration page shows how StudentPay can sit inside a New Zealand educator’s course marketing and enrolment journey — with upfront payment or flexible weekly plans available before checkout.",
  ],
  overview: [
    "If you have a passion for capturing the world around you through photography, this course is designed to set your career in motion — whether you are a beginner or looking to refine existing skills.",
    "Students work through practical modules covering camera equipment, exposure, composition and digital editing, with optional pathways into areas such as portrait, wedding, travel and commercial photography.",
  ],
  visual: {
    toneClass: "simple-course-visual--photography",
    eyebrow: "Creative pathway",
    title: "See differently.",
    description:
      "Learn professional photography fundamentals online, with tutor support and the option to include a camera and lens kit.",
    image: "/providers/academy-australia/imagery/photography.jpg",
  },
  highlights: [
    "5 modules · ~300 hours of study",
    "100% online and self-paced",
    "24/7 tutor support",
    "Optional professional camera kit",
  ],
  learnExtra:
    "Build a portfolio ready for freelance, events, portrait or commercial pathways",
  detailsIntro:
    "The programme combines structured modules, practical assessments and applied editing skills so students can progress from beginner to confident photographer at their own pace.",
  details: [
    { label: "Programme type", value: "Professional Photography Certificate" },
    { label: "Format", value: "100% online · self-paced" },
    { label: "Focus", value: "Digital photography & editing" },
    { label: "Outcome", value: "Certificate of attainment" },
  ],
};
