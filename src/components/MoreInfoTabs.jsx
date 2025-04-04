import { useState, useRef, useEffect } from "react";
import classNames from "classnames";

function MoreInfoTabs(props) {
  const { data } = props;

  const tabs = ["DNSSEC Trust Graph", "DNSSEC Validation Flow"];
  const [selectedTab, setSelectedTab] = useState(0);

  const graphRef = useRef(null);
  const [graphHeight, setGraphHeight] = useState("0px");

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.contentWindow.document.open();
      graphRef.current.contentWindow.document.write(data.dnsvizGraph);
      graphRef.current.contentWindow.document.close();
    }
  }, [data.dnsvizGraph, selectedTab]);

  return (
    <div className="max-w-4xl mx-auto bg-gray-50">
      {/* Tabs */}
      <nav className="flex">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={classNames(
              "text-gray-600 py-4 px-6 block hover:text-gray-500 focus:outline-hidden text-sm md:text-base",
              {
                "text-gray-900 border-b-2 font-bold border-gray-700":
                  idx === selectedTab,
              }
            )}
            onClick={() => setSelectedTab(idx)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="p-2 overflow-auto bg-gray-100 border rounded-sm shadow-sm">
        {/* Graph */}
        {selectedTab === 0 && (
          <>
            <span>Hover over nodes and edges for details.</span>{" "}
            <a
              href="https://dnsviz.net/doc/dnssec/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Click here for legend
            </a>
            <iframe
              className="w-full"
              height={graphHeight}
              ref={graphRef}
              onLoad={() =>
                setGraphHeight(
                  graphRef.current.contentWindow.document.body.scrollHeight +
                    20 +
                    "px"
                )
              }
            />
          </>
        )}

        {/* Delv */}
        {selectedTab === 1 && (
          <>
            <pre>{data.delv}</pre>
          </>
        )}
      </div>
    </div>
  );
}

export default MoreInfoTabs;
