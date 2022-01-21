function Footer() {
  return (
    <div className="flex-shrink-0 w-full py-2 text-center bg-gray-100">
      <p className="text-sm font-medium text-gray-600">
        {" "}
        Made with ♥️ by{" "}
        <a
          href="https://blek.ga"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Rithvik Vibhu
        </a>{" "}
        | Proudly supported by{" "}
        <a
          href="https://github.com/HandyOSS/HandyGrants"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          HandyOSS
        </a>
      </p>
    </div>
  );
}

export default Footer;
