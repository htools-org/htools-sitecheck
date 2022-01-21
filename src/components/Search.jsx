import { useEffect, useState } from "react";

import { ReactComponent as SpinnerIcon } from "../assets/icons/spinner.svg";

function Search(props) {
  const { setDomain, loading } = props;

  const [value, setValue] = useState("");

  useEffect(() => {
    if (props.domain) {
      setValue(props.domain);
    }
  }, [props.domain]);

  function searchDomain() {
    setDomain(value);
    window.history.pushState({}, "", "/check/" + value);
  }

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row">
      <input
        type="text"
        placeholder="domain name"
        className="flex-grow px-4 py-2 text-gray-800 bg-gray-100 border-2 border-gray-400 rounded-full outline-none md:text-xl md:border-4 md:py-4 md:px-6 md:min-w-full"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && searchDomain()}
      />
      <button
        className="flex-shrink-0 w-16 h-16 text-xl bg-gray-200 border border-gray-300 rounded-full"
        onClick={loading ? null : searchDomain}
      >
        {loading ? (
          <SpinnerIcon className="stroke-current text-cyan-700" />
        ) : (
          <>🔍</>
        )}
      </button>
    </div>
  );
}

export default Search;
