import dns from "node:dns";

const originalLookup = dns.lookup;

(dns as any).lookup = function lookup(hostname: string, options: any, callback: any) {
  if (hostname === "localhost") {
    hostname = "127.0.0.1";
  }
  return (originalLookup as any).call(this, hostname, options, callback);
};

if (dns.promises?.lookup) {
  const originalPromisesLookup = dns.promises.lookup.bind(dns.promises);
  (dns.promises as any).lookup = async (hostname: string, options: any) => {
    if (hostname === "localhost") {
      hostname = "127.0.0.1";
    }
    return originalPromisesLookup(hostname, options);
  };
}
