# 🎤 Voice Enrollment

Enrollment is the process of teaching Arqon Maestro to recognize your unique voice. This creates a secure, biometric link between your speech and your operational authority within the browser.

---

## 🏗️ Why Enroll?

Without an enrolled identity, Maestro operates in a "Cautious" state. Enrollment unlocks several critical capabilities:

- **Verified Pilot Mode**: Execute mutating commands (like clicks and form submissions) on trusted domains without multiple confirmation prompts.
- **Access to Sensitive Sites**: Use voice control on internal tools or production dashboards that require high-confidence speaker verification.
- **Personalized Context**: Maestro can maintain a distinct interaction history and set of preferences for each enrolled user in a shared environment.

---

## 🔄 The Enrollment Flow

Enrollment is a one-time security act that should be performed in a quiet environment.

1. **Consent**: You must explicitly grant permission for Maestro to store a local mathematical representation (vector) of your voice.
2. **Sampling**: You will be asked to speak several short, phonetically rich phrases to capture the unique nuances of your voice.
3. **Profile Creation**: Maestro generates a secure `IdentityId` and a localized voice profile.
4. **Calibration**: The system performs a test verification to ensure the recognition threshold matches your environment.

---

## 🛡️ Security & Privacy

- **On-Device Only**: Your voice samples and biometric profiles never leave your local machine. They are stored in an encrypted vault managed by the Arqon Identity Gateway.
- **Revocable**: You can delete your voice profile at any time through the **Ecosystem Settings**, which immediately strips all verified authority from that identity.
- **Policy-Gated**: Even a verified voice is subject to the [Global Interaction Policy](policy.md).

---

## 💡 Best Practices

- **Natural Speech**: Speak at your normal volume and pace during enrollment.
- **Microphone Consistency**: Try to enroll using the same headset or microphone you intend to use for daily operations.
- **Room Acoustics**: Avoid enrolling in areas with high background noise or significant echo.
