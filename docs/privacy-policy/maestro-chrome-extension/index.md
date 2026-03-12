# Arqon Maestro Chrome Extension Privacy Policy

## Overview
The Arqon Maestro Chrome Extension is a local browser control surface tied to the Arqon Maestro desktop experience. The extension does not independently collect, transmit, or store user-identifiable data on its own. All sensitive processing—voice capture, transcripts, authentication, and usage telemetry—occurs inside the desktop Maestro application and the Arqon Bus service it orchestrates.

## Data Handling
- **Page Inspection:** The extension reads the structure of the active tab (DOM nodes, link/button counts, overlay targets) purely to power overlays, diagnostics, and UI summaries. This data is used transiently and rendered only inside the local browser context; it is not logged or transmitted outside the user's machine except as the desktop Maestro app already does.
- **Command Metadata:** Only the minimal metadata needed to execute supported voice commands (command type, optional parameters, target tab identifier) is sent to the local Arqon Bus over the WebSocket hosted on `localhost`. No audio, transcripts, or user content is sent through this channel.
- **Local Configuration:** The extension stores non-sensitive configuration such as the user’s preferred tab, operator mode, and overlay policy per tab using Chrome `storage.local`. These values are per-profile and never synchronized off-device.

## Permissions Justification
The extension requests a limited set of permissions strictly required for its control surface role: background, tabs, scripting, alarms, idle, storage, and host permissions scoped to `localhost` and the current tab. Each permission is used solely to maintain the WebSocket connection, inspect/activate tabs, inject overlays, and refresh policies as necessary. It does not expand into general surveillance.

## Remote Code Statement
Maestro’s desktop app delivers the control scripts over the local, authenticated Arqon Bus connection. The extension evaluates that trusted remote code because it functions as the browser automation surface for Maestro. The Arqon Maestro app authorizes all actions.

## No Personal Data Collection
The extension does not collect personal data (names, emails, passwords, IP addresses, etc.), does not track users across sites, and does not sell or share data with third parties. All command execution is bounded to the routines and policies described above.

## Contact
For questions or requests regarding this policy, contact support@arqon.ai
