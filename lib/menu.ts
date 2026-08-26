export type MenuItem = {
  name: string;
  description: string;
  image: string;
  alt: string;
};

// Menu highlights shown on the landing page. Edit this list to change
// what's featured — no other code needs to change.
export const menuHighlights: MenuItem[] = [
  {
    name: "Butter Chicken",
    description:
      "Tender chicken simmered in a rich, buttery tomato gravy with warm spice.",
    image: "/images/butter-chicken.jpg",
    alt: "Butter Chicken",
  },
  {
    name: "Chicken Bihari Boti",
    description:
      "Char-grilled marinated chicken boti, served with a crisp fresh salad.",
    image: "/images/bihari-boti.jpg",
    alt: "Chicken Bihari Boti",
  },
  {
    name: "Spring Rolls",
    description:
      "Golden and crisp, served with a side salad and sweet chili dip.",
    image: "/images/spring-rolls.jpg",
    alt: "Spring Rolls",
  },
  {
    name: "Beef Peshawari Kabab",
    description:
      "Smoky sizzling kabab, served on a hot skillet with lemon and herbs.",
    image: "/images/peshawari-kabab.jpg",
    alt: "Beef Peshawari Kabab",
  },
];
