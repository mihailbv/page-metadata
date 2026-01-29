import dns from "node:dns";

const originalLookup = dns.lookup;

dns.lookup = function lookup(hostname, options, callback) {
  if (hostname === "localhost") {
    hostname = "127.0.0.1";
  }
  return originalLookup.call(this, hostname, options, callback);
};

if (dns.promises?.lookup) {
  const originalPromisesLookup = dns.promises.lookup.bind(dns.promises);
  dns.promises.lookup = async (hostname, options) => {
    if (hostname === "localhost") {
      hostname = "127.0.0.1";
    }
    return originalPromisesLookup(hostname, options);
  };
}
