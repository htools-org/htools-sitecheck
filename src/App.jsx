import { useEffect, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Search from "./components/Search";
import Checks from "./components/Checks";
import MoreInfoTabs from "./components/MoreInfoTabs";

function App() {
  const [domain, setDomain] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // See if url has a domain to check
  useEffect(() => {
    const domainFromUrl = window.location.pathname.split("/")?.at(-1) || null;
    if (domainFromUrl) {
      setDomain(domainFromUrl);
    }
  }, []);

  // Get results from API whenever domain changes
  useEffect(async () => {
    if (!domain || !domain.length) {
      setData(null);
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/check/${domain}`
      );
      const parsed = await response.json();
      if (parsed.error) {
        setDomain("");
        setError(parsed.error);
        setData(null);
      } else {
        setError(null);
        setData(parsed);
      }
    } catch (error) {
      setDomain("");
      setError(error.message);
      setData(null);
    }
  }, [domain]);

  // If domain is empty or no response yet (loading)
  if (!domain || !data) {
    return (
      <>
        <Header clearDomain={() => setDomain("")} />
        <div className="flex flex-col items-center justify-center flex-grow">
          <h1 className="px-4 mb-8 text-center text-gray-600 md:text-2xl">
            Type in a domain to analyze DNS, DNSSEC and DANE.
          </h1>
          <Search
            domain={domain}
            setDomain={setDomain}
            loading={domain && !data}
          />
          {error && <p className="mt-2 text-red-700">Error: {error}</p>}
        </div>
        <Footer />
      </>
    );
  }

  // Results
  return (
    <>
      <Header clearDomain={() => setDomain("")} />

      <main className="mt-8">
        <h2 className="max-w-2xl mx-auto text-lg text-center md:text-xl md:text-left">
          {domain}{" "}
          <span className="text-gray-400">
            ({data.ipAddress || "couldn't resolve IP"})
          </span>
        </h2>

        <section className="px-4 py-8 mt-8 text-white bg-gray-700 md:px-16">
          <h3 className="max-w-2xl mx-auto mb-6 text-xl font-medium text-center md:text-left">
            Website Checks
          </h3>
          <Checks data={data} />
        </section>

        <section className="px-4 py-8 mt-8 md:px-16">
          <h3 className="max-w-2xl mx-auto mb-6 text-xl font-medium text-center md:text-left">
            More Information
          </h3>
          <MoreInfoTabs data={data} />
        </section>
      </main>

      <Footer />
    </>
  );
}

export default App;
