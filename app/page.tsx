import Hero from "./components/Hero";
import MenuHighlights from "./components/MenuHighlights";
import Catering from "./components/Catering";
import BookTable from "./components/BookTable";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <MenuHighlights />
      <Catering />
      <BookTable />
      <Footer />
    </main>
  );
}
