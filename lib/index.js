const tls = require("tls");
const {
  RecursiveResolver,
  util: bnsUtil,
  constants: bnsConstants,
  dane,
} = require("bns");

const utils = require("./utils");

// Recursive Resolver with handshake root anchor
const recursiveResolver = new RecursiveResolver({
  dnssec: true,
});
recursiveResolver.hints.addServer(".", "127.0.0.49");
recursiveResolver.hints.addAnchor(
  ". DS 35215 13 2 7C50EA94A63AEECB65B510D1EAC1846C973A89D4AB292287D5A4D715136B57A3"
);
// recursiveResolver.on('log', (...args) => console.log(...args));

/**
 * Validator
 */
class Validator {
  constructor(domain) {
    const fqdnRegexp = /[\w-.]+/gim;
    if (!fqdnRegexp.test(domain)) {
      throw new Error("Invalid domain name");
    }

    this.domain = domain;
    this.tld = domain.split(".").at(-1);
    this.latestUpdateHeight = 0;
    this.resource = null;
    this.currentHeight = 0;
    this.aRes = null;
    this.ipAddress = null;
    this.tlsaRecord = null;

    // Results
    this.results = {
      domain: this.domain,
      ipAddress: null,
      dsExists: null,
      treeUpdated: null,
      nsDnssecEnabled: null,
      dnssecChainValid: null,
      tlsaExists: null,
      webserverContent: null,
      correctTlsa: null,
      delv: null,
      dnsvizProbe: null,
      dnsvizGraph: null,
    };
  }

  async validate() {
    this.results = {};
    await this.fetchPrereqs();
    console.log("Fetched prereqs");

    // Blockchain-related
    this.results.dsExists = await this.ensureDsExists();
    console.log(`[*] ${this.domain}: completed dsExists`);
    this.results.treeUpdated = await this.ensureTreeUpdated();
    console.log(`[*] ${this.domain}: completed treeUpdated`);

    // Configuration-related
    this.results.nsDnssecEnabled = await this.ensureNsHasDnssecEnabled();
    console.log(`[*] ${this.domain}: completed nsDnssecEnabled`);
    this.results.dnssecChainValid = await this.ensureDnssecChainValid();
    console.log(`[*] ${this.domain}: completed dnssecChainValid`);
    this.results.tlsaExists = await this.ensureTlsaExists();
    console.log(`[*] ${this.domain}: completed tlsaExists`);
    this.results.webserverContent = await this.ensureWebserverContent();
    console.log(`[*] ${this.domain}: completed webserverContent`);
    this.results.correctTlsa = await this.ensureCorrectTlsa();
    console.log(`[*] ${this.domain}: completed correctTlsa`);

    // Tools outputs and graphs
    this.results.delv = await utils.getDnssecChainValidation(this.domain);
    console.log(`[*] ${this.domain}: completed delv`);
    this.results.dnsvizProbe = await utils.getDnsvizProbeData(this.domain);
    console.log(`[*] ${this.domain}: completed dnsvizProbe`);
    this.results.dnsvizGraph = await utils.getDnsvizGraph(
      this.results.dnsvizProbe
    );
    console.log(`[*] ${this.domain}: completed dnsvizGraph`);

    return this.results;
  }

  async fetchPrereqs() {
    try {
      this.currentHeight = await utils.getCurrentHeight();
    } catch (error) {
      console.error(error);
      throw new Error("Could not fetch current height");
    }

    console.log(`[*] ${this.domain}: getting latest update...`);
    try {
      const latestUpdate = await utils.getLatestUpdate(this.tld);
      this.latestUpdateHeight = latestUpdate.latestUpdateHeight || latestUpdate.height;
      this.resource = latestUpdate.resource;
    } catch (error) {
      console.error(error);
      throw new Error(
        "Could not fetch latest record update. Are you sure this is a Handshake domain?"
      );
    }

    console.log(`[*] ${this.domain}: looking up A record...`);
    try {
      this.aRes = await recursiveResolver.lookup(this.domain, "A");
      this.ipAddress = this.aRes.answer.find(
        (r) => r.type === bnsConstants.stringToType("A")
      )?.data?.address;
      this.results.ipAddress = this.ipAddress ?? null;
    } catch (error) {
      throw new Error("Could not query for A record.");
    }

    console.log(`[*] ${this.domain}: Looking up TLSA record...`);
    try {
      this.tlsaRes = await recursiveResolver.lookup(
        "_443._tcp." + this.domain,
        "TLSA"
      );
      this.tlsaRecord = this.tlsaRes.answer.find(
        (r) => r.type === bnsConstants.stringToType("TLSA")
      )?.data;
    } catch (error) {
      console.error(error);
      throw new Error("Could not query for TLSA record.");
    }
  }

