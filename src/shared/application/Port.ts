/**
 * Marker interface for outbound ports (driven adapters).
 *
 * A port is a pure-TS contract owned by application/domain that the
 * infrastructure layer implements (e.g. UserRepository, TokenVerifier,
 * UserExists). Marker does not add behavior; it exists so ports can be
 * discovered/filtered by tooling and by convention.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Port {}