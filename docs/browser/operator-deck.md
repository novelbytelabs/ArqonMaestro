# 🕹️ The Operator Deck (Popup)

The **Operator Deck** is the "Cockpit" of the Arqon Maestro browser extension. It is designed for quick interactions, health checks, and high-level status monitoring.

![Operator Deck Popup](../assets/browser/operator-deck-popup.png)

## 🎯 Purpose

Use the Operator Deck to:
- Instantly verify your connection to Arqon Bus.
- Check which mode is currently active (e.g., Pilot vs. Assist).
- Manage your local interaction policy for the current tab.
- Quickly access deeper diagnostics or documentation.

---

## 🏗️ Section Breakdown

### 1. Connection Ledger
This section provides real-time status of your link to the Arqon Maestro stack.
- **Status Dot**: Green indicates a healthy connection.
- **Transport**: Confirms you are "Connected via Arqon Bus".
- **Heartbeat**: Shows how recently the last signal was received.

### 2. Active Mode
Displays the **Effective Mode** for the current page.
- **Pilot**: Normal interaction is allowed.
- **Assist**: Mutating actions are blocked (common on sensitive pages).
- **Locked**: No interaction allowed.

### 3. Quick Controls
- **Open Docs**: Jump directly to the documentation (like this page!).
- **Reconnect**: Manually trigger a connection refresh if the transport is interrupted.
- **Open Panel**: Slide out the **Operator Surface** for detailed diagnostics.

### 4. Overlay Policy
A per-tab toggle to **Always show link overlays**. When enabled, Maestro will automatically highlight interactive elements whenever you navigate to a new page on this tab, without needing the "show links" command.

---

## 💡 Pro Tips

- **Pin for Power**: Pin the extension to your Chrome toolbar so you can toggle the Operator Deck with a single click.
- **Mode Intelligence**: If the mode says "Assist" but you requested "Pilot", check the [Safety & Policy](getting-started.md#safety--policy) section—you might be on a sensitive domain.
