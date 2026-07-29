# Security and Privacy

## Privacy posture

Running_Task is designed for one local user. The application does not include:

- User accounts or remote authentication.
- Analytics or telemetry.
- Advertising.
- Cloud synchronization.
- Collaboration endpoints.
- Email, Jira, OneNote, Procore, or Microsoft 365 integration.
- Background upload jobs.

Production frontend assets are packaged locally. Task data is intentionally handled through local Tauri commands and local files.

## Data confidentiality

The release candidate does not encrypt the database with an application-specific password. Confidentiality depends on:

- Windows sign-in security.
- BitLocker or other company-approved full-disk encryption.
- Laptop physical security.
- File/folder access controls.
- Approved backup locations.

Anyone with sufficient access to the Windows user profile and data folder may be able to read the SQLite database or JSON exports.

## Network boundary

Normal installed application use does not require internet access. Building from source does require internet access to download Node/Rust dependencies and compiler components unless an organization provides an offline mirror.

The browser preview serves only on loopback (`127.0.0.1`) and packages a restrictive response content-security policy. It should not be exposed to other network interfaces.

## Native command surface

The Tauri command handler exposes only:

- Get/save workspace data.
- Create/list/restore/delete backups.
- Export JSON, CSV, and Markdown.
- Get/open local data location.
- Get/set startup launch.

JSON import uses the normal validated save command. The frontend reads only a file selected through the operating-system file picker, applies a 50 MB safety limit, validates the workspace structure, and asks for confirmation before replacement. The backend then performs its own relationship validation and transactional save.

Backup identifiers are reduced to a filename and constrained to `.sqlite` files inside the backup directory before restore or deletion.

## Database integrity

- Foreign keys are enabled.
- Writes occur in a transaction.
- Entity relationships are validated before the transaction.
- Checklist cycles are rejected.
- Backup restoration uses SQLite quick-check validation.
- A safety backup is created before active data replacement.

## Threats not solved by the release candidate

- Malware running as the same Windows user.
- Compromised administrator account.
- Screen capture or shoulder surfing.
- Unauthorized access to separately copied backups/exports.
- Social-engineering or policy risk from running an unsigned installer on a managed device.
- Malicious modification of unsigned source or setup binaries.
- Supply-chain risk in downloaded development dependencies.

For organizational deployment, build from a reviewed commit in an approved pipeline, lock dependency versions, produce checksums, scan the result, and sign the executable with the organization's code-signing certificate.
