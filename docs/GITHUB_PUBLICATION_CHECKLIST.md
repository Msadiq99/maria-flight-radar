# GitHub Publication Checklist

## Before Making the Repository Public

- Confirm the security audit is PASS or explicitly accept warnings.
- Rotate exposed credentials and approve history cleanup if required.
- Confirm CI, README, license, issue templates, security policy, and release
  notes.
- Confirm no private artifacts, local files, coordinates, or captures remain.

## Recommended Settings

Set `main` as default, enable Issues, and consider Discussions later. Protect
`main` with pull requests, approvals when collaborators exist, required status
checks, resolved conversations, no force pushes, and no deletion. Enable
available Dependabot alerts/security updates, secret scanning, push protection,
private vulnerability reporting, and code scanning.

## Visibility Procedure

Repository -> Settings -> General -> Danger Zone -> Change repository
visibility -> Public.

## After Publication

Verify README, license detection, workflows, templates, and security policy.
Create the `v0.1.0-alpha` release only after the owner approves it, then verify
a public clone and publish announcements.
