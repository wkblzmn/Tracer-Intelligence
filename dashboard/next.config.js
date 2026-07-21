/** @type {import('next').NextConfig} */
// DATABASE_URL is deliberately NOT in the `env` block: that block inlines
// values into build output, so any client-side reference would ship the DB
// credentials to the browser. Server routes read it from runtime env instead.
const nextConfig = {}

module.exports = nextConfig