  async ensureDsExists() {
    const desc =
      "DS records are placed on chain to verify the authenticity of child zones.";

    if (!this.resource) {
      throw new Error("Resource not fetched");
    }

    if (this.resource.hasDS()) {
      return {
        ok: true,
        title: "DS record exists on chain",
        desc: desc,
        current: this.resource.toDS().toString(),
      };
    } else {
      return {
        ok: false,
        title: "No DS record found on chain",
        desc: desc,
        current: "No record found.",
        solution: "Add the DS record from your nameserver on the blockchain.",
        refUrl:
          "https://blog.htools.work/posts/hns-pdns-nginx-part-1/#point-domain-to-dns-server",
      };
    }
  }

  async ensureTreeUpdated() {
    const desc =
      "The data structure that stores DNS records is updated once every 36 blocks (~4 times a day).";

    if (!this.currentHeight) {
      throw new Error("Current height not fetched");
    }
    if (!this.latestUpdateHeight) {
      throw new Error("Resource not fetched");
    }

    const lastTreeUpdateBlockBeforeRecordUpdate =
      this.latestUpdateHeight - (this.latestUpdateHeight % 36 || 36);
    const blocksSinceThatTreeUpdate =
      this.currentHeight - lastTreeUpdateBlockBeforeRecordUpdate;
    if (blocksSinceThatTreeUpdate > 36 + 12) {
      return {
        ok: true,
        title: "Urkel tree is synced and updated",
        desc: desc,
        current: `Latest records on chain are being served to resolvers for the past ${blocksSinceThatTreeUpdate} blocks.`,
      };
    }

    if (blocksSinceThatTreeUpdate > 36) {
      const blocksTillNextUpdateSPV = 12 - (blocksSinceThatTreeUpdate - 36);
      return {
        ok: false,
        title: "Urkel tree recently updated",
        desc: desc,
        current: `Latest records on chain are committed to the tree, but some light clients may still be using old records for another ${blocksTillNextUpdateSPV} blocks.`,
        solution: `Wait for another ~${blocksTillNextUpdateSPV * 10
          } minutes and try again.`,
        refUrl: "https://hsd-dev.org/protocol/summary.html",
      };
    }

    return {
      ok: false,
      title: "Urkel tree not yet updated",
      desc: desc,
      current: `The last tree update was ${blocksSinceThatTreeUpdate} blocks ago.`,
      solution: `Wait for another ~${(36 - blocksSinceThatTreeUpdate) * 10
        } minutes and try again.`,
      refUrl: "https://hsd-dev.org/protocol/summary.html",
    };
  }

  async ensureNsHasDnssecEnabled() {
    const desc = "Nameservers sign all answers when DNSSEC is enabled.";

    if (!this.aRes) {
      throw new Error("DNS not queried for A record");
    }

    if (
      bnsUtil.hasType(this.aRes.answer, bnsConstants.stringToType("RRSIG")) ||
      bnsUtil.hasType(this.aRes.authority, bnsConstants.stringToType("RRSIG"))
    ) {
      return {
        ok: true,
        title: "Nameserver has DNSSEC enabled",
        desc: desc,
        current: "All records are signed.",
      };
    } else {
      return {
        ok: false,
        title: "Nameserver does not have DNSSEC enabled",
        desc: desc,
        current: "Records are not signed.",
        solution:
          "Enable DNSSEC on your nameserver. Then set DS records on the blockchain.",
        refUrl: "https://doc.powerdns.com/authoritative/dnssec/index.html",
      };
    }
  }

  async ensureDnssecChainValid() {
    const desc =
      "DNSSEC has a chain of trust from the root zone to the signature of each record.";

    if (!this.aRes) {
      throw new Error("DNS not queried for A record");
    }

    if (!this.aRes.isAnswer()) {
      return {
        ok: false,
        title: "No A record set",
        desc: desc,
        current: `No IP address was returned when querying ${this.domain}. Could not test for DNSSEC.`,
        solution: "Create an A record with an IP address.",
        refUrl:
          "https://www.cloudflare.com/en-in/learning/dns/dns-records/dns-a-record",
      };
    }

    if (this.aRes.ad) {
      return {
        ok: true,
        title: "DNSSEC trust chain is valid",
        desc: desc,
        current: "The chain of trust is fully validated.",
      };
    } else {
      return {
        ok: false,
        title: "DNSSEC trust chain is broken",
        desc: desc,
        current: "The chain of trust is broken. See graph for more details",
        solution:
          "Find the broken link and make sure the correct DS records are set.",
        refUrl: "https://blog.htools.work/posts/hns-pdns-nginx-part-1/",
      };
    }
  }

  async ensureTlsaExists() {
    const desc =
      "A TLSA record consists of a hash of a certificate that's used by the web server and is used for browsing with DANE/HTTPS.";

    if (!this.tlsaRes) {
      throw new Error("DNS not queried for TLSA record");
    }

    if (!this.tlsaRes.isAnswer()) {
      return {
        ok: false,
        title: "No TLSA record set",
        desc: desc,
        current: `No TLSA record found for domain ${this.domain}`,
        solution: `Add a TLSA record at _443._tcp.${this.domain}.`,
        refUrl: "https://blog.htools.work/posts/hns-pdns-nginx-part-3/",
      };
    }

    return {
      ok: true,
      title: "TLSA record is set",
      desc: desc,
      current: this.tlsaRecord.toString(),
    };
  }

