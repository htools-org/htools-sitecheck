import GitHubIcon from "../assets/icons/github.svg?react";

function Header(props) {
  function goToHome() {
    window.history.pushState({}, "", "/");
    props.clearDomain();
  }

  return (
    <div className="flex items-center justify-between px-8 shadow-md">
      <h1 className="py-4 text-gray-800 cursor-pointer" onClick={goToHome}>
        HTools SiteCheck
      </h1>
      <a
        href="https://github.com/htools-org/htools-sitecheck"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-black"
      >
        <GitHubIcon className="w-6 h-6 " />
      </a>
    </div>
  );
}

export default Header;
