# MARIA History Privacy Review

Date: 2026-07-18
Branch: `chore/maria-public-release-rc2`

## Findings

| Commit(s) | Path category | Classification | Normal-history reachability | Recommendation |
| --- | --- | --- | --- | --- |
| `dbe82a5`, `9fcfc8e` | MVP documentation and configuration examples | Privacy-sensitive but low risk: local-network and machine-specific examples | Reachable | Owner review only; current tree is sanitized |
| `195b007`, `a2276b4`, `b57a6db`, `88a54c8`, `7681878`, `9fcfc8e` | README and Core2 evidence documentation | Privacy-sensitive but low risk: historical USB serial identifiers | Reachable | Owner review only; current tree uses generic ports |
| `0c38ebb`, `1d428cc`, `d937657` | Firmware provisioning and documentation | Harmless development examples: local receiver or provisioning addresses | Reachable | No rewrite required |
| Multiple dependency commits | Lockfiles and package metadata | Harmless development examples: registry URLs and dependency metadata | Reachable | No rewrite required |

## Credential Review

Git history pattern searches found no credential-shaped access tokens, private
keys, certificates, or tracked environment files. No credential rotation is
indicated by this review.

## Decision

**NO HISTORY REWRITE REQUIRED.** The reachable historical findings are generic
development, private-network, or serial-device examples, not credentials or
strongly identifying personal data. The owner may choose a rewrite for stricter
privacy hygiene, but publication is not blocked by this review.

## Publication Impact

The current public tree contains portable placeholders, blank receiver
coordinates, and ignore rules for local configuration and runtime data. Do not
rewrite history, force push, or run history-rewriting tools without explicit
owner approval.
