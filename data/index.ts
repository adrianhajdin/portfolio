export const navItems = [
  { name: "About", link: "#about" },
  { name: "Projects", link: "#projects" },
  { name: "Experience", link: "#experience" },
  { name: "Contact", link: "#contact" },
];

export const gridItems = [
  {
    id: 1,
    title: "I am proficient developing in Windows, macOS, and Linux environments ",
    description: "",
    className: "lg:col-span-3 md:col-span-6 md:row-span-4 lg:min-h-[60vh]",
    imgClassName: "w-full h-full",
    titleClassName: "justify-end text-white",
    img: "/b1.svg",
    spareImg: "",
  },
  {
    id: 2,
    title: "I chase opportunity no matter where it takes me",
    description: "",
    className: "lg:col-span-2 md:col-span-3 md:row-span-2",
    imgClassName: "",
    titleClassName: "justify-start text-white",
    img: "",
    spareImg: "",
  },
  {
    id: 3,
    title: "New Tools",
    description: "I am constantly learning",
    className: "lg:col-span-2 md:col-span-3 md:row-span-2",
    imgClassName: "",
    titleClassName: "justify-center text-white",
    img: "",
    spareImg: "",
  },
  {
    id: 4,
    title: "Professional developer with an entrepreneurial spirit",
    description: "",
    className: "lg:col-span-2 md:col-span-3 md:row-span-1",
    imgClassName: "",
    titleClassName: "justify-start text-white",
    img: "/grid.svg",
    spareImg: "/b4.svg",
  },

  {
    id: 5,
    title: "Currently building the online store for my fundraiser",
    description: "The SASI Store",
    className: "md:col-span-3 md:row-span-2",
    imgClassName: "absolute right-0 bottom-0 md:w-96 w-60",
    titleClassName: "justify-center md:justify-start lg:justify-center text-white",
    img: "/b5.svg",
    spareImg: "/grid.svg",
  },
  {
    id: 6,
    title: "View Resume",
    description: "",
    className: "lg:col-span-2 md:col-span-3 md:row-span-1",
    imgClassName: "",
    titleClassName: "justify-center md:max-w-full max-w-60 text-center text-white",
    img: "",
    spareImg: "",
  },
];

export const projects = [
  {
    id: 1,
    title: "IntelliDrive - AI Storage",
    des: "Storing everything for you and your academic needs. All in one place, supercharged by AI.",
    img: "/intellidrive.png",
    iconLists: ["/next.svg", "re.svg", "/tail.svg", "/ts.svg",  "/c.svg"],
    link: "https://drive.stonewerner.com",
  },
  {
    id: 2,
    title: "SASI Store",
    des: "My online merchandise store to raise funds for various causes my friends and I care about.",
    img: "/sasi_store_front.png",
    iconLists: ["/next.svg", "/tail.svg", "/ts.svg", "/stream.svg", "/c.svg"],
    link: "https://store.stonewerner.com",
  },
  {
    id: 3,
    title: "AI Rate My Professor",
    des: "RAG-powered AI chatbot that allows users to query any information about their school's professors and courses.",
    img: "/rmp.jpg",
    iconLists: ["/re.svg", "/tail.svg", "/ts.svg", "/three.svg", "/c.svg"],
    link: "",
  },
  {
    id: 4,
    title: "Flashcard SaaS",
    des: "A Software-as-a-Service app to quickly and easily generate and save flashcards on any topic.",
    img: "/flashcard.webp",
    iconLists: ["/next.svg", "/tail.svg", "/ts.svg", "/three.svg", "/gsap.svg"],
    link: "",
  },
];

export const testimonials = [
  {
    quote:
      "Stone did an amazing job on our website! He was super professional, easy to communicate with, and really knew his stuff. The site looks great, runs faster, and the user experience is way better. I'm really impressed with his work and would definitely recommend him to anyone.",
    name: "Chef Whitney",
    title: "Head of Roast Restaurant Group",
  },
  {
    quote:
      "Stone did an amazing job on our website! He was super professional, easy to communicate with, and really knew his stuff. The site looks great, runs faster, and the user experience is way better. I'm really impressed with his work and would definitely recommend him to anyone.",
    name: "Chef Whitney",
    title: "Head of Roast Restaurant Group",
  },
  {
    quote:
      "Stone did an amazing job on our website! He was super professional, easy to communicate with, and really knew his stuff. The site looks great, runs faster, and the user experience is way better. I'm really impressed with his work and would definitely recommend him to anyone.",
    name: "Chef Whitney",
    title: "Head of Roast Restaurant Group",
  },
  {
    quote:
      "Stone did an amazing job on our website! He was super professional, easy to communicate with, and really knew his stuff. The site looks great, runs faster, and the user experience is way better. I'm really impressed with his work and would definitely recommend him to anyone.",
    name: "Chef Whitney",
    title: "Head of Roast Restaurant Group",
  },
  {
    quote:
      "Stone did an amazing job on our website! He was super professional, easy to communicate with, and really knew his stuff. The site looks great, runs faster, and the user experience is way better. I'm really impressed with his work and would definitely recommend him to anyone.",
    name: "Chef Whitney",
    title: "Head of Roast Restaurant Group",
  },
];

export const companies = [
  {
    id: 1,
    name: "cloudinary",
    img: "/cloud.svg",
    nameImg: "/cloudName.svg",
  },
  {
    id: 2,
    name: "appwrite",
    img: "/app.svg",
    nameImg: "/appName.svg",
  },
  {
    id: 3,
    name: "HOSTINGER",
    img: "/host.svg",
    nameImg: "/hostName.svg",
  },
  {
    id: 4,
    name: "stream",
    img: "/s.svg",
    nameImg: "/streamName.svg",
  },
  {
    id: 5,
    name: "docker.",
    img: "/dock.svg",
    nameImg: "/dockerName.svg",
  },
];

export const workExperience = [
  {
    id: 1,
    title: "Software Engineer, Backend",
    subtitle: "Texas Comptroller of Public Accounts",
    desc: "Building the backend for web applications using Java and Spring Boot.",
    className: "md:col-span-2",
    thumbnail: "/exp1.svg",
  },
  {
    id: 2,
    title: "Software Engineering Fellow",
    subtitle: "Headstarter AI",
    desc: "Developed 6 AI focused projects using new tools such as Pinecone, OpenAI API, and Firebase.",
    className: "md:col-span-2", // change to md:col-span-2
    thumbnail: "/exp2.svg",
  },
  {
    id: 3,
    title: "Co-founder, CTO",
    subtitle: "The SASI Store",
    desc: "Co-founded an online store as a vehicle to raise funds for causes important to my friends and me.",
    className: "md:col-span-2", // change to md:col-span-2
    thumbnail: "/exp3.svg",
  },
  {
    id: 4,
    title: "Freelance Web Developer",
    subtitle: "Self Employed",
    desc: "Create robust websites for businesses to boost their online presence and conversion rates.",
    className: "md:col-span-2",
    thumbnail: "/exp4.svg",
  },
];

export const socialMedia = [
  {
    id: 1,
    img: "/git.svg",
    link: "https://www.github.com/stonewerner",
  },
  {
    id: 2,
    img: "/link.svg",
    link: "https://www.linkedin.com/in/stonewerner",
  },
];
