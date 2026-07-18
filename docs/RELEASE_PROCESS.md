# Release Process

1. Run the security and privacy audit.
2. Start from a clean working tree.
3. Install dependencies and run lint, tests, builds, and format checks.
4. Compile the firmware matrix and run native tests.
5. Validate a clean clone and demo mode.
6. Review documentation, support matrix, release notes, and changelog.
7. Create and review a release pull request.
8. After merge, create the version tag and GitHub Release.
9. Monitor CI, issues, and security reports after publication.

Alpha releases require reproducible builds, public documentation, and honest
validation status. Beta releases additionally require live receiver evidence
for advertised paths. Stable releases require sustained compatibility and
hardware evidence for every supported board.
