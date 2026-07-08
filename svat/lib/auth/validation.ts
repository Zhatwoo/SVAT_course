const MIN_PASSWORD_LENGTH = 6;

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  accessCode: string;
}

export function parseSignupForm(form: FormData): SignupFormData {
  return {
    name: (form.get("name") as string).trim(),
    email: (form.get("email") as string).trim().toLowerCase(),
    password: form.get("password") as string,
    confirmPassword: form.get("confirm-password") as string,
    accessCode: (form.get("access-code") as string).trim().toUpperCase(),
  };
}

export function validateSignupForm(
  data: SignupFormData,
  options?: { requireAccessCode?: boolean },
): string | null {
  const requireAccessCode = options?.requireAccessCode ?? true;
  if (!data.name) {
    return "Please enter your full name.";
  }

  if (data.name.length < 2) {
    return "Name must be at least 2 characters.";
  }

  if (!data.email) {
    return "Please enter your email address.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) {
    return "Please enter a valid email address.";
  }

  if (!data.password) {
    return "Please enter a password.";
  }

  if (data.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (data.password !== data.confirmPassword) {
    return "Passwords do not match.";
  }

  if (requireAccessCode) {
    const accessCodeError = validateAccessCode(data.accessCode);
    if (accessCodeError) return accessCodeError;
  }

  return null;
}

export interface LoginFormData {
  email: string;
  password: string;
  accessCode: string;
}

export function validateAccessCode(accessCode: string): string | null {
  const normalized = accessCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) {
    return "Please enter your access code.";
  }
  if (!/^OT-[A-Z0-9]{8}$/.test(normalized)) {
    return "Access code format should look like OT-XXXXXXXX.";
  }
  return null;
}

export function validateLoginForm(
  data: LoginFormData,
  options?: { requireAccessCode?: boolean },
): string | null {
  const requireAccessCode = options?.requireAccessCode ?? true;

  if (!data.email.trim()) {
    return "Please enter your email address.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email.trim())) {
    return "Please enter a valid email address.";
  }

  if (!data.password) {
    return "Please enter your password.";
  }

  if (requireAccessCode) {
    return validateAccessCode(data.accessCode);
  }

  return null;
}
