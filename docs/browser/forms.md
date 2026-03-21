# 📝 Form Interaction

Arqon Maestro provides a powerful and safe way to interact with complex web forms using voice. Whether you're filling out a search query or a multi-field registration, Maestro ensures you stay in control.

---

## 🏗️ The Form Interaction Loop

Maestro uses a "Focus and Type" model for most form interactions.

1. **Expose Inputs**: Say `show inputs` (or just `inputs`) to number all text boxes, checkboxes, and radio buttons on the page.
2. **Select Target**: Say the number of the target (e.g., `one`) to focus it.
3. **Interact**:
    - **Text Boxes**: Use [Dictation](../guides/dictation-and-raw-text.md) or standard typing commands to enter text.
    - **Checkboxes/Radios**: Say `click` or `use` to toggle the state.
4. **Finalize**: Use the `enter` or `submit` command to send the form.

---

## 🧩 Specialized Components

### 1. Dropdowns & Selects
Maestro analyzes standard HTML `<select>` elements and their custom equivalents (like those in MUI or React-Select).

- **Standard Select**: Focus the element, then say the visible text of the option you want (e.g., `select California`).
- **Custom Select**: Use `show links` to see the individual options as numbered targets if they are rendered as a custom list.

### 2. Multi-line Text Areas
For larger text fields (`<textarea>`), Maestro automatically enables **Fluid Dictation**, allowing you to speak long-form content directly into the field.

---

## 🛡️ Safety & Policies

Form interaction is subject to the [Interaction Policy](policy.md).

- **Sensitive Fields**: Maestro identifies password fields and credit card inputs. High-risk actions on these fields require [Voice Enrollment](voice-enrollment.md) and explicit confirmation.
- **Auto-Fill Detection**: If Maestro detects that a site is requesting large amounts of PII, it may automatically switch to **ASSIST** mode to prevent accidental submission.
- **Dry-Run Submission**: On specific high-risk domains, Maestro may offer a "Dry Run" of the form submission to show you exactly what will be sent before the final action.

---

## 💡 Productivity Tips

- **Tab Navigation**: Use `next field` or `previous field` to move quickly through a form once you've focused the first input.
- **Clearing Inputs**: Say `clear field` to remove all text from the currently focused input.
- **Copy-Paste**: You can use commands like `paste here` to fill a field with content from your clipboard.
