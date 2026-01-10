
import { AuthState } from '../types';

export const BiometricService = {
  /**
   * Checks if the device supports platform-based biometrics (FaceID/TouchID)
   * Also checks if we are in a context (like an iframe) that allows biometrics.
   */
  isAvailable: async (): Promise<boolean> => {
    // WebAuthn requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) return false;
    
    // WebAuthn is often blocked in cross-origin iframes by browser policy
    // "The origin of the document is not the same as its ancestors"
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.warn("SurgiLog: Biometrics disabled because app is running in an iframe.");
      return false;
    }

    if (!window.PublicKeyCredential) return false;
    
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  },

  /**
   * Registers a new biometric credential for the user
   */
  enroll: async (user: AuthState['user']): Promise<string | null> => {
    if (!user) return null;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = new TextEncoder().encode(user.uid);
    
    // The RP ID must be the domain. 'localhost' is valid, but full URLs are not.
    const hostname = window.location.hostname;
    const rpId = hostname === 'localhost' || hostname === '127.0.0.1' ? hostname : hostname;

    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "SurgiLog",
        id: rpId,
      },
      user: {
        id: userId,
        name: user.email,
        displayName: user.displayName || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    };

    try {
      const credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
      if (credential) {
        return btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        console.warn("Biometric enrollment: User cancelled or timed out.");
      } else if (err.name === 'SecurityError') {
        console.error("Biometric enrollment: Security error. Likely origin mismatch or iframe restriction.");
      } else {
        console.error("Biometric enrollment failed:", err);
      }
    }
    return null;
  },

  /**
   * Verifies the user's identity using a previously registered credential
   */
  verify: async (base64CredentialId: string): Promise<boolean> => {
    if (!base64CredentialId) return false;
    
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const credentialId = Uint8Array.from(atob(base64CredentialId), c => c.charCodeAt(0));

    const options: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: credentialId,
        type: "public-key",
        transports: ["internal"],
      }],
      userVerification: "required",
      timeout: 60000,
    };

    try {
      const assertion = await navigator.credentials.get({ publicKey: options });
      return !!assertion;
    } catch (err: any) {
      console.error("Biometric verification failed:", err);
      return false;
    }
  }
};
