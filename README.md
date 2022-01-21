# HTools SiteCheck

Test a handshake domain for issues with DNS, DNSSEC and DANE.

Try it out at [https://sitecheck.htools.work](https://sitecheck.htools.work).

## Screenshots

![Screenshot](https://via.placeholder.com/468x300?text=TODO:+Screenshot)

## Checks and Features

- Check if DS records are set on chain
- Check if records are committed to urkel tree
- Check if nameserver is set up properly
- Verify DNSSEC trust chain
- Check if TLSA record is correct
- Check if webserver is set up properly
- Verify DANE
- Display dnsviz dnssec graph and delv output

## Environment Variables

2 env files exist:

- `.env` - local dev
- `.env.production` - production

To change values, either edit these files, or add them to `.env.local` which are ignored by git.

Only one environment variable is required:

- `VITE_API_BASE` - base url for the API

## Run Locally

Clone the project

```sh
git clone https://github.com/htools-org/htools-sitecheck
cd htools-sitecheck
```

Install dependencies

```sh
npm i
```

Start the frontend (vite) and server (express) in 2 separate terminal windows

```sh
# frontend
npm run dev

# server
npm run dev-server
```

## Contributing

Contributions are always welcome! However, please create an issue before starting any work so there won't be any repeated/wasted effort.

For adding more checks, check out `lib/index.js` and add more methods to the `Validator` class.
