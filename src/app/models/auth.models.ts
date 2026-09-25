// Represents the logged-in user data returned from the backend.
export interface LoginUser {
  _id: string;
  userId: string;
  fullname: string;
  email: string;
  role: string;
}

// Represents the login credentials sent to the backend.
export interface LoginCredentials {
  email: string;
  password: string;
}

// Represents the backend's reply to a successful login.
export interface LoginResponse {
  token: string; // Signed JWT, sent back as "Authorization: Bearer <token>"
  user: LoginUser;
}

// Represents the user registration data sent to the backend.
export interface RegisterUser {
  fullname: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}