  async ensureWebserverContent() {
    const desc = "A web server serves websites over HTTP(S).";

    if (!this.aRes) {
      throw new Error("DNS not queried for A record");
    }

    if (!this.ipAddress) {
      return {
        ok: false,
        title: "No A record set",
        desc: desc,
        current: `No IP address was returned when querying ${this.domain}.`,
        solution: "Create an A record with an IP address.",
        refUrl:
          "https://www.cloudflare.com/en-in/learning/dns/dns-records/dns-a-record",
      };
    }

    let webRes = null;

    try {
      webRes = await utils.makeRequest(
        `https://${this.ipAddress}`,
        {
          host: this.domain,
          rejectUnauthorized: false,
          timeout: 3000,
        },
        false
      );
    } catch (error) {
      console.error(error);
      // Probably a timeout
    }

    if (webRes) {
      return {
        ok: true,
        title: "Web server is serving content over HTTPS",
        desc: desc,
        current:
          "The web server is using a certificate and serves content over HTTPS.",
      };
    } else {
      return {
        ok: false,
        title: "Web server is not serving content over HTTPS",
        desc: desc,
        current: "The web server is not serving a website over HTTPS.",
        solution:
          "Make sure port 443 is open, and the web server is running with a self-signed certificate configured properly.",
        refUrl: "https://blog.htools.work/posts/hns-pdns-nginx-part-2/",
      };
    }
  }

  async ensureCorrectTlsa() {
    const desc =
      "The hash in the TLSA record should match the certificate used by the web server.";

    if (!this.aRes) {
      throw new Error("DNS not queried for A record");
    }
    if (!this.tlsaRes) {
      throw new Error("DNS not queried for TLSA record");
    }

    if (!this.ipAddress) {
      return {
        ok: false,
        title: "No A record set",
        desc: desc,
        current: `No IP address was returned when querying ${this.domain}.`,
        solution: "Create an A record with an IP address.",
        refUrl:
          "https://www.cloudflare.com/en-in/learning/dns/dns-records/dns-a-record",
      };
    }

    const socket = await new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: this.ipAddress,
          servername: this.domain,
          port: 443,
          rejectUnauthorized: false,
        },
        () => {
          resolve(socket);
        }
      );
      socket.on('error', () => resolve(null));
    });

    if (!socket) {
      return {
        ok: false,
        title: "Web server is not serving content over HTTPS",
        desc: desc,
        current: "The web server is not serving a website over HTTPS.",
        solution:
          "Make sure port 443 is open, and the web server is running with a self-signed certificate configured properly.",
        refUrl: "https://blog.htools.work/posts/hns-pdns-nginx-part-2/",
      };
    }

    const certificate = socket.getPeerCertificate(false);
    socket.destroy();

    const dnsTlsa = this.tlsaRecord;

    const serverTlsaHash = dane.sign(
      certificate.raw,
      bnsConstants.selectors.SPKI,
      bnsConstants.matchingTypes.SHA256
    );

    if (!serverTlsaHash) {
      throw new Error("Could not calculate server TLSA hash");
    }

    const serverTlsa = `3 1 1 ${serverTlsaHash.toString('hex').toUpperCase()}`;

    if (!dnsTlsa) {
      return {
        ok: false,
        title: "No TLSA record set",
        desc: desc,
        current: `No TLSA record found for domain ${this.domain}`,
        solution: `Add this TLSA record at _443._tcp.${this.domain}:\n${serverTlsa}`,
        refUrl: "https://blog.htools.work/posts/hns-pdns-nginx-part-3/",
      };
    }

    const tlsaMatched = dane.verify(
      certificate.raw,
      dnsTlsa.selector,
      dnsTlsa.matchingType,
      dnsTlsa.certificate
    );

    if (tlsaMatched) {
      return {
        ok: true,
        title: "TLSA record matches certificate",
        desc: desc,
        current: dnsTlsa.toString(),
      };
    } else {
      return {
        ok: false,
        title: "TLSA record does not match certificate",
        desc: desc,
        current: `DNS has record: ${dnsTlsa.toString()}\n but does not match the certificate used by the web server.`,
        solution: "Correct the TLSA record to match the certificate:\n" + serverTlsa,
        refUrl: "https://ssl-tools.net/tlsa-generator",
      };
    }
  }
}

/**
 * For testing only
 */
async function main() {
  const domain = "htools";

  console.log("Creating Validator for", domain);
  const validator = new Validator(domain);
  const result = await validator.validate();
  console.log(JSON.stringify(result));

  require("fs").writeFileSync(`${domain}.txt`, JSON.stringify(result));
  console.log("Wrote to file.");
}
// main();

module.exports = { Validator };
