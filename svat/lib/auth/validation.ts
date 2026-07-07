const MIN_PASSWORD_LENGTH = 6;

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function parseSignupForm(form: FormData): SignupFormData {
  return {
    name: (form.get("name") as string).trim(),
    email: (form.get("email") as string).trim().toLowerCase(),
    password: form.get("password") as string,
    confirmPassword: form.get("confirm-password") as string,
  };
}

export function validateSignupForm(data: SignupFormData): string | null {
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

  return null;
}
