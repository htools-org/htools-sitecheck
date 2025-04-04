const https = require('https');
const { spawn } = require('child_process');
const { Resource } = require('hsd/lib/dns/resource');
const NodeClient = require('hsd/lib/client/node');

// const DNS_SERVER = ['103.196.38.38', 53];
const DNS_SERVER = ['127.0.0.50', 53];
const DNSVIZ_PATH = 'dnsviz';

const nodeClient = new NodeClient({
  network: 'main',
  port: 12037,
  apiKey: process.env.HSD_API_KEY || 'apikey',
});

async function makeRequest(url, options, parseJson) {
  if (!options) {
    options = {};
  }

  const res = await new Promise((resolve, reject) => {
    let result = '';
    const req = https.request(url, options, (res) => {
      res.on('data', (data) => {
        if (result.length > 5e5) {
          // max response size: 500 KB
          req.destroy();
          return reject('response size over limit');
        }
        result += data;
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', (error) => {
      req.destroy();
      reject('timeout');
    });

    req.on('close', () => {
      resolve(result);
    });

    req.end();
  });

  if (parseJson) {
    return JSON.parse(res);
  }

  return res;
}

async function getLatestUpdate(tld) {
  if (nodeClient) {
    const name = await nodeClient.execute('getnameinfo', [tld]);
    const latestData = name.info.data;
    const owner = name.info.owner;

    let latestUpdateHeight = null;

    let tx = await nodeClient.getTX(owner.hash);
    let idx = owner.index;

    while (true) {
      console.log(tx.hash, tx.height, idx);

      if (!tx) {
        break;
      }

      const output = tx.outputs[idx];
      const covenant = output.covenant.action;

      if (covenant === 'UPDATE' || covenant === 'REGISTER') {
        latestUpdateHeight = tx.height;
        break;
      }

      // we reached the start of the local auction, never registered
      if (covenant === 'REVEAL' || covenant === 'OPEN' || covenant === 'CLAIM') {
        latestUpdateHeight = tx.height;
        break;
      }

      /** @type {import('hsd/lib/primitives/input')} */
      const input = tx.inputs[idx];
      tx = await nodeClient.getTX(input.prevout.hash);
      idx = input.prevout.index;
    }

    return { latestData, latestUpdateHeight };
  }

  const data = await makeRequest(
    `https://api.hnsnetwork.com/name/records?name=${tld}&limit=50&offset=0`,
    {},
    true
  );
  const latestData = data.records.at(0);
  const resource = Resource.decode(Buffer.from(latestData.data, 'hex'));
  return {
    ...latestData,
    resource,
  };
}

async function getCurrentHeight() {
  if (nodeClient) {
    const info = await nodeClient.getInfo()
    return info.chain.height;
  }

  const data = await makeRequest(
    'https://api.hnsnetwork.com/blocks?limit=1&offset=0',
    {},
    true
  );
  return data.blocks[0].height;
}

async function spawnProcess(command, args, collectOnly, stdin) {
  if (!collectOnly) {
    collectOnly = ['stdout', 'stderr'];
  }

  return new Promise((resolve, reject) => {
    let result = '';
    const proc = spawn(command, args, {
      cwd: __dirname,
    });

    if (stdin) {
      proc.stdin.write(stdin, () => {
        proc.stdin.end();
      });
    }

    if (collectOnly.includes('stdout')) {
      proc.stdout.on('data', (data) => {
        result += data.toString();
      });
    }

    if (collectOnly.includes('stderr')) {
      proc.stderr.on('data', (data) => {
        result += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code == 0) return resolve(result);
      else return reject(code);
    });
  });
}

async function getDnssecChainValidation(domain) {
  const delvOutput = await spawnProcess('delv', [
    `@${DNS_SERVER[0]}`,
    '-p',
    DNS_SERVER[1],
    '-a',
    'hsd-ksk',
    domain,
    'A',
    '+rtrace',
    '+vtrace',
  ]);
  return delvOutput;
}

async function getDnsvizProbeData(domain) {
  const probeOutput = await spawnProcess(
    DNSVIZ_PATH,
    ['probe', '-s', DNS_SERVER[0], domain],
    ['stdout']
  );
  return probeOutput;
}

async function getDnsvizGraph(probeData) {
  const graphOutput = await spawnProcess(
    DNSVIZ_PATH,
    ['graph', '-Thtml', '-t', 'tk.txt'],
    ['stdout'],
    probeData
  );
  // return graphOutput.replace(/[^"']*share\/dnsviz/gim, '/static/dnsviz');
  return graphOutput.replace(
    /[^"']*share\/dnsviz/gim,
    'https://unruffled-hawking-ce37a9.netlify.app' // static files for dnsviz html graph
  );
}

module.exports = {
  makeRequest,
  getLatestUpdate,
  getCurrentHeight,
  getDnssecChainValidation,
  getDnsvizProbeData,
  getDnsvizGraph,
};
