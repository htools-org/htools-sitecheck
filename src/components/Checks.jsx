import { useState } from "react";
import classNames from "classnames";
import { ReactComponent as CheckIcon } from "../assets/icons/check.svg";
import { ReactComponent as ExclamationIcon } from "../assets/icons/exclamation.svg";

function Checks(props) {
  const { data } = props;
  const groups = [
    {
      name: "Blockchain-related",
      checks: ["dsExists", "treeUpdated"],
    },
    {
      name: "Configuration-related",
      checks: [
        "nsDnssecEnabled",
        "dnssecChainValid",
        "tlsaExists",
        "webserverContent",
        "correctTlsa",
      ],
    },
  ];

  const [selectedCheck, setSelectedCheck] = useState(null);

  return (
    <div className="grid max-w-2xl mx-auto md:grid-cols-2 gap-x-8 gap-y-4">
      {/* Left */}
      <div className="text-sm font-medium">
        {groups.map((group) => (
          <div
            key={group.name}
            className="mb-8 divide-y divide-gray-400 last-of-type:mb-0"
          >
            <h4 className="mb-2">{group.name}</h4>
            {group.checks.map((check) => (
              <div
                key={check}
                className={classNames(
                  "px-4 py-3 flex items-center bg-gray-100 cursor-pointer first-of-type:rounded-t last-of-type:rounded-b shadow-lg",
                  {
                    "text-green-700": data[check].ok && check !== selectedCheck,
                    "text-red-700": !data[check].ok && check !== selectedCheck,
                    "bg-green-600": data[check].ok && check === selectedCheck,
                    "bg-red-600": !data[check].ok && check === selectedCheck,
                    "hover:bg-gray-200": check !== selectedCheck,
                  }
                )}
                onClick={() => setSelectedCheck(check)}
              >
                {data[check].ok ? (
                  <CheckIcon className="flex-shrink-0 w-4 h-4 fill-current" />
                ) : (
                  <ExclamationIcon className="flex-shrink-0 w-4 h-4 fill-current" />
                )}
                <span className="ml-2">
                  {data[check].title || data[check].message}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Right */}
      <div className="overflow-auto break-words bg-gray-600 rounded-sm shadow">
        {selectedCheck ? (
          <div className="p-4 space-y-6">
            <p>{data[selectedCheck].desc}</p>
            <p>
              Currently:
              <br />
              <span className="text-sm font-light">
                {data[selectedCheck].current}
              </span>
            </p>
            {data[selectedCheck].solution && (
              <p>
                Solution:
                <br />
                <span className="text-sm font-light">
                  {data[selectedCheck].solution}
                </span>
              </p>
            )}
            {data[selectedCheck].refUrl && (
              <a
                className="block text-sm underline"
                href={data[selectedCheck].refUrl}
              >
                {data[selectedCheck].refUrl}
              </a>
            )}
          </div>
        ) : (
          <div className="p-4">
            <p className="m-4">Select a check to see more details.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Checks;
