export interface User {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  store: string;
  password: string;
  role: 'vendedor' | 'admin';
  photoUrl?: string;
  lastLogin?: string;
}

export interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  store: string;
  timestamp: string;
  action: 'login' | 'logout' | 'access';
}
