# Public Release Security Audit

Date: 2026-07-18
Branch: `chore/maria-public-release-rc1`
Starting commit: `76818780f0d505b4af3d1a85093cece91de3bd4c`

## Tools Used

Git-native tracked-file searches, Git history pattern searches, tracked sensitive
filename checks, and ignore-rule inspection. Neither `gitleaks` nor `trufflehog`
was available, so no external secret scanner was run.

## Current Tree Findings

No credential values, private keys, certificates, or tracked environment files
were found. Public-facing local LAN, fixed-coordinate, and serial-port examples
were sanitized to portable placeholders. Ignored local configuration and runtime
data remain untracked.

## History Findings

History pattern searches found prior commits containing configuration and
machine-specific/private-network examples. No credential-shaped token or private
key match was found by the Git-native scan. Publishing the existing history
still requires owner review because sanitizing the current tree does not remove
old examples from historical commits.

## Remediation and Status

Current-tree remediation: completed. Credentials requiring rotation: none found.
History cleanup: **owner decision required** if historical privacy examples are
not acceptable for publication; do not rewrite history without explicit
approval. Unresolved risk: the audit did not use a dedicated external scanner.

Final status: **PASS WITH WARNINGS**